'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Brain, ListChecks, ArrowRight, CheckCircle, Clock, ExternalLink, Play, Info } from 'lucide-react'
import Link from 'next/link'
import { getAllRequests } from '@/lib/api/requests-api'
import { RequestContext } from '@/types'

const pipelineAgents = [
  {
    id: 'complexity-detector',
    name: 'Complexity Detector',
    href: '/agents/complexity-detector',
    icon: Sparkles,
    description: 'Analyze query complexity using semantic matching with Ollama embeddings',
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    borderColor: 'from-blue-500 to-blue-600',
  },
  {
    id: 'thought-agent',
    name: 'Thought Agent',
    href: '/agents/thought-agent',
    icon: Brain,
    description: 'Generate deep reasoning thoughts and explore multiple solution approaches',
    iconBg: 'bg-purple-100 dark:bg-purple-900/30',
    iconColor: 'text-purple-600 dark:text-purple-400',
    borderColor: 'from-purple-500 to-purple-600',
  },
  {
    id: 'planner-agent',
    name: 'Planner Agent',
    href: '/agents/planner-agent',
    icon: ListChecks,
    description: 'Convert reasoning thoughts into structured, executable action plans',
    iconBg: 'bg-green-100 dark:bg-green-900/30',
    iconColor: 'text-green-600 dark:text-green-400',
    borderColor: 'from-green-500 to-green-600',
  },
]

export default function PipelineOverviewPage() {
  const [requests, setRequests] = useState<RequestContext[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRequests()
  }, [])

  const loadRequests = async () => {
    setLoading(true)
    try {
      const data = await getAllRequests()
      setRequests(data)
    } catch (error) {
      console.error('Failed to load requests:', error)
    } finally {
      setLoading(false)
    }
  }

  // Helper to check if a request has completed a certain agent
  const hasCompletedAgent = (request: RequestContext, agentId: string) => {
    return request.agentChain.includes(agentId)
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="mb-1">Agent Pipeline Overview</h1>
          <p className="text-[13px] text-muted-foreground">
            Visualize the three-stage agent pipeline and track request progress
          </p>
        </div>

        {/* Pipeline Flow Diagram */}
        <div className="space-y-6">
          {pipelineAgents.map((agent, index) => {
            const Icon = agent.icon
            const completedCount = requests.filter(r => hasCompletedAgent(r, agent.id)).length
            const isLast = index === pipelineAgents.length - 1
            
            return (
              <div key={agent.id} className="relative">
                {/* Agent Card */}
                <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-colors">
                  <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${agent.borderColor}`} />
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`p-2 rounded-lg ${agent.iconBg}`}>
                          <Icon className={`w-6 h-6 ${agent.iconColor}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <CardTitle className="text-lg">
                              {agent.name}
                            </CardTitle>
                            <Badge variant="secondary" className="text-xs">
                              Step {index + 1}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {agent.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="gap-1.5">
                          <CheckCircle className="w-3 h-3" />
                          {completedCount} completed
                        </Badge>
                        <Button variant="outline" size="sm" asChild className="gap-2">
                          <Link href={agent.href}>
                            Open
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span>Completed: {completedCount} of {requests.length}</span>
                        <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all"
                            style={{ width: `${requests.length > 0 ? (completedCount / requests.length) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Arrow Connector */}
                {!isLast && (
                  <div className="flex justify-center my-2">
                    <ArrowRight className="w-6 h-6 text-muted-foreground/30" />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Getting Started Guide */}
        <Card className="border-blue-200/50 dark:border-blue-900/30 bg-blue-50/30 dark:bg-blue-950/10">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <CardTitle>Getting Started</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                  1
                </span>
                <div>
                  <strong className="text-foreground">Start with Complexity Detector</strong>
                  <p className="text-muted-foreground mt-1">
                    Analyze your queries to determine their complexity level and routing
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold">
                  2
                </span>
                <div>
                  <strong className="text-foreground">Generate Thoughts</strong>
                  <p className="text-muted-foreground mt-1">
                    Use the Thought Agent to explore multiple solution approaches
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold">
                  3
                </span>
                <div>
                  <strong className="text-foreground">Create Execution Plan</strong>
                  <p className="text-muted-foreground mt-1">
                    Convert your thoughts into a structured, actionable plan
                  </p>
                </div>
              </li>
            </ol>
            <div className="mt-6">
              <Button asChild className="gap-2">
                <Link href="/agents/complexity-detector">
                  <Play className="w-4 h-4" />
                  Start with Complexity Detector
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Activity</CardTitle>
              <Button variant="outline" size="sm" onClick={loadRequests} disabled={loading}>
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Loading requests...
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No requests yet. Start by using the Complexity Detector.
              </div>
            ) : (
              <div className="space-y-2">
                {requests.slice(0, 10).map((request) => (
                  <Link
                    key={request.requestId}
                    href={`/requests`}
                    className="block p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <code className="text-xs font-mono text-muted-foreground">
                          {request.requestId}
                        </code>
                        {request.userQuery && (
                          <p className="text-sm mt-1 line-clamp-1">
                            {request.userQuery}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {pipelineAgents.map((agent) => (
                            <Badge
                              key={agent.id}
                              variant={
                                hasCompletedAgent(request, agent.id)
                                  ? 'default'
                                  : 'outline'
                              }
                              className="text-xs"
                            >
                              <agent.icon className="w-3 h-3 mr-1" />
                              {agent.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(request.createdAt).toLocaleDateString()}
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {request.status}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

