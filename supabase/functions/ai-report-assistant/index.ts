import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SchemaInfo {
  tables: Array<{
    table_name: string;
    columns: Array<{
      column_name: string;
      data_type: string;
      udt_name: string;
      is_nullable: string;
    }>;
  }>;
  views: Array<{
    view_name: string;
    schema: string;
    columns: Array<{
      column_name: string;
      data_type: string;
      udt_name: string;
    }>;
  }>;
  enums: Array<{
    enum_name: string;
    values: string[];
  }>;
  relationships: Array<{
    constraint_name: string;
    table_name: string;
    column_name: string;
    foreign_table: string;
    foreign_column: string;
  }>;
}

// Detect if user wants to see detailed data vs just an answer
function wantsDetailedData(query: string): boolean {
  const detailPatterns = [
    /\bshow\s+(me\s+)?/i,
    /\blist\s+(all\s+)?/i,
    /\bexport\b/i,
    /\breport\b/i,
    /\bbreakdown\b/i,
    /\bdetail(s|ed)?\b/i,
    /\btable\b/i,
    /\ball\s+\w+/i,
  ];
  return detailPatterns.some(pattern => pattern.test(query));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, conversationHistory = [] } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch live database schema
    console.log("Fetching database schema...");
    const { data: schema, error: schemaError } = await supabase.rpc('get_database_schema');
    
    if (schemaError) {
      console.error("Schema fetch error:", schemaError);
      throw new Error(`Failed to fetch database schema: ${schemaError.message}`);
    }

    const schemaInfo = schema as SchemaInfo;
    console.log(`Schema loaded: ${schemaInfo.tables?.length || 0} tables, ${schemaInfo.views?.length || 0} views, ${schemaInfo.enums?.length || 0} enums`);

    // Build compact schema representation for the prompt
    const tablesSummary = schemaInfo.tables?.map(t => 
      `${t.table_name}: ${t.columns?.map(c => `${c.column_name} (${c.udt_name})`).join(', ')}`
    ).join('\n') || '';

    const viewsSummary = schemaInfo.views?.map(v => 
      `${v.schema}.${v.view_name}: ${v.columns?.map(c => `${c.column_name} (${c.udt_name})`).join(', ')}`
    ).join('\n') || '';

    const enumsSummary = schemaInfo.enums?.map(e => 
      `${e.enum_name}: ${e.values?.join(', ')}`
    ).join('\n') || '';

    const relationshipsSummary = schemaInfo.relationships?.map(r => 
      `${r.table_name}.${r.column_name} → ${r.foreign_table}.${r.foreign_column}`
    ).join('\n') || '';

    // Detect user intent
    const showDetailsByDefault = wantsDetailedData(query);

    // Build system prompt with actual schema
    const systemPrompt = `You are a helpful AI assistant for RCG Work, a construction project management application.
Your job is to answer user questions about their business data.

## YOUR RESPONSE STYLE:
- Give DIRECT, CONVERSATIONAL answers first
- Use specific numbers from the data
- Keep answers brief (1-3 sentences for simple questions)
- Be friendly and helpful like a knowledgeable coworker

## EXAMPLES OF GOOD ANSWERS:
- "Johnnie worked 8.5 hours last Tuesday (January 21st)."
- "You have 3 projects over budget, totaling $45,200 in overruns. The biggest is Project ABC at -$23,000."
- "Total expenses this month are $47,320 across 156 transactions."
- "Yes, there are 4 unpaid invoices totaling $28,450. ABC Corp owes the most at $12,000."

## DATABASE SCHEMA (Auto-discovered)

### Tables:
${tablesSummary}

### Views (reporting schema):
${viewsSummary}

### Enums:
${enumsSummary}

### Foreign Key Relationships:
${relationshipsSummary}

## QUERY RULES:
1. Generate ONLY SELECT queries (no INSERT, UPDATE, DELETE, etc.)
2. Use appropriate JOINs based on foreign key relationships
3. Use aggregations (SUM, COUNT, AVG, GROUP BY) when asking for totals or summaries
4. Always alias columns clearly for readability
5. Limit results to 100 rows unless asking for aggregations
6. For views in the reporting schema, prefix with "reporting." (e.g., reporting.project_financials)
7. Cast enum columns to text when selecting: status::text

## BUSINESS CONTEXT:
- "Projects" track construction jobs with budgets, margins, and expenses
- "Expenses" are costs against projects (labor, materials, subcontractors, etc.)
- "Estimates" are project cost estimates with line items
- "Quotes" are vendor quotes attached to estimates
- "Change orders" modify project scope and budget
- "Payees" include employees (is_internal=true) and vendors/subcontractors
- "Project revenues" track invoices and payments from clients
- "Profiles" are system users

## COMMON ALIASES:
- "AR" or "receivables" = project_revenues table
- "employees" = payees WHERE is_internal = true
- "subcontractors" = payees WHERE payee_type = 'subcontractor'
- "over budget" = projects WHERE current_margin < 0
- "losing money" = projects WHERE margin_percentage < 0
- "this month" = date >= date_trunc('month', CURRENT_DATE)
- "this week" = date >= date_trunc('week', CURRENT_DATE)
- "approved" for change orders = status = 'approved'
- "accepted" for quotes = status = 'accepted'

Today's date is ${new Date().toISOString().split('T')[0]}.

Generate a query to get the data, then provide a natural language answer based on the results.`;

    // Tool for generating SQL queries with conversational answer
    const tools = [
      {
        type: "function",
        function: {
          name: "execute_sql_query",
          description: "Generate a SQL SELECT query to get data for answering the user's question",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The PostgreSQL SELECT query to execute"
              },
              explanation: {
                type: "string",
                description: "Brief technical explanation of the query (for debugging)"
              }
            },
            required: ["query", "explanation"]
          }
        }
      }
    ];

    // Build messages array
    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.map((msg: { role: string; content: string }) => ({
        role: msg.role,
        content: msg.content
      })),
      { role: "user", content: query }
    ];

    console.log("Calling AI to generate SQL for:", query);

    // Call AI to generate SQL
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
          error: "Rate limit exceeded. Please try again in a moment." 
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ 
          error: "AI credits exhausted. Please contact your administrator." 
        }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log("AI Response structure:", JSON.stringify(aiData, null, 2));

    // Extract the tool call with robust parsing
    let sqlQuery: string | null = null;
    let explanation: string = "";
    
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall && toolCall.function?.name === "execute_sql_query") {
      // Standard tool call format
      try {
        const args = JSON.parse(toolCall.function.arguments);
        sqlQuery = args.query;
        explanation = args.explanation || "";
      } catch (parseError) {
        console.error("Failed to parse tool call arguments:", parseError);
      }
    }
    
    // Fallback: Try to extract SQL from text content
    if (!sqlQuery) {
      const content = aiData.choices?.[0]?.message?.content;
      if (content) {
        console.log("Attempting to extract SQL from content:", content);
        // Try to parse as JSON
        try {
          const parsed = JSON.parse(content);
          if (parsed.query) {
            sqlQuery = parsed.query;
            explanation = parsed.explanation || "";
          }
        } catch {
          // Try to extract SQL from markdown code block
          const sqlMatch = content.match(/```sql\n?([\s\S]*?)```/);
          if (sqlMatch) {
            sqlQuery = sqlMatch[1].trim();
            explanation = content.replace(sqlMatch[0], '').trim();
          }
        }
      }
    }

    if (!sqlQuery) {
      console.error("Could not extract SQL query from AI response");
      return new Response(JSON.stringify({
        success: true,
        answer: "I'm sorry, I couldn't understand that question. Could you rephrase it? Try asking something like 'How many hours did John work last week?' or 'Show me projects over budget'.",
        showDetailsByDefault: false,
        data: [],
        fields: [],
        rowCount: 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Generated SQL:", sqlQuery);
    console.log("Explanation:", explanation);

    // Execute the query safely
    const { data: queryResult, error: queryError } = await supabase.rpc('execute_ai_query', {
      p_query: sqlQuery
    });

    if (queryError) {
      console.error("Query execution error:", queryError);
      
      return new Response(JSON.stringify({
        success: false,
        error: queryError.message,
        query: sqlQuery,
        explanation,
        answer: `I tried to look that up but ran into an issue: ${queryError.message}. Could you try rephrasing your question?`
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reportData = queryResult?.data || [];
    const rowCount = queryResult?.row_count || 0;
    const truncated = queryResult?.truncated || false;

    console.log(`Query returned ${rowCount} rows${truncated ? ' (truncated)' : ''}`);

    // Generate conversational answer based on the data
    let answer = "";
    
    if (reportData.length === 0) {
      answer = "I couldn't find any data matching your question. This could mean there are no records for that criteria, or the data hasn't been entered yet.";
    } else {
      // Generate a natural language answer from the data
      const answerPrompt = `Based on this data, give a BRIEF, CONVERSATIONAL answer to the user's question.

User question: "${query}"
Query result: ${rowCount} rows

Data:
${JSON.stringify(reportData.slice(0, 20), null, 2)}

RULES:
- Be direct and specific - use actual numbers from the data
- Keep it to 1-3 sentences for simple questions
- For lists, mention top 2-3 items then summarize the rest
- Don't say "based on the data" or "according to the query" - just answer naturally
- If appropriate, offer to show more details

Examples of good answers:
- "Johnnie worked 8.5 hours last Tuesday."
- "You have 3 projects over budget totaling $45,200 in overruns."
- "The top expense category is Materials at $32,400, followed by Labor at $28,100."`;

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
              { role: "system", content: "You are a helpful assistant that gives brief, natural answers. Be conversational and use specific numbers." },
              { role: "user", content: answerPrompt }
            ],
          }),
        });

        if (answerResponse.ok) {
          const answerData = await answerResponse.json();
          answer = answerData.choices?.[0]?.message?.content || "";
        }
      } catch (answerError) {
        console.error("Failed to generate answer:", answerError);
      }

      // Fallback answer if AI fails
      if (!answer) {
        if (rowCount === 1) {
          const firstRow = reportData[0];
          const values = Object.values(firstRow);
          if (values.length === 1) {
            answer = `The answer is ${values[0]}.`;
          } else {
            answer = `Found 1 result. ${explanation}`;
          }
        } else {
          answer = `Found ${rowCount} results. ${explanation}`;
        }
      }
    }

    // Generate insights only if showing detailed data
    let insights = null;
    if (showDetailsByDefault && reportData.length > 0) {
      const insightsPrompt = `Analyze this query result and provide 2-3 brief, actionable insights.

User question: "${query}"
Results: ${rowCount} rows

Sample data (first 10 rows):
${JSON.stringify(reportData.slice(0, 10), null, 2)}

Be concise. Use bullet points. Focus on actionable takeaways.`;

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
              { role: "system", content: "You are a construction business analyst. Provide brief, actionable insights." },
              { role: "user", content: insightsPrompt }
            ],
          }),
        });

        if (insightsResponse.ok) {
          const insightsData = await insightsResponse.json();
          insights = insightsData.choices?.[0]?.message?.content || null;
        }
      } catch (insightError) {
        console.error("Failed to generate insights:", insightError);
      }
    }

    // Infer field types from the data
    const fields = reportData.length > 0 
      ? Object.keys(reportData[0]).map(key => {
          const sampleValue = reportData[0][key];
          let type = 'text';
          if (typeof sampleValue === 'number') {
            type = key.includes('percent') || key.includes('margin') ? 'percent' : 
                   key.includes('amount') || key.includes('cost') || key.includes('price') || key.includes('total') || key.includes('hours') ? 'currency' : 'number';
          } else if (typeof sampleValue === 'string' && /^\d{4}-\d{2}-\d{2}/.test(sampleValue)) {
            type = 'date';
          }
          return { key, label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), type };
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
      insights
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("AI Report Assistant error:", errorMessage);
    return new Response(JSON.stringify({ 
      error: errorMessage,
      answer: "Sorry, I encountered an error processing your request. Please try again."
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
