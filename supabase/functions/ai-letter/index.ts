// Supabase Edge Function: AI letter generation with Gemini
// Deploy with: supabase functions deploy ai-letter --project-ref <ref>
import { serve } from "https://deno.land/std@0.224.0/http/server.ts"

type LetterPayload = {
  letterType?: string
  intakeData?: Record<string, unknown>
}

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
}

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers })
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers },
    )
  }

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY")
    if (!apiKey) {
      console.error("[edge][ai-letter] Missing GEMINI_API_KEY secret")
      return new Response(
        JSON.stringify({ error: "Server not configured" }),
        { status: 500, headers },
      )
    }

    const body = (await req.json()) as LetterPayload
    const { letterType, intakeData } = body

    if (!letterType || !intakeData) {
      return new Response(
        JSON.stringify({ error: "letterType and intakeData are required" }),
        { status: 400, headers },
      )
    }

    const prompt = buildPrompt(letterType, intakeData)
    const aiResponse = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      }),
    })

    if (!aiResponse.ok) {
      const errText = await aiResponse.text()
      console.error("[edge][ai-letter] Gemini error:", errText)
      return new Response(
        JSON.stringify({ error: "Failed to generate letter" }),
        { status: 500, headers },
      )
    }

    const aiData = await aiResponse.json()
    const content: string | undefined =
      aiData?.candidates?.[0]?.content?.parts?.[0]?.text

    if (!content) {
      console.error("[edge][ai-letter] Empty content", aiData)
      return new Response(
        JSON.stringify({ error: "Gemini returned empty content" }),
        { status: 500, headers },
      )
    }

    return new Response(
      JSON.stringify({ success: true, content }),
      { status: 200, headers: { ...headers, "Content-Type": "application/json" } },
    )
  } catch (error) {
    console.error("[edge][ai-letter] Unexpected error:", error)
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers },
    )
  }
})

function buildPrompt(letterType: string, intakeData: Record<string, unknown>) {
  const fields = (key: string) => `${key.replace(/_/g, " ")}: ${String(intakeData[key] ?? "")}`
  const amountField = intakeData["amountDemanded"]
    ? `Amount: $${intakeData["amountDemanded"]}`
    : ""

  return [
    `You are a professional attorney drafting a formal ${letterType}.`,
    "Use the details below and write a professional, 300-500 word letter:",
    fields("senderName"),
    fields("senderAddress"),
    fields("recipientName"),
    fields("recipientAddress"),
    fields("issueDescription"),
    fields("desiredOutcome"),
    amountField,
    "Ensure proper legal formatting, clear demands, deadlines, and a professional tone.",
    "Return only the letter content, no additional commentary.",
  ]
    .filter(Boolean)
    .join("\n")
}
