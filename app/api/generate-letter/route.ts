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

    if (!letterType || !intakeData) {
      return NextResponse.json({ error: "letterType and intakeData are required" }, { status: 400 })
    }

    const functionsUrl =
      process.env.SUPABASE_FUNCTION_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(".supabase.co", ".functions.supabase.co")

    if (!functionsUrl) {
      console.error("[v0] Missing Supabase functions URL")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    // 4. Call edge function for Gemini generation
    const aiResponse = await fetch(`${functionsUrl}/ai-letter`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ letterType, intakeData }),
    })

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text()
      console.error("[v0] Edge function error:", errorText)
      return NextResponse.json({ error: "Failed to generate letter draft" }, { status: 500 })
    }

    const aiData = await aiResponse.json()
    const generatedContent = aiData?.content
    if (!generatedContent) {
      console.error("[v0] Edge function returned empty content", aiData)
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

    if (!isFreeTrial) {
      const { data: canDeduct, error: deductError } = await supabase.rpc("deduct_letter_allowance", {
        u_id: user.id,
      })

      if (deductError || !canDeduct) {
        // Clean up the created letter to avoid dangling records with no credits
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
      },
      { status: 200 },
    )
  } catch (error: any) {
    console.error("[v0] Letter generation error:", error)
    return NextResponse.json({ error: error.message || "Failed to generate letter" }, { status: 500 })
  }
}
