import { NextRequest, NextResponse } from 'next/server'

const GAING_BRAIN_URL = process.env.GAING_BRAIN_URL || 'http://localhost:8080'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt, context, agent = 'gemini' } = body

    // Build messages for the LLM
    const messages = [
      {
        role: 'system',
        content: `You are JARVIS, an advanced AI assistant with neural-link capabilities. You have access to retrieval-augmented context when available. Be concise, helpful, and precise.${
          context?.length ? `\n\nGrounded context:\n${context.join('\n')}` : ''
        }`
      },
      { role: 'user', content: prompt }
    ]

    // Call gAIng-Brain backend
    const response = await fetch(`${GAING_BRAIN_URL}/api/llm/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        max_tokens: 500,
        temperature: 0.7,
        model: agent // Route to specific agent/model
      })
    })

    if (!response.ok) {
      // Fallback: route via messages API to specific agent
      const fallback = await fetch(`${GAING_BRAIN_URL}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: 'jarvis-frontend',
          recipient: agent, // Dynamic agent selection
          content: prompt,
          message_type: 'text'
        })
      })

      if (fallback.ok) {
        const data = await fallback.json()
        return NextResponse.json({
          reply: data.message?.content || 'Message logged. Processing...'
        })
      }

      throw new Error(`Backend returned ${response.status}`)
    }

    const data = await response.json()
    const reply =
      data.response?.choices?.[0]?.message?.content ||
      data.content ||
      data.reply ||
      'Neural link established. Awaiting further calibration.'

    return NextResponse.json({ reply })
  } catch (error) {
    console.error('JARVIS API Error:', error)
    return NextResponse.json(
      {
        reply: 'Neural link temporarily interrupted. Falling back to local heuristics.',
        error: true
      },
      { status: 500 }
    )
  }
}
