import { NextRequest, NextResponse } from 'next/server'
import { getAgentConfigStorage } from '@/lib/storage/agent-config-storage'
import { AgentConfig } from '@/types'

/**
 * GET /api/agents
 * 
 * List all agent configurations
 */
export async function GET() {
  try {
    const storage = getAgentConfigStorage()
    const configs = await storage.getAllAgentConfigs()

    return NextResponse.json({ configs }, { status: 200 })
  } catch (error: any) {
    console.error('[Agents API] GET error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch agent configs' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/agents
 * 
 * Create a new agent configuration
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const config: AgentConfig = body

    // Validate required fields
    if (!config.agentId || !config.name || !config.description) {
      return NextResponse.json(
        { error: 'Missing required fields: agentId, name, description' },
        { status: 400 }
      )
    }

    const storage = getAgentConfigStorage()
    
    // Check if config already exists
    const existing = await storage.getAgentConfig(config.agentId)
    if (existing) {
      return NextResponse.json(
        { error: `Agent config with ID '${config.agentId}' already exists. Use PUT to update.` },
        { status: 409 }
      )
    }

    const success = await storage.saveAgentConfig(config)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to save agent config' },
        { status: 500 }
      )
    }

    // Return the created config
    const createdConfig = await storage.getAgentConfig(config.agentId)
    return NextResponse.json({ config: createdConfig }, { status: 201 })
  } catch (error: any) {
    console.error('[Agents API] POST error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create agent config' },
      { status: 500 }
    )
  }
}

