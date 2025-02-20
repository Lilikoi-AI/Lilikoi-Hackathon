import { NextRequest, NextResponse } from 'next/server'
import sonicAgent from '@/app/services/agent'

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OpenAI API key is not configured' },
      { status: 500 }
    )
  }

  try {
    const { message, walletAddress } = await req.json()
    const response = await sonicAgent.processMessage(message, walletAddress)
    return NextResponse.json({ response })
  } catch (error) {
    console.error('Agent error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
