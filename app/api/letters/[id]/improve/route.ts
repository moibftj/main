import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/auth/admin-session'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin authentication
    const authError = await requireAdminAuth()
    if (authError) return authError

    const { id } = await params
    const supabase = await createClient()

    const body = await request.json()
    const { content, instruction } = body

    if (!content || !instruction) {
      return NextResponse.json({ error: 'Content and instruction are required' }, { status: 400 })
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error('[v0] Missing GEMINI_API_KEY')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Call Google Gemini API for content improvement
    const prompt = buildImprovementPrompt(content, instruction)

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
      }
    )

    if (!response.ok) {
      console.error('[v0] Gemini API error:', response.status, response.statusText)
      return NextResponse.json({ error: 'AI service unavailable' }, { status: 500 })
    }

    const aiResult = await response.json()
    const improvedContent = aiResult.candidates?.[0]?.content?.parts?.[0]?.text || ''

    if (!improvedContent) {
      console.error('[v0] Gemini returned empty content', aiResult)
      return NextResponse.json({ error: 'AI returned empty content' }, { status: 500 })
    }

    return NextResponse.json({ improvedContent }, { status: 200 })
  } catch (error) {
    console.error('[v0] Letter improvement error:', error)
    return NextResponse.json(
      { error: 'Failed to improve letter content' },
      { status: 500 }
    )
  }
}

function buildImprovementPrompt(content: string, instruction: string): string {
  return `You are a professional legal attorney improving a formal legal letter.

Current letter content:
${content}

Improvement instruction: ${instruction}

Please improve the letter according to the instruction while maintaining:
- Professional legal tone and language
- Proper letter structure and formatting
- All critical facts and details from the original
- Legal accuracy and effectiveness

Return ONLY the improved letter content, with no additional commentary or explanations.`
}
