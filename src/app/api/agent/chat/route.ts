import { NextRequest, NextResponse } from 'next/server'
import sonicAgent from '@/app/services/agent'

export async function POST(req: NextRequest) {
  // Debug logging
  console.log('Environment variables:', {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'Set' : 'Not set',
    NEXT_PUBLIC_OPENAI_API_KEY: process.env.NEXT_PUBLIC_OPENAI_API_KEY ? 'Set' : 'Not set'
  });

  const apiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) {
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
