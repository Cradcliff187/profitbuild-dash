/**
 * AI Report Assistant Edge Function
 *
 * UPDATED VERSION with:
 * - KPI-aware system prompt (from kpi-definitions)
 * - Semantic understanding of business terms
 * - Few-shot examples
 * - Business rules enforcement
 * - Retry logic for empty results
 * - Adaptive response mode (simple vs analytical)
 *
 * @version 3.0.0
 *
 * VERSION PINNING (.cursorrules): Keep these exact versions so deployment sticks.
 * - supabase-js: https://esm.sh/@supabase/supabase-js@2.57.4 (do not use @2 or @latest)
 * - deno std: https://deno.land/std@0.168.0/http/server.ts
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { KPI_CONTEXT } from "./kpi-context.generated.ts";

// ============================================================================
// STRUCTURED LOGGING
// ============================================================================

interface QueryLog {
  timestamp: string;
  userQuery: string;
  sqlQuery?: string;
  queryIntent?: string;  // "aggregation" | "lookup" | "comparison" | "time_based"
  kpisUsed?: string[];   // Which KPIs the query references
  status: 'success' | 'error' | 'empty' | 'retry_success';
  rowCount?: number;
  executionTimeMs: number;
  error?: string;
  retryAttempted?: boolean;
}

function logQuery(log: QueryLog): void {
  console.log(JSON.stringify({
    type: 'ai_report_query',
    ...log
  }));
}

function extractQueryIntent(sqlQuery: string, explanation: string): string {
  // Analyze SQL query and explanation to determine intent
  const sql = sqlQuery.toLowerCase();
  const expl = explanation.toLowerCase();

  if (sql.includes('sum(') || sql.includes('count(') || sql.includes('avg(')) {
    return 'aggregation';
  }
  if (sql.includes('where') && (sql.includes('=') || sql.includes('like'))) {
    return 'lookup';
  }
  if (sql.includes('order by') && (expl.includes('compare') || expl.includes('rank'))) {
    return 'comparison';
  }
  if (sql.includes('date') || sql.includes('month') || sql.includes('year') || sql.includes('between')) {
    return 'time_based';
  }

  return 'lookup'; // default
}

function extractKPIsUsed(sqlQuery: string, explanation: string): string[] {
  const kpis: string[] = [];
  const sql = sqlQuery.toLowerCase();
  const expl = explanation.toLowerCase();

  // Common KPI field mappings from project financials
  const kpiMappings = {
    'actual_margin': ['actual_margin', 'profit', 'real_profit'],
    'current_margin': ['current_margin', 'margin', 'expected_margin'],
    'total_expenses': ['total_expenses', 'costs', 'expenses'],
    'total_invoiced': ['total_invoiced', 'revenue', 'invoiced'],
    'contracted_amount': ['contracted_amount', 'contract_value'],
    'cost_variance': ['cost_variance', 'budget_variance'],
    'estimated_labor_hours': ['estimated_labor_hours', 'labor_hours'],
    'estimated_labor_cushion': ['estimated_labor_cushion', 'labor_cushion']
  };

  // Check SQL for KPI fields
  Object.entries(kpiMappings).forEach(([kpi, fields]) => {
    if (fields.some(field => sql.includes(field))) {
      kpis.push(kpi);
    }
  });

  // Check explanation for KPI mentions
  Object.entries(kpiMappings).forEach(([kpi, fields]) => {
    if (fields.some(field => expl.includes(field.replace('_', ' ')))) {
      if (!kpis.includes(kpi)) kpis.push(kpi);
    }
  });

  return kpis;
}

// ============================================================================
// CORS HEADERS
// ============================================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ============================================================================
// SYSTEM PROMPT GENERATOR
// ============================================================================

function generateSystemPrompt(schemaInfo: any): string {
  const { tables, views, enums, relationships } = schemaInfo;

  // Format schema compactly
  const tablesSummary = tables?.map((t: any) => 
    `${t.table_name}: ${t.columns?.map((c: any) => `${c.column_name} (${c.udt_name})`).join(', ')}`
  ).join('\n') || '';

  const viewsSummary = views?.map((v: any) => 
    `${v.schema}.${v.view_name}: ${v.columns?.map((c: any) => `${c.column_name} (${c.udt_name})`).join(', ')}`
  ).join('\n') || '';

  const enumsSummary = enums?.map((e: any) => 
    `${e.enum_name}: ${e.values?.join(', ')}`
  ).join('\n') || '';

  // Format examples (from generated fewShotExamples: .question, .reasoning, .sql)
  const examplesText = KPI_CONTEXT.fewShotExamples.map((ex: { question: string; reasoning: string; sql: string }) =>
    `Q: "${ex.question}"\nReasoning: ${ex.reasoning}\nSQL: ${ex.sql}`
  ).join('\n\n');

  return `You are a financial analyst for RCG Work, a construction project management system.
Your job is to help users understand their business - from field workers checking hours to owners reviewing portfolio health.

## ADAPTIVE RESPONSE MODE

**Detect the question type and respond appropriately:**

### SIMPLE MODE
**Triggers:** "my hours", "my time", "show me", "list", single project lookup, single person lookup, "what is", "how many"
**Behavior:**
- Answer directly in 1-2 sentences
- One query only
- No unsolicited comparisons or analysis
- Plain, conversational language

**Example:**
Q: "How many hours did I work this week?"
A: "You worked 42.5 hours this week across 3 projects."

Q: "What's the margin on Smith Kitchen?"
A: "Smith Kitchen is at 18% margin with $12,400 profit so far. That's healthy."

### ANALYTICAL MODE
**Triggers:** "how are we doing", "analyze", "compare", "trends", "health check", "worried about", "portfolio", "performance", "any problems", "overview"
**Behavior:**
- Think like a CFO's analyst
- Use CTEs for multi-step analysis when valuable
- Compare to previous periods when relevant
- Reference benchmarks
- Proactively flag anomalies and concerns
- Still use plain language - no jargon

**Example:**
Q: "How are we doing this month?"
A: "Strong month - profit is $45,230, up 12% from last month. Average margin across 8 projects is 22%. One concern: the Oak Street project dropped to 8% margin, below our 15% target."

## LANGUAGE RULES (ALWAYS APPLY)

**Say this → Not this:**
- "over budget" → "positive cost variance"
- "under budget" → "negative cost variance"  
- "profit" or "margin" → "actual margin"
- "left to bill" → "revenue variance"
- "expected profit" → "current margin"
- "$45,230" → "$45,230.47" (round to whole dollars unless asked)

**Response structure:**
1. Lead with the answer
2. Add context if it helps (mode-dependent)
3. Flag concerns if relevant (analytical mode)
4. Keep it conversational

## CRITICAL DATA RULES

${KPI_CONTEXT.criticalRules.map((r: string) => `- ${r}`).join('\n')}

## SEMANTIC MAPPINGS

When users say these terms, use these database fields:
${Object.entries(KPI_CONTEXT.semanticLookup)
  .slice(0, 50)
  .map(([term, field]) => `- "${term}" → ${field}`)
  .join('\n')}

## TERM DISAMBIGUATION

${Array.isArray(KPI_CONTEXT.disambiguationGuide) ? KPI_CONTEXT.disambiguationGuide.join('\n') : String(KPI_CONTEXT.disambiguationGuide)}

## MARGIN TERMINOLOGY (Know the difference)

| Field | Formula | Use When |
|-------|---------|----------|
| actual_margin | total_invoiced - total_expenses | User asks about REAL/ACTUAL/TRUE profit |
| current_margin | contracted_amount - total_expenses | User asks about EXPECTED profit |
| projected_margin | contracted_amount - adjusted_est_costs | User asks about FORECAST |
| margin_percentage | (contracted - expenses) / contracted × 100 | User asks for percentage |

## BUSINESS BENCHMARKS (RCG Targets)

${Object.entries(KPI_CONTEXT.benchmarks)
  .map(([id, b]) => {
    const crit = 'critical' in b && b.critical ? `, ${b.critical} (critical)` : '';
    return `- ${id}: ${b.healthy} (healthy)${b.warning ? `, ${b.warning} (warning)` : ''}${crit}`;
  })
  .join('\n')}

Use these to provide context like "that's healthy" or "below target" - but only in analytical mode or when the value is concerning.

## ENTITY LOOKUPS

- **Employees:** \`payees WHERE is_internal = true\`
- **Vendors:** \`payees WHERE payee_type = 'vendor' AND is_internal = false\`
- **Subcontractors:** \`payees WHERE payee_type = 'subcontractor' AND is_internal = false\`
- **Time entries:** \`expenses WHERE category = 'labor_internal'\`

## NAME MATCHING

ALWAYS use \`ILIKE '%name%'\` for name searches. Handle nicknames:
- Johnny, John, Jonathan → \`ILIKE '%john%'\`
- Mike, Michael → \`ILIKE '%mik%'\` or \`ILIKE '%michael%'\`
- Bob, Robert → \`ILIKE '%bob%'\` OR \`ILIKE '%robert%'\`

## TIME CALCULATIONS

Time entries track both gross and net hours:

**Gross Hours (Total Shift Duration):**
\`\`\`sql
EXTRACT(EPOCH FROM (end_time - start_time)) / 3600 as gross_hours
\`\`\`

**Net Hours (Billable Hours after Lunch):**
\`\`\`sql
CASE 
  WHEN lunch_taken = true THEN
    (EXTRACT(EPOCH FROM (end_time - start_time)) / 3600) - (lunch_duration_minutes / 60.0)
  ELSE
    (EXTRACT(EPOCH FROM (end_time - start_time)) / 3600)
END as net_hours
\`\`\`

**Database Fields:**
- \`expenses.hours\` = net/billable hours (use for payroll, billing)
- \`expenses.gross_hours\` = total shift duration (use for compliance, shift tracking)
- \`expenses.lunch_taken\` = boolean
- \`expenses.lunch_duration_minutes\` = integer (15-120)

**When to use which:**
- "How many hours did X work?" → Use net hours (billable)
- "What was X's shift length?" → Use gross hours (total duration)
- "Show me overtime" → Use gross hours (>8 hours gross may indicate OT eligibility)

## EXAMPLES

${examplesText}

${tablesSummary || viewsSummary || enumsSummary ? `## DATABASE SCHEMA

### Tables:
${tablesSummary}

### Views (use these for financial queries!):
${viewsSummary}

### Enums:
${enumsSummary}
` : ''}

## FINAL REMINDER

Read the question carefully. A field worker asking "my hours?" wants a quick number. An owner asking "how's the portfolio?" wants analysis. Match your response depth to their need.

Today's date: ${new Date().toISOString().split('T')[0]}`;
}

// ============================================================================
// QUERY ERROR RECOVERY
// ============================================================================

async function parseQueryError(error: any, originalQuery: string): Promise<{
  category: 'column_not_found' | 'table_not_found' | 'syntax_error' | 'timeout' | 'other';
  message: string;
  suggestion: string;
  canRetry: boolean;
}> {
  const errorMessage = error.message.toLowerCase();

  // Column not found
  if (errorMessage.includes('column') && errorMessage.includes('does not exist')) {
    return {
      category: 'column_not_found',
      message: 'The query references a column that doesn\'t exist',
      suggestion: 'Try using different field names or check the available columns',
      canRetry: true
    };
  }

  // Table/view not found
  if (errorMessage.includes('relation') && errorMessage.includes('does not exist')) {
    return {
      category: 'table_not_found',
      message: 'The query references a table or view that doesn\'t exist',
      suggestion: 'Try using reporting.project_financials for project data',
      canRetry: true
    };
  }

  // Syntax errors
  if (errorMessage.includes('syntax error') || errorMessage.includes('invalid input syntax')) {
    return {
      category: 'syntax_error',
      message: 'There\'s a syntax error in the SQL query',
      suggestion: 'The query structure needs to be corrected',
      canRetry: true
    };
  }

  // Timeout
  if (errorMessage.includes('timeout') || errorMessage.includes('cancelled')) {
    return {
      category: 'timeout',
      message: 'The query took too long to execute',
      suggestion: 'Try simplifying the query or using fewer joins',
      canRetry: true
    };
  }

  // Other errors
  return {
    category: 'other',
    message: error.message,
    suggestion: 'Please rephrase your question',
    canRetry: false
  };
}

async function retryWithSimplerQuery(
  error: any,
  originalQuery: string,
  userQuery: string,
  supabase: any,
  apiKey: string
): Promise<{ success: boolean; data?: any; error?: any; cannotRetry?: boolean }> {
  const retryPrompt = `The query failed with error: ${error.message}

Original SQL: ${originalQuery}
User's question: "${userQuery}"

Generate a SIMPLER query that:
1. Uses only the main table (reporting.project_financials) - fewer JOINs
2. Removes complex aggregations if present
3. Uses ILIKE '%term%' instead of exact matches
4. Might answer a related but simpler question

If the query fundamentally cannot work, respond with:
{ "cannotRetry": true, "reason": "explanation for user" }

Otherwise respond with:
{ "simplifiedQuery": "SELECT ...", "explanation": "what this simpler query does" }
`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a SQL expert. Generate simpler, working queries when the original fails." },
          { role: "user", content: retryPrompt }
        ],
      }),
    });

    if (!response.ok) {
      return { success: false, error: 'AI retry failed' };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return { success: false, error: 'No retry response' };
    }

    // Parse JSON response
    try {
      const parsed = JSON.parse(content);
      if (parsed.cannotRetry) {
        return { success: false, cannotRetry: true, error: parsed.reason };
      }

      if (parsed.simplifiedQuery) {
        // Execute the simplified query
        const { data: retryResult, error: retryError } = await supabase.rpc('execute_ai_query', {
          p_query: parsed.simplifiedQuery
        });

        if (retryError) {
          return { success: false, error: retryError.message };
        }

        return {
          success: true,
          data: retryResult,
          error: undefined
        };
      }
    } catch (parseError) {
      // If JSON parsing fails, try to extract SQL directly
      const sqlMatch = content.match(/```sql\n?([\s\S]*?)```/);
      if (sqlMatch) {
        const simplifiedQuery = sqlMatch[1].trim();

        const { data: retryResult, error: retryError } = await supabase.rpc('execute_ai_query', {
          p_query: simplifiedQuery
        });

        if (retryError) {
          return { success: false, error: retryError.message };
        }

        return {
          success: true,
          data: retryResult,
          error: undefined
        };
      }
    }

    return { success: false, error: 'Could not generate retry query' };
  } catch (retryError) {
    const message = retryError instanceof Error ? retryError.message : String(retryError);
    return { success: false, error: `Retry failed: ${message}` };
  }
}

// ============================================================================
// EMPTY RESULT ANALYSIS
// ============================================================================

async function analyzeEmptyResults(
  userQuery: string,
  sqlQuery: string,
  apiKey: string
): Promise<{
  likelyReason: string;
  suggestions: string[];
  alternativeQuestion?: string;
}> {
  const emptyAnalysisPrompt = `Query returned 0 rows.

User asked: "${userQuery}"
SQL executed: ${sqlQuery}

Analyze why no results were found. Consider:
- Name spelling variations (John vs Jonathan vs Johnny)
- Date range might be too narrow
- Filters might be too restrictive
- Data might not exist for this query

Respond with JSON:
{
  "likelyReason": "brief explanation",
  "suggestions": [
    "Try searching for 'Jonathan' instead",
    "Expand date range to last 30 days",
    "Remove the status filter"
  ],
  "alternativeQuestion": "A simpler question that would return data"
}
`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an expert at analyzing why database queries return no results. Provide helpful suggestions for users." },
          { role: "user", content: emptyAnalysisPrompt }
        ],
      }),
    });

    if (!response.ok) {
      return {
        likelyReason: "Unable to analyze the query",
        suggestions: ["Try rephrasing your question", "Check for spelling errors in names"],
        alternativeQuestion: "Show me all projects"
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return {
        likelyReason: "No analysis available",
        suggestions: ["Try a different search term"],
        alternativeQuestion: "Show me recent projects"
      };
    }

    try {
      const parsed = JSON.parse(content);
      return {
        likelyReason: parsed.likelyReason || "Unknown reason",
        suggestions: parsed.suggestions || ["Try rephrasing your question"],
        alternativeQuestion: parsed.alternativeQuestion
      };
    } catch (parseError) {
      // If JSON parsing fails, extract suggestions from text
      const suggestions: string[] = [];
      const lines = content.split('\n');
      for (const line of lines) {
        if (line.includes('Try') || line.includes('Check') || line.includes('Expand') || line.includes('Remove')) {
          suggestions.push(line.trim());
        }
      }

      return {
        likelyReason: "Query returned no results",
        suggestions: suggestions.length > 0 ? suggestions : ["Try rephrasing your question"],
        alternativeQuestion: "Show me all projects"
      };
    }
  } catch (error) {
    console.error("Empty result analysis failed:", error);
    return {
      likelyReason: "Analysis failed",
      suggestions: ["Try rephrasing your question"],
      alternativeQuestion: "Show me recent projects"
    };
  }
}

// ============================================================================
// DETECT USER INTENT
// ============================================================================

function detectQueryIntent(query: string): 'simple' | 'analytical' {
  const analyticalTriggers = [
    'how are we', 'analyze', 'analysis', 'compare', 'comparison',
    'trend', 'health', 'portfolio', 'overview', 'performance',
    'worried', 'concern', 'problem', 'issue', 'risk',
    'this month vs', 'last month', 'this week vs', 'quarter'
  ];
  
  const simpleTriggers = [
    'my hours', 'my time', 'show me', 'list', 'what is the',
    'how many', 'how much did', 'when did'
  ];
  
  const lowerQuery = query.toLowerCase();
  
  // Check for explicit analytical triggers
  if (analyticalTriggers.some(t => lowerQuery.includes(t))) {
    return 'analytical';
  }
  
  // Check for simple triggers
  if (simpleTriggers.some(t => lowerQuery.includes(t))) {
    return 'simple';
  }
  
  // Default based on query length/complexity
  return query.split(' ').length > 8 ? 'analytical' : 'simple';
}

function wantsDetailedData(query: string): boolean {
  const detailKeywords = [
    'show', 'list', 'all', 'table', 'report', 'export', 'details',
    'breakdown', 'each', 'every', 'individual', 'by project', 'by employee'
  ];
  const lowerQuery = query.toLowerCase();
  return detailKeywords.some(kw => lowerQuery.includes(kw));
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  // Handle CORS preflight - MUST be first, before any other processing
  // Wrap in try-catch to prevent any errors from crashing the OPTIONS handler
  if (req.method === "OPTIONS") {
    try {
      return new Response('ok', { 
        status: 200,
        headers: corsHeaders 
      });
    } catch (error) {
      console.error('[OPTIONS] Error in preflight handler:', error);
      return new Response('ok', { 
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
        }
      });
    }
  }

  // Declare variables outside try block so they're accessible in catch
  let query: string | undefined;
  let queryStartTime: number = Date.now();

  try {
    queryStartTime = Date.now();
    const requestBody = await req.json();
    query = requestBody.query;
    const conversationHistory = requestBody.conversationHistory || [];
    
    console.log('[AI Debug] Request received:', {
      query,
      historyLength: conversationHistory.length,
      historyRoles: conversationHistory.map((m: any) => m.role),
      firstHistoryContent: conversationHistory[0]?.content?.substring(0, 100)
    });
    
    if (!query) {
      return new Response(JSON.stringify({ error: "Query is required" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logQuery({
      timestamp: new Date().toISOString(),
      userQuery: query,
      status: 'success',
      rowCount: 0,
      executionTimeMs: 0
    });

    // Initialize Supabase
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    // Guard: Ensure LOVABLE_API_KEY is defined
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({
        error: "LOVABLE_API_KEY not configured",
        answer: "The AI assistant is not properly configured. Please contact support."
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch database schema
    const schemaStartTime = Date.now();
    const { data: schema, error: schemaError } = await supabase.rpc('get_database_schema');
    
    if (schemaError) {
      console.error("Schema fetch error:", schemaError);
      throw new Error(`Failed to fetch database schema: ${schemaError.message}`);
    }

    // Generate system prompt with KPI context
    const systemPrompt = generateSystemPrompt(schema);
    console.log('[AI Debug] KPI context version:', KPI_CONTEXT.version);
    const queryIntent = detectQueryIntent(query);
    const showDetailsByDefault = queryIntent === 'analytical' || wantsDetailedData(query);

    // Build messages with conversation history
    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.slice(-10).map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      { role: "user", content: query }
    ];

    // Define SQL generation tool
    const tools = [{
      type: "function",
      function: {
        name: "execute_sql_query",
        description: "Generate a PostgreSQL SELECT query to answer the user's question",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "The SQL SELECT query" },
            explanation: { type: "string", description: "Brief explanation of the query" }
          },
          required: ["query", "explanation"]
        }
      }
    }];

    console.log('[AI Debug] Sending to AI Gateway:', {
      messageCount: messages.length,
      roles: messages.map((m: any) => m.role)
    });
    console.log("Calling AI to generate SQL...");

    // Call AI Gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        tools,
        tool_choice: "auto",
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Rate limit exceeded. Please try again in a moment.",
          answer: "I'm experiencing high demand right now. Please try again in a moment."
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();

    // Extract SQL from response
    let sqlQuery: string | null = null;
    let explanation = "";
    
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.name === "execute_sql_query") {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        sqlQuery = args.query;
        explanation = args.explanation || "";
      } catch (e) {
        console.error("Failed to parse tool call:", e);
      }
    }
    
    // Fallback: extract from content
    if (!sqlQuery) {
      const content = aiData.choices?.[0]?.message?.content;
      if (content) {
        const sqlMatch = content.match(/```sql\n?([\s\S]*?)```/);
        if (sqlMatch) {
          sqlQuery = sqlMatch[1].trim();
        }
      }
    }

    if (!sqlQuery) {
      logQuery({
        timestamp: new Date().toISOString(),
        userQuery: query,
        status: 'error',
        rowCount: 0,
        executionTimeMs: Date.now() - queryStartTime,
        error: 'No SQL generated'
      });

      return new Response(JSON.stringify({
        success: true,
        answer: "I couldn't understand that question. Try asking something like 'How many hours did John work last week?' or 'Show me projects over budget'.",
        showDetailsByDefault: false,
        data: [],
        fields: [],
        rowCount: 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract query intent and KPIs for logging
    const queryCategory = extractQueryIntent(sqlQuery, explanation);
    const kpisUsed = extractKPIsUsed(sqlQuery, explanation);

    logQuery({
      timestamp: new Date().toISOString(),
      userQuery: query,
      sqlQuery: sqlQuery,
      queryIntent: queryCategory,
      kpisUsed: kpisUsed,
      status: 'success',
      rowCount: 0,
      executionTimeMs: Date.now() - queryStartTime
    });

    // Execute query
    const { data: queryResult, error: queryError } = await supabase.rpc('execute_ai_query', {
      p_query: sqlQuery
    });

    if (queryError) {
      // Parse the error to determine if retry is possible
      const errorInfo = await parseQueryError(queryError, sqlQuery);

      // Attempt retry if the error is recoverable
      let retryResult: { success: boolean; data?: any; error?: any; cannotRetry?: boolean } | null = null;
      let retrySuccessful = false;

      if (errorInfo.canRetry) {
        console.log(`Attempting retry for ${errorInfo.category} error`);
        retryResult = await retryWithSimplerQuery(
          queryError,
          sqlQuery,
          query,
          supabase,
          LOVABLE_API_KEY
        );

        if (retryResult?.success) {
          retrySuccessful = true;

          // Update log with retry success
          logQuery({
            timestamp: new Date().toISOString(),
            userQuery: query,
            sqlQuery: sqlQuery,
            queryIntent: queryCategory,
            kpisUsed: kpisUsed,
            status: 'retry_success',
            rowCount: retryResult.data?.row_count || 0,
            executionTimeMs: Date.now() - queryStartTime,
            retryAttempted: true
          });

          // Use retry results for the rest of the processing
          const retryData = retryResult.data?.data || [];
          const retryRowCount = retryResult.data?.row_count || 0;
          const retryTruncated = retryResult.data?.truncated || false;

          // Generate answer with retry results
          const retryAnswerPrompt = `User asked: "${query}"

Original query failed with: ${queryError.message}
Retried with simpler query that returned ${retryRowCount} rows

${retryData.length > 0
  ? `Data (first 20):\n${JSON.stringify(retryData.slice(0, 20), null, 2)}`
  : 'Still no results. The simplified query also returned no data.'
}

Give a helpful response explaining that the original query had issues but we found an alternative approach.`;

          let retryAnswer = "";
          try {
            const answerResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-3-flash-preview",
                messages: [
                  { role: "system", content: "You are a helpful assistant that gives brief, natural answers about construction project data. Explain when queries were simplified due to errors." },
                  { role: "user", content: retryAnswerPrompt }
                ],
              }),
            });

            if (answerResponse.ok) {
              const answerData = await answerResponse.json();
              retryAnswer = answerData.choices?.[0]?.message?.content || "";
            }
          } catch (e) {
            console.error("Retry answer generation failed:", e);
          }

          // Generate fields for retry results
          const retryFields = retryData.length > 0
            ? Object.keys(retryData[0]).map(key => {
                const sample = retryData[0][key];
                let type = 'text';
                if (typeof sample === 'number') {
                  type = key.includes('percent') || key.includes('margin') ? 'percent' :
                         key.includes('amount') || key.includes('cost') || key.includes('total') ? 'currency' : 'number';
                } else if (typeof sample === 'string' && /^\d{4}-\d{2}-\d{2}/.test(sample)) {
                  type = 'date';
                }
                return {
                  key,
                  label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                  type
                };
              })
            : [];

          return new Response(JSON.stringify({
            success: true,
            answer: retryAnswer || `I had trouble with your original query (${errorInfo.message}), but I tried a simpler approach and found ${retryRowCount} results.`,
            showDetailsByDefault: queryIntent === 'analytical' || wantsDetailedData(query),
            query: sqlQuery, // Keep original query for transparency
            simplifiedQuery: retryResult.data?.query || sqlQuery,
            explanation: `Original query failed, but simplified version worked`,
            data: retryData,
            fields: retryFields,
            rowCount: retryRowCount,
            truncated: retryTruncated,
            retryAttempted: true,
            kpiVersion: KPI_CONTEXT.version,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Log the final error (either retry failed or not attempted)
      logQuery({
        timestamp: new Date().toISOString(),
        userQuery: query,
        sqlQuery: sqlQuery,
        queryIntent: queryCategory,
        kpisUsed: kpisUsed,
        status: 'error',
        rowCount: 0,
        executionTimeMs: Date.now() - queryStartTime,
        error: queryError.message,
        retryAttempted: errorInfo.canRetry
      });

      // Return error response with user-friendly message
      const userFriendlyError = retryResult?.cannotRetry
        ? `I ran into a problem with that query. Technical details: ${retryResult.error}. This might be a system configuration issue - try a different question or report this if it keeps happening.`
        : errorInfo.canRetry
          ? `I ran into a problem with that query. ${errorInfo.message}. ${errorInfo.suggestion}. I tried simplifying the query but couldn't find a working alternative. Technical details: ${queryError.message}.`
          : `I ran into a problem with that query. Technical details: ${queryError.message}. ${errorInfo.suggestion}. This might be a system configuration issue - try a different question or report this if it keeps happening.`;

      return new Response(JSON.stringify({
        success: false,
        error: queryError.message,
        query: sqlQuery,
        answer: userFriendlyError,
        debugInfo: {
          sqlAttempted: sqlQuery,
          errorType: errorInfo.category,
          suggestion: errorInfo.suggestion
        }
      }), {
        status: 200,  // Return 200 so frontend displays the message
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reportData = queryResult?.data || [];
    const rowCount = queryResult?.row_count || 0;
    const truncated = queryResult?.truncated || false;

    // Update log with actual results
    logQuery({
      timestamp: new Date().toISOString(),
      userQuery: query,
      sqlQuery: sqlQuery,
      queryIntent: queryCategory,
      kpisUsed: kpisUsed,
      status: rowCount === 0 ? 'empty' : 'success',
      rowCount: rowCount,
      executionTimeMs: Date.now() - queryStartTime
    });

    // Interpret results
    let answerPrompt = 'User asked: "' + query + '"\n\n' +
      'SQL: ' + sqlQuery + '\n' +
      'Results: ' + rowCount + ' rows\n\n' +
      (reportData.length > 0
        ? 'Data (first 20):\n' + JSON.stringify(reportData.slice(0, 20), null, 2)
        : 'No results found.'
      ) + '\n\n' +
      'Give a helpful, conversational response. Use specific numbers from the data.';

    // If no results, analyze why and add suggestions
    if (rowCount === 0) {
      try {
        const analysis = await analyzeEmptyResults(query, sqlQuery, LOVABLE_API_KEY);
        answerPrompt += `

No results found. Analysis: ${analysis.likelyReason}

Suggestions:
${analysis.suggestions.map(s => `- ${s}`).join('\n')}

${analysis.alternativeQuestion ? `Alternative: Try asking "${analysis.alternativeQuestion}"` : ''}

Explain the likely reason and suggest these alternatives in a helpful way.`;
      } catch (analysisError) {
        console.error("Empty result analysis failed:", analysisError);
        answerPrompt += `

No results found. Consider:
- Is the name spelled differently? Try variations.
- Is the date range too narrow? Try expanding.
- Is the filter too restrictive? Try removing some filters.

Try rephrasing your question.`;
      }
    } else {
      answerPrompt += ` If no results, explain why and suggest alternatives.`;
    }

    let answer = "";
    try {
      const answerResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "You are a helpful assistant that gives brief, natural answers about construction project data. Use specific numbers. Be conversational." },
            { role: "user", content: answerPrompt }
          ],
        }),
      });

      if (answerResponse.ok) {
        const answerData = await answerResponse.json();
        answer = answerData.choices?.[0]?.message?.content || "";
      }
    } catch (e) {
      console.error("Answer generation failed:", e);
    }

    // Fallback answer
    if (!answer) {
      if (rowCount === 0) {
        answer = "I couldn't find any matching data. Try different search terms or date ranges.";
      } else if (rowCount === 1) {
        const values = Object.values(reportData[0]);
        answer = values.length === 1 ? `The answer is ${values[0]}.` : `Found 1 result.`;
      } else {
        answer = `Found ${rowCount} results.`;
      }
    }

    // Generate insights for detailed data
    let insights = null;
    if (showDetailsByDefault && reportData.length > 2) {
      try {
        const insightsResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: "Give 2-3 brief, actionable insights about this construction data. Use bullet points." },
              { role: "user", content: `Question: "${query}"\nData: ${JSON.stringify(reportData.slice(0, 10))}` }
            ],
          }),
        });

        if (insightsResponse.ok) {
          const insightsData = await insightsResponse.json();
          insights = insightsData.choices?.[0]?.message?.content || null;
        }
      } catch (e) {
        console.error("Insights generation failed:", e);
      }
    }

    // Infer field types
    const fields = reportData.length > 0 
      ? Object.keys(reportData[0]).map(key => {
          const sample = reportData[0][key];
          let type = 'text';
          if (typeof sample === 'number') {
            type = key.includes('percent') || key.includes('margin') ? 'percent' : 
                   key.includes('amount') || key.includes('cost') || key.includes('total') ? 'currency' : 'number';
          } else if (typeof sample === 'string' && /^\d{4}-\d{2}-\d{2}/.test(sample)) {
            type = 'date';
          }
          return { 
            key, 
            label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), 
            type 
          };
        })
      : [];

    return new Response(JSON.stringify({
      success: true,
      answer,
      showDetailsByDefault,
      query: sqlQuery,
      explanation,
      data: reportData,
      fields,
      rowCount,
      truncated,
      insights,
      kpiVersion: KPI_CONTEXT.version,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    logQuery({
      timestamp: new Date().toISOString(),
      userQuery: query || 'unknown',
      status: 'error',
      rowCount: 0,
      executionTimeMs: Date.now() - (queryStartTime || Date.now()),
      error: message
    });

    return new Response(JSON.stringify({
      error: message,
      answer: "Sorry, I encountered an error. Please try again."
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
