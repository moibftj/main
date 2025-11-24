import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured')
    }

    const { letterType, formData, prompt } = await req.json()

    const systemPrompt = `You are a professional legal letter writer. Generate a formal, professional legal letter based on the provided information. The letter should be:
- Formal and professional in tone
- Legally sound and appropriate
- Clear and direct
- Properly formatted with proper salutations and closings
- Specific to the letter type requested

Letter Type: ${letterType || 'Professional Legal Letter'}

Format the response as a complete letter ready to send.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: prompt || JSON.stringify(formData)
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI API error: ${error}`)
    }

    const data = await response.json()
    const generatedLetter = data.choices[0]?.message?.content

    if (!generatedLetter) {
      throw new Error('No content generated from OpenAI')
    }

    return new Response(
      JSON.stringify({
        success: true,
        content: generatedLetter,
        model: 'gpt-4-turbo-preview',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An error occurred generating the letter',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
