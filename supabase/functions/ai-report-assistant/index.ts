import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Data sources available for reports
const DATA_SOURCES = [
  { value: 'projects', label: 'Projects', description: 'Project financial data, margins, budgets, and status' },
  { value: 'expenses', label: 'Expenses', description: 'Project expenses by category, payee, and date' },
  { value: 'quotes', label: 'Quotes', description: 'Vendor quotes with amounts and status' },
  { value: 'time_entries', label: 'Time Entries', description: 'Employee time tracking records' },
  { value: 'weekly_labor_hours', label: 'Weekly Labor Hours', description: 'Weekly labor summary by employee' },
  { value: 'estimate_line_items', label: 'Estimate Line Items', description: 'Detailed estimate line items' },
  { value: 'internal_costs', label: 'Internal Costs', description: 'Internal labor and management costs' },
];

// Available fields per data source with their types and filter operators
const AVAILABLE_FIELDS: Record<string, any[]> = {
  projects: [
    { key: 'project_number', label: 'Project #', type: 'text' },
    { key: 'project_name', label: 'Project Name', type: 'text' },
    { key: 'client_name', label: 'Client', type: 'text' },
    { key: 'status', label: 'Status', type: 'text', enumValues: ['bidding', 'in_progress', 'on_hold', 'completed', 'cancelled', 'warranty'] },
    { key: 'contracted_amount', label: 'Contract Amount', type: 'currency' },
    { key: 'current_margin', label: 'Current Margin', type: 'currency' },
    { key: 'margin_percentage', label: 'Margin %', type: 'percent' },
    { key: 'total_expenses', label: 'Total Expenses', type: 'currency' },
    { key: 'target_margin', label: 'Target Margin', type: 'currency' },
    { key: 'projected_margin', label: 'Projected Margin', type: 'currency' },
    { key: 'remaining_budget', label: 'Remaining Budget', type: 'currency' },
    { key: 'cost_variance', label: 'Cost Variance', type: 'currency' },
    { key: 'budget_utilization_percent', label: 'Budget Utilization %', type: 'percent' },
    { key: 'contingency_remaining', label: 'Contingency Remaining', type: 'currency' },
    { key: 'start_date', label: 'Start Date', type: 'date' },
    { key: 'end_date', label: 'End Date', type: 'date' },
    { key: 'change_order_revenue', label: 'Change Order Revenue', type: 'currency' },
    { key: 'change_order_count', label: 'Change Order Count', type: 'number' },
    { key: 'total_invoiced', label: 'Total Invoiced', type: 'currency' },
  ],
  expenses: [
    { key: 'expense_date', label: 'Date', type: 'date' },
    { key: 'amount', label: 'Amount', type: 'currency' },
    { key: 'category', label: 'Category', type: 'text', enumValues: ['labor_internal', 'materials', 'subcontractor', 'equipment', 'permits', 'overhead', 'management', 'other'] },
    { key: 'payee_name', label: 'Payee', type: 'text' },
    { key: 'project_number', label: 'Project #', type: 'text' },
    { key: 'project_name', label: 'Project Name', type: 'text' },
    { key: 'description', label: 'Description', type: 'text' },
    { key: 'approval_status', label: 'Status', type: 'text', enumValues: ['pending', 'approved', 'rejected'] },
  ],
  quotes: [
    { key: 'quote_number', label: 'Quote #', type: 'text' },
    { key: 'total_amount', label: 'Total Amount', type: 'currency' },
    { key: 'status', label: 'Status', type: 'text', enumValues: ['pending', 'accepted', 'rejected', 'expired'] },
    { key: 'date_received', label: 'Date Received', type: 'date' },
    { key: 'payee_name', label: 'Vendor', type: 'text' },
    { key: 'project_number', label: 'Project #', type: 'text' },
    { key: 'project_name', label: 'Project Name', type: 'text' },
  ],
  time_entries: [
    { key: 'expense_date', label: 'Date', type: 'date' },
    { key: 'worker_name', label: 'Employee', type: 'text' },
    { key: 'employee_number', label: 'Employee #', type: 'text' },
    { key: 'hours', label: 'Hours', type: 'number' },
    { key: 'amount', label: 'Total Amount', type: 'currency' },
    { key: 'hourly_rate', label: 'Hourly Rate', type: 'currency' },
    { key: 'project_number', label: 'Project #', type: 'text' },
    { key: 'project_name', label: 'Project Name', type: 'text' },
    { key: 'approval_status', label: 'Status', type: 'text', enumValues: ['pending', 'approved', 'rejected'] },
  ],
  weekly_labor_hours: [
    { key: 'employee_number', label: 'Employee #', type: 'text' },
    { key: 'employee_name', label: 'Employee Name', type: 'text' },
    { key: 'week_start_sunday', label: 'Week Starting', type: 'date' },
    { key: 'total_hours', label: 'Total Hours', type: 'number' },
    { key: 'total_cost', label: 'Total Cost', type: 'currency' },
    { key: 'entry_count', label: 'Entry Count', type: 'number' },
  ],
  estimate_line_items: [
    { key: 'estimate_number', label: 'Estimate #', type: 'text' },
    { key: 'project_number', label: 'Project #', type: 'text' },
    { key: 'project_name', label: 'Project Name', type: 'text' },
    { key: 'category', label: 'Category', type: 'text' },
    { key: 'description', label: 'Description', type: 'text' },
    { key: 'quantity', label: 'Quantity', type: 'number' },
    { key: 'total', label: 'Total', type: 'currency' },
    { key: 'total_cost', label: 'Total Cost', type: 'currency' },
  ],
  internal_costs: [
    { key: 'category', label: 'Category', type: 'text' },
    { key: 'expense_date', label: 'Date', type: 'date' },
    { key: 'hours', label: 'Hours', type: 'number' },
    { key: 'amount', label: 'Amount', type: 'currency' },
    { key: 'worker_name', label: 'Employee', type: 'text' },
    { key: 'project_number', label: 'Project #', type: 'text' },
    { key: 'project_name', label: 'Project Name', type: 'text' },
  ],
};

