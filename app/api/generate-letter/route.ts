import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export const runtime = "edge"

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

    // If not free trial, check subscription credits
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

    if (!process.env.GEMINI_API_KEY) {
      console.error("[v0] Missing GEMINI_API_KEY")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    // 4. Call Gemini (AI Generation)
    const prompt = `You are a professional legal attorney drafting a formal ${letterType} letter. Generate a professionally formatted legal letter with the following details:

Sender: ${intakeData.senderName}
Sender Address: ${intakeData.senderAddress}
Recipient: ${intakeData.recipientName}
Recipient Address: ${intakeData.recipientAddress}
Issue: ${intakeData.issueDescription}
Desired Outcome: ${intakeData.desiredOutcome}
${intakeData.amountDemanded ? `Amount: $${intakeData.amountDemanded}` : ""}

Write a professional, legally sound letter that:
1. Is properly formatted with date and addresses
2. Clearly states the issue
3. References relevant facts
4. Makes a clear demand or request
5. Sets a reasonable deadline
6. Maintains professional tone
7. Is approximately 300-500 words

Return only the letter content, no additional commentary.`

    const aiResponse = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" +
        process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
        }),
      },
    )

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text()
      console.error("[v0] Gemini API error:", errorText)
      throw new Error(`Letter generation failed: ${aiResponse.status} ${aiResponse.statusText}`)
    }

    const aiData = await aiResponse.json()
    const generatedContent = aiData.candidates?.[0]?.content?.parts?.[0]?.text || ""

    if (!generatedContent) {
      console.error("[v0] Gemini returned empty content", aiData)
      throw new Error("AI generated empty content")
    }

    // 5. Save Draft
    const { data: newLetter, error: insertError } = await supabase
      .from("letters")
      .insert({
        user_id: user.id,
        letter_type: letterType,
        title: `${letterType} - ${new Date().toLocaleDateString()}`,
        intake_data: intakeData,
        ai_draft_content: generatedContent,
        status: "draft", // Explicitly set status to draft
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.error("[v0] Database insert error:", insertError)
      throw insertError
    }

    return NextResponse.json({
      success: true,
      content: generatedContent,
      letterId: newLetter.id,
      isFreeTrial,
    })
  } catch (error: any) {
    console.error("[v0] Letter generation error:", error)
    return NextResponse.json({ error: error.message || "Failed to generate letter" }, { status: 500 })
  }
}
