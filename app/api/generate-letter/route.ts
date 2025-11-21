import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 1. Auth Check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 2. Role Check
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (profile?.role !== "subscriber") {
      return NextResponse.json({ error: "Only subscribers can generate letters" }, { status: 403 })
    }

    // 3. Subscription & Limit Check
    // Check if user has generated any letters before (Free Trial Check)
    const { count } = await supabase.from("letters").select("*", { count: "exact", head: true }).eq("user_id", user.id)

    const isFreeTrial = (count || 0) === 0

    // If not free trial, ensure active subscription has credits available before generating
    if (!isFreeTrial) {
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("credits_remaining, status")
        .eq("user_id", user.id)
        .eq("status", "active")
        .single()

      if (!subscription || (subscription.credits_remaining || 0) <= 0) {
        return NextResponse.json(
          {
            error: "No letter credits remaining. Please upgrade your plan.",
            needsSubscription: true,
          },
          { status: 403 },
        )
      }
    }

    const body = await request.json()
    const { letterType, intakeData } = body

    if (!letterType || !intakeData) {
      return NextResponse.json({ error: "letterType and intakeData are required" }, { status: 400 })
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error("[v0] Missing GEMINI_API_KEY")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    // 4. Call Google Gemini API directly (Node runtime) for a first draft
    const prompt = buildPrompt(letterType, intakeData)

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      })
    })

    if (!response.ok) {
      console.error("[v0] Gemini API error:", response.status, response.statusText)
      return NextResponse.json({ error: "AI service unavailable" }, { status: 500 })
    }

    const aiResult = await response.json()
    const generatedContent = aiResult.candidates?.[0]?.content?.parts?.[0]?.text || ""

    if (!generatedContent) {
      console.error("[v0] Gemini returned empty content", aiResult)
      return NextResponse.json({ error: "AI returned empty content" }, { status: 500 })
    }

    // 5. Save draft directly into admin review queue
    const { data: newLetter, error: insertError } = await supabase
      .from("letters")
      .insert({
        user_id: user.id,
        letter_type: letterType,
        title: `${letterType} - ${new Date().toLocaleDateString()}`,
        intake_data: intakeData,
        ai_draft_content: generatedContent,
        status: "pending_review",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.error("[v0] Database insert error:", insertError)
      throw insertError
    }

    // Deduct allowance once we’ve successfully queued the letter (skip for free trial)
    if (!isFreeTrial) {
      const { data: canDeduct, error: deductError } = await supabase.rpc("deduct_letter_allowance", {
        u_id: user.id,
      })

      if (deductError || !canDeduct) {
        await supabase.from("letters").delete().eq("id", newLetter.id)
        return NextResponse.json(
          {
            error: "No letter allowances remaining. Please upgrade your plan.",
            needsSubscription: true,
          },
          { status: 403 },
        )
      }
    }

    return NextResponse.json(
      {
        success: true,
        letterId: newLetter.id,
        status: "pending_review",
        isFreeTrial,
        aiDraft: generatedContent,
      },
      { status: 200 },
    )
  } catch (error: any) {
    console.error("[v0] Letter generation error:", error)
    return NextResponse.json({ error: error.message || "Failed to generate letter" }, { status: 500 })
  }
}

function buildPrompt(letterType: string, intakeData: Record<string, unknown>) {
  const fields = (key: string) => `${key.replace(/_/g, " ")}: ${String(intakeData[key] ?? "")}`
  const amountField = intakeData["amountDemanded"] ? `Amount: $${intakeData["amountDemanded"]}` : ""

  return [
    `You are a professional legal attorney drafting a formal ${letterType} letter.`,
    "Write a professional, legally sound letter (300-500 words) with proper date/addresses, facts, clear demand, deadline, and professional tone.",
    fields("senderName"),
    fields("senderAddress"),
    fields("recipientName"),
    fields("recipientAddress"),
    fields("issueDescription"),
    fields("desiredOutcome"),
    amountField,
    "Return only the letter content, no additional commentary.",
  ]
    .filter(Boolean)
    .join("\n")
}
