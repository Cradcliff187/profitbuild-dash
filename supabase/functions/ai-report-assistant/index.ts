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

    // Build system prompt with actual schema
    const systemPrompt = `You are a SQL expert for RCG Work, a construction project management application.
Your job is to generate PostgreSQL SELECT queries to answer user questions about their data.

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

Generate a query to answer the user's question. Always explain what the query does.`;

    // Tool for generating SQL queries
    const tools = [
      {
        type: "function",
        function: {
          name: "execute_sql_query",
          description: "Generate and execute a SQL SELECT query to answer the user's question",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The PostgreSQL SELECT query to execute"
              },
              explanation: {
                type: "string",
                description: "Brief explanation of what this query does and what data it returns"
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
        tool_choice: { type: "function", function: { name: "execute_sql_query" } },
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
    console.log("AI Response received");

    // Extract the tool call
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "execute_sql_query") {
      throw new Error("AI did not generate a valid SQL query");
    }

    const { query: sqlQuery, explanation } = JSON.parse(toolCall.function.arguments);
    console.log("Generated SQL:", sqlQuery);
    console.log("Explanation:", explanation);

    // Execute the query safely
    const { data: queryResult, error: queryError } = await supabase.rpc('execute_ai_query', {
      p_query: sqlQuery
    });

    if (queryError) {
      console.error("Query execution error:", queryError);
      
      // Return error with the query so user can see what went wrong
      return new Response(JSON.stringify({
        success: false,
        error: queryError.message,
        query: sqlQuery,
        explanation
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reportData = queryResult?.data || [];
    const rowCount = queryResult?.row_count || 0;
    const truncated = queryResult?.truncated || false;

    console.log(`Query returned ${rowCount} rows${truncated ? ' (truncated)' : ''}`);

    // Generate insights if we have data
    let insights = null;
    if (reportData.length > 0) {
      const insightsPrompt = `Analyze this query result and provide 3-5 brief, actionable insights.

User question: "${query}"
Query: ${sqlQuery}
Results: ${rowCount} rows${truncated ? ' (showing first 500)' : ''}

Sample data (first 10 rows):
${JSON.stringify(reportData.slice(0, 10), null, 2)}

Be concise and business-focused. Use specific numbers from the data. Format as bullet points.
Focus on:
1. Key findings that answer the question
2. Any concerning patterns or outliers
3. Actionable recommendations`;

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
        // Continue without insights
      }
    }

    // Infer field types from the data
    const fields = reportData.length > 0 
      ? Object.keys(reportData[0]).map(key => {
          const sampleValue = reportData[0][key];
          let type = 'text';
          if (typeof sampleValue === 'number') {
            type = key.includes('percent') || key.includes('margin') ? 'percent' : 
                   key.includes('amount') || key.includes('cost') || key.includes('price') || key.includes('total') ? 'currency' : 'number';
          } else if (typeof sampleValue === 'string' && /^\d{4}-\d{2}-\d{2}/.test(sampleValue)) {
            type = 'date';
          }
          return { key, label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), type };
        })
      : [];

    return new Response(JSON.stringify({
      success: true,
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
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
