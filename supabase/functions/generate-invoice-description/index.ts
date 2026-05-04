import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RequestBody {
  projectId: string;
  estimateId?: string | null;
}

interface EstimateLineItem {
  description: string | null;
  category: string | null;
  quantity: number | null;
  unit: string | null;
  total: number | null;
  labor_hours?: number | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ description: "", reason: "missing_auth" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { projectId, estimateId } = (await req.json()) as RequestBody;

    if (!projectId) {
      return new Response(
        JSON.stringify({ description: "", reason: "missing_project_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve the approved current-version estimate. If a specific estimateId
    // was provided, prefer that; otherwise pick the project's approved current.
    let estimate: { id: string } | null = null;
    if (estimateId) {
      const { data } = await supabase
        .from("estimates")
        .select("id, status, is_current_version")
        .eq("id", estimateId)
        .single();
      if (data && data.status === "approved" && data.is_current_version) {
        estimate = { id: data.id };
      }
    } else {
      const { data } = await supabase
        .from("estimates")
        .select("id")
        .eq("project_id", projectId)
        .eq("status", "approved")
        .eq("is_current_version", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data?.id) estimate = { id: data.id };
    }

    if (!estimate) {
      // Per requirements: no approved estimate → leave description blank.
      return new Response(
        JSON.stringify({ description: "", reason: "no_approved_estimate" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: lineItems, error: liError } = await supabase
      .from("estimate_line_items")
      .select("description, category, quantity, unit, total, labor_hours")
      .eq("estimate_id", estimate.id)
      .order("sort_order", { ascending: true });

    if (liError) {
      throw new Error(`Failed to load estimate line items: ${liError.message}`);
    }

    if (!lineItems || lineItems.length === 0) {
      return new Response(
        JSON.stringify({ description: "", reason: "no_line_items" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: project } = await supabase
      .from("projects")
      .select("project_name, project_number, address")
      .eq("id", projectId)
      .single();

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const items = lineItems as EstimateLineItem[];
    const itemSummary = items
      .map((it, i) => {
        const qty = it.quantity != null ? `${it.quantity}${it.unit ? " " + it.unit : ""}` : "";
        const cat = it.category ?? "";
        return `${i + 1}. ${it.description ?? "(unnamed)"} ${cat ? `[${cat}]` : ""}${qty ? ` (${qty})` : ""}`;
      })
      .join("\n");

    const systemPrompt = `You are writing invoice descriptions for a construction company (Radcliff Construction Group). Given an approved estimate's line items, produce a SINGLE prose paragraph summarizing the work performed. Constraints:
- 150 words MAXIMUM (hard limit; aim for 80-130).
- Active voice, past tense ("Completed", "Installed", "Furnished and installed", "Performed").
- No bullet points. No headings. No markdown. No line-item enumeration.
- Group related work naturally (demo, framing, finishes, etc.) — do not list every line item separately.
- Do NOT mention dollar amounts, quantities, or hours.
- Do NOT invent scope that isn't supported by the line items.
- Open with the work; do not start with "We" or the company name.`;

    const userPrompt = `Project: ${project?.project_name ?? ""}${project?.project_number ? ` (${project.project_number})` : ""}
${project?.address ? `Location: ${project.address}` : ""}

Approved estimate line items:
${itemSummary}

Write the invoice description paragraph now.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 350,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const description = (data.choices?.[0]?.message?.content ?? "").trim();

    return new Response(
      JSON.stringify({ description, reason: "ok", estimateId: estimate.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[generate-invoice-description] Error:", error);
    return new Response(
      JSON.stringify({
        description: "",
        reason: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
