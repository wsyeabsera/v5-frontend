import { NextRequest, NextResponse } from 'next/server'
import { BaseAgent } from '@/lib/agents/base-agent'
import { BaseAgentOutput } from '@/types'
import { generateRequestId } from '@/lib/utils/request-id'

/**
 * Test implementation of Base Agent
 * This demonstrates how to use the Base Agent class
 */
class TestAgent extends BaseAgent {
  constructor() {
    super('base-agent')
  }

  async testLLMCall(userQuery: string): Promise<BaseAgentOutput> {
    const requestContext = generateRequestId(userQuery)
    const updatedContext = this.addToChain(requestContext)

    const messages = [
      {
        role: 'system' as const,
        content: 'You are a helpful assistant. Provide clear, concise responses.'
      },
      {
        role: 'user' as const,
        content: userQuery
      }
    ]

    const response = await this.callLLM(messages)

    return {
      requestId: updatedContext.requestId,
      agentName: this.agentId,
      timestamp: new Date(),
      requestContext: updatedContext,
      content: response,
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userQuery } = body

    if (!userQuery || typeof userQuery !== 'string') {
      return NextResponse.json(
        { error: 'userQuery (string) is required' },
        { status: 400 }
      )
    }

    const agent = new TestAgent()
    await agent.initialize(req.headers)

    const result = await agent.testLLMCall(userQuery)

    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    console.error('[Base Agent API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    agent: 'base-agent',
    status: 'ready',
    description: 'Base agent utilities for LLM calls and response parsing',
  })
}

