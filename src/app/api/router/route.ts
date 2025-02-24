import { NextRequest, NextResponse } from 'next/server'
import { RouterManager } from '../../services/router/manager'

const routerManager = new RouterManager()

export async function POST(req: NextRequest) {
  try {
    const { message, context } = await req.json()

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    const result = await routerManager.routeMessage(message, context)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Router error:', error)
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    )
  }
} 