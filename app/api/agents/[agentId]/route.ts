import { NextRequest, NextResponse } from 'next/server'
import { getAgentConfigStorage } from '@/lib/storage/agent-config-storage'
import { AgentConfig } from '@/types'

/**
 * GET /api/agents/[agentId]
 * 
 * Get specific agent configuration
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const { agentId } = params
    
    const storage = getAgentConfigStorage()
    const config = await storage.getAgentConfig(agentId)

    if (!config) {
      return NextResponse.json(
        { error: 'Agent config not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ config }, { status: 200 })
  } catch (error: any) {
    console.error('[Agents API] GET error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch agent config' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/agents/[agentId]
 * 
 * Update agent configuration
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const { agentId } = params
    const body = await req.json()
    const config: AgentConfig = body

    // Ensure agentId matches URL parameter
    config.agentId = agentId

    const storage = getAgentConfigStorage()
    const success = await storage.saveAgentConfig(config)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update agent config' },
        { status: 500 }
      )
    }

    // Return the updated config (fetches from DB to ensure we have all fields)
    const updatedConfig = await storage.getAgentConfig(agentId)
    return NextResponse.json({ config: updatedConfig }, { status: 200 })
  } catch (error: any) {
    console.error('[Agents API] PUT error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update agent config' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/agents/[agentId]
 * 
 * Delete agent configuration
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const { agentId } = params
    
    const storage = getAgentConfigStorage()
    const success = await storage.deleteAgentConfig(agentId)

    if (!success) {
      return NextResponse.json(
        { error: 'Agent config not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { message: 'Agent config deleted successfully' },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('[Agents API] DELETE error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete agent config' },
      { status: 500 }
    )
  }
}