// Filter operators
const FILTER_OPERATORS = ['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'in', 'between', 'is_null'];

interface ReportConfig {
  data_source: string;
  filters: Record<string, { field: string; operator: string; value: any }>;
  sort_by?: string;
  sort_dir?: 'ASC' | 'DESC';
  limit?: number;
  explanation?: string;
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

    // Build system prompt with full schema context
    const systemPrompt = `You are an AI assistant for a construction project management application called RCG Work. 
Your job is to help users generate reports by understanding their natural language queries and translating them into report configurations.

## Available Data Sources:
${JSON.stringify(DATA_SOURCES, null, 2)}

## Available Fields per Data Source:
${JSON.stringify(AVAILABLE_FIELDS, null, 2)}

## Filter Operators:
- equals: Exact match
- not_equals: Not equal to
- greater_than: Greater than (for numbers, dates, currency)
- less_than: Less than (for numbers, dates, currency)
- contains: Text contains substring
- in: Value is in a list
- between: Value is between two values (use array [min, max])
- is_null: Field is null/empty

## Business Context:
- This is a construction/contractor estimating and project management application
- "Margin" refers to profit margin (contracted_amount - total_expenses)
- "Losing money" or "negative margin" means current_margin < 0 or margin_percentage < 0
- "Over budget" means total_expenses > contracted_amount or cost_variance > 0
- Projects have statuses: bidding, in_progress, on_hold, completed, cancelled, warranty
- Expenses are categorized: labor_internal, materials, subcontractor, equipment, permits, overhead, management, other
- "This month" means the current calendar month
- "This week" means the current calendar week
- "Overtime" typically means hours > 40 per week

When a user asks for a report, use the generate_report tool to create the appropriate configuration.
Always explain what report you're generating in the 'explanation' field.

For financial concerns (over budget, losing money), use:
- margin_percentage less_than 0 for negative margins
- current_margin less_than 0 for dollar losses
- cost_variance greater_than 0 for over budget

For date filters, use ISO format (YYYY-MM-DD). For "this month", use the first and last day of the current month.
Today's date is ${new Date().toISOString().split('T')[0]}.`;

    // Tool definition for generating reports
    const tools = [
      {
        type: "function",
        function: {
          name: "generate_report",
          description: "Generate a report configuration based on the user's natural language query",
          parameters: {
            type: "object",
            properties: {
              data_source: {
                type: "string",
                enum: DATA_SOURCES.map(ds => ds.value),
                description: "The data source to query"
              },
              filters: {
                type: "object",
                description: "Filters to apply. Each key is a unique filter name, value is {field, operator, value}",
                additionalProperties: {
                  type: "object",
                  properties: {
                    field: { type: "string" },
                    operator: { type: "string", enum: FILTER_OPERATORS },
                    value: {}
                  },
                  required: ["field", "operator", "value"]
                }
              },
              sort_by: {
                type: "string",
                description: "Field to sort by"
              },
              sort_dir: {
                type: "string",
                enum: ["ASC", "DESC"],
                description: "Sort direction"
              },
              limit: {
                type: "number",
                description: "Maximum number of rows to return (default 100)"
              },
              explanation: {
                type: "string",
                description: "Brief explanation of what this report shows and why you configured it this way"
              }
            },
            required: ["data_source", "explanation"]
          }
        }
      }
    ];

    // Build messages array
    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      { role: "user", content: query }
    ];

    console.log("Calling Lovable AI with query:", query);

    // Call Lovable AI Gateway
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
        tool_choice: { type: "function", function: { name: "generate_report" } },
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
    console.log("AI Response:", JSON.stringify(aiData, null, 2));

    // Extract the tool call
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "generate_report") {
      throw new Error("AI did not generate a valid report configuration");
    }

    const reportConfig: ReportConfig = JSON.parse(toolCall.function.arguments);
    console.log("Generated report config:", JSON.stringify(reportConfig, null, 2));

    // Execute the report using the RPC function
    const { data: reportResult, error: reportError } = await supabase.rpc('execute_simple_report', {
      p_data_source: reportConfig.data_source,
      p_filters: reportConfig.filters || {},
      p_sort_by: reportConfig.sort_by || 'created_at',
      p_sort_dir: reportConfig.sort_dir || 'DESC',
      p_limit: reportConfig.limit || 100
    });

    if (reportError) {
      console.error("Report execution error:", reportError);
      throw new Error(`Failed to execute report: ${reportError.message}`);
    }

    // Extract data from the result
    const reportData = (reportResult?.data || []).map((item: any) => item.row_to_json || item);
    const rowCount = reportResult?.metadata?.row_count || reportData.length;

    console.log(`Report returned ${rowCount} rows`);

    // Generate insights if we have data
    let insights = null;
    if (reportData.length > 0) {
      const insightsPrompt = `Analyze this report data and provide 3-5 brief, actionable insights. Focus on:
1. Summary of what you found
2. Any concerning patterns or outliers
3. Recommendations

Data source: ${reportConfig.data_source}
Query: "${query}"
Results: ${rowCount} rows

Sample data (first 10 rows):
${JSON.stringify(reportData.slice(0, 10), null, 2)}

Be concise and business-focused. Use specific numbers from the data. Format as bullet points.`;

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
    }

    // Get field metadata for the data source
    const fields = AVAILABLE_FIELDS[reportConfig.data_source] || [];

    return new Response(JSON.stringify({
      success: true,
      config: reportConfig,
      data: reportData,
      fields: fields,
      rowCount,
      insights,
      explanation: reportConfig.explanation
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("AI Report Assistant error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error occurred" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
