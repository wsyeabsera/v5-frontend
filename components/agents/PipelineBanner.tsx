'use client'

import { Sparkles, Brain, ListChecks, ShieldCheck, Play, FileText, ChevronRight, Info, X, BarChart } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useState } from 'react'

interface PipelineAgent {
  id: string
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}

interface PipelineBannerProps {
  currentAgent: string
  requestId?: string
}

const pipelineAgents: PipelineAgent[] = [
  {
    id: 'complexity-detector',
    name: 'Complexity Detector',
    href: '/agents/complexity-detector',
    icon: Sparkles,
    description: 'Analyze query complexity using semantic matching with Ollama embeddings',
  },
  {
    id: 'thought-agent',
    name: 'Thought Agent',
    href: '/agents/thought-agent',
    icon: Brain,
    description: 'Generate deep reasoning thoughts and explore multiple solution approaches',
  },
  {
    id: 'planner-agent',
    name: 'Planner Agent',
    href: '/agents/planner-agent',
    icon: ListChecks,
    description: 'Convert reasoning thoughts into structured, executable action plans',
  },
  {
    id: 'critic-agent',
    name: 'Critic Agent',
    href: '/agents/critic-agent',
    icon: ShieldCheck,
    description: 'Evaluate plans for errors, risks, and completeness before execution',
  },
  {
    id: 'confidence-scorer',
    name: 'Confidence Scorer',
    href: '/agents/confidence-scorer',
    icon: BarChart,
    description: 'Aggregate confidence scores from multiple agents and make routing decisions',
  },
  {
    id: 'executor-agent',
    name: 'Executor Agent',
    href: '/agents/executor-agent',
    icon: Play,
    description: 'Execute plans step-by-step with intelligent error handling and tool coordination',
  },
  {
    id: 'summary-agent',
    name: 'Summary Agent',
    href: '/agents/summary-agent',
    icon: FileText,
    description: 'Generate human-readable summaries from thoughts and execution outputs',
  },
]

export function PipelineBanner({ currentAgent, requestId }: PipelineBannerProps) {
  const [showLearnMore, setShowLearnMore] = useState(false)
  const currentIndex = pipelineAgents.findIndex(a => a.id === currentAgent)
  const current = pipelineAgents[currentIndex]

  if (!current) return null

  // Helper function to append requestId to href if present
  const getAgentHref = (agent: PipelineAgent) => {
    if (requestId) {
      return `${agent.href}/${requestId}`
    }
    return agent.href
  }

  return (
    <div className="rounded-lg border border-blue-200/50 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-950/20 p-4 mb-6 animate-fade-in relative">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <current.icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-semibold">Agent Pipeline</h3>
            <Badge variant="secondary" className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
              Step {currentIndex + 1} of {pipelineAgents.length}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            You're in <strong>{current.name}</strong>. {current.description}
          </p>
          
          {/* Pipeline Flow */}
          <div className="flex items-center gap-2 text-xs mb-3 flex-wrap">
            {pipelineAgents.map((agent, index) => {
              const Icon = agent.icon
              const isActive = agent.id === currentAgent
              const isComplete = index < currentIndex
              const isDisabled = index > currentIndex
              
              return (
                <div key={agent.id} className="flex items-center gap-2">
                  <Link
                    href={getAgentHref(agent)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors ${
                      isActive
                        ? 'bg-blue-600 dark:bg-blue-500 text-white'
                        : isComplete
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                        : isDisabled
                        ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
                        : 'bg-background border border-border text-foreground hover:bg-accent/10'
                    }`}
                    title={isDisabled ? 'Complete previous steps first' : agent.name}
                    onClick={(e) => isDisabled && e.preventDefault()}
                  >
                    <Icon className="w-3 h-3" />
                    <span className="font-medium">{index + 1}</span>
                  </Link>
                  {index < pipelineAgents.length - 1 && (
                    <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
                  )}
                </div>
              )
            })}
          </div>

          {/* Prerequisites/Next Steps */}
          <div className="flex items-center gap-2 text-xs">
            {currentIndex > 0 && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <span>←</span>
                <span>Requires:</span>
                <span className="font-medium">{pipelineAgents[currentIndex - 1].name}</span>
              </div>
            )}
            {currentIndex < pipelineAgents.length - 1 && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <span>→</span>
                <span>Next:</span>
                <Link 
                  href={getAgentHref(pipelineAgents[currentIndex + 1])}
                  className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {pipelineAgents[currentIndex + 1].name}
                </Link>
              </div>
            )}
          </div>
        </div>
        
        {/* Learn More Toggle */}
        <Collapsible open={showLearnMore} onOpenChange={setShowLearnMore}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 flex-shrink-0"
              aria-label={showLearnMore ? 'Hide information' : 'Show information'}
            >
              {showLearnMore ? (
                <X className="w-4 h-4" />
              ) : (
                <Info className="w-4 h-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="absolute top-full right-0 mt-2 max-w-md rounded-lg border bg-popover p-3 shadow-lg z-50">
              <h4 className="text-xs font-semibold mb-2">Pipeline Flow</h4>
              <div className="space-y-2 text-xs text-muted-foreground">
                <p className="leading-relaxed">
                  The agent pipeline processes requests through seven stages. Each agent builds on the previous stage's output.
                </p>
                <ul className="space-y-1 list-disc list-inside ml-1">
                  <li><strong>Complexity Detector:</strong> Analyze and classify query complexity</li>
                  <li><strong>Thought Agent:</strong> Generate reasoning from complexity analysis</li>
                  <li><strong>Planner Agent:</strong> Create executable plans from thoughts</li>
                  <li><strong>Critic Agent:</strong> Evaluate plans for errors and completeness</li>
                  <li><strong>Confidence Scorer:</strong> Aggregate confidence scores and make routing decisions</li>
                  <li><strong>Executor Agent:</strong> Execute plans with error handling and tool coordination</li>
                  <li><strong>Summary Agent:</strong> Generate human-readable summaries from thoughts and execution outputs</li>
                </ul>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  )
}

