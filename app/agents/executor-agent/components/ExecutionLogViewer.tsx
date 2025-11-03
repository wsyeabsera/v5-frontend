'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ExecutorAgentOutput, Plan } from '@/types'
import { 
  Terminal, 
  Search, 
  Filter, 
  Download, 
  ChevronDown,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Wrench,
  Brain,
  Zap
} from 'lucide-react'
import { useState, useMemo } from 'react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

interface ExecutionLogViewerProps {
  plan: Plan | null
  executionResult?: ExecutorAgentOutput | null
}

type EventType = 'step-start' | 'step-complete' | 'step-fail' | 'coordination' | 'tool-call' | 'error' | 'update' | 'adaptation' | 'question'

interface LogEvent {
  id: string
  type: EventType
  timestamp: Date
  stepId?: string
  stepOrder?: number
  message: string
  details?: any
  icon: React.ReactNode
  color: string
}

export function ExecutionLogViewer({
  plan,
  executionResult,
}: ExecutionLogViewerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<EventType | 'all'>('all')
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())

  const toggleEvent = (eventId: string) => {
    const newExpanded = new Set(expandedEvents)
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId)
    } else {
      newExpanded.add(eventId)
    }
    setExpandedEvents(newExpanded)
  }

  const events = useMemo<LogEvent[]>(() => {
    if (!plan || !executionResult) return []

    const logs: LogEvent[] = []

    // Add plan updates
    executionResult.executionResult.planUpdates?.forEach((update, idx) => {
      logs.push({
        id: `update-${update.stepId}-${idx}`,
        type: 'update',
        timestamp: new Date(update.timestamp),
        stepId: update.stepId,
        stepOrder: update.stepOrder,
        message: `Parameter coordination for Step ${update.stepOrder}`,
        details: update,
        icon: <Sparkles className="w-4 h-4" />,
        color: 'text-blue-600 dark:text-blue-400',
      })
    })

    // Add adaptations
    executionResult.executionResult.adaptations.forEach((adaptation, idx) => {
      logs.push({
        id: `adaptation-${adaptation.stepId}-${idx}`,
        type: 'adaptation',
        timestamp: new Date(executionResult.timestamp),
        stepId: adaptation.stepId,
        message: `Plan adaptation: ${adaptation.reason}`,
        details: adaptation,
        icon: <Wrench className="w-4 h-4" />,
        color: 'text-orange-600 dark:text-orange-400',
      })
    })

    // Add step events
    executionResult.executionResult.steps.forEach((step) => {
      const stepInfo = plan.steps.find(s => s.id === step.stepId)
      
      // Step start
      logs.push({
        id: `step-start-${step.stepId}`,
        type: 'step-start',
        timestamp: new Date(step.timestamp),
        stepId: step.stepId,
        stepOrder: step.stepOrder,
        message: `Started Step ${step.stepOrder}: ${stepInfo?.description || 'Unknown'}`,
        details: step,
        icon: <Clock className="w-4 h-4" />,
        color: 'text-muted-foreground',
      })

      // Tool call
      if (step.toolCalled) {
        logs.push({
          id: `tool-call-${step.stepId}`,
          type: 'tool-call',
          timestamp: new Date(step.timestamp),
          stepId: step.stepId,
          stepOrder: step.stepOrder,
          message: `Tool called: ${step.toolCalled}`,
          details: { tool: step.toolCalled, parameters: step.parametersUsed },
          icon: <Terminal className="w-4 h-4" />,
          color: 'text-purple-600 dark:text-purple-400',
        })
      }

      // Step result
      if (step.success) {
        logs.push({
          id: `step-complete-${step.stepId}`,
          type: 'step-complete',
          timestamp: new Date(step.timestamp),
          stepId: step.stepId,
          stepOrder: step.stepOrder,
          message: `Completed Step ${step.stepOrder} in ${step.duration}ms`,
          details: { result: step.result, duration: step.duration },
          icon: <CheckCircle className="w-4 h-4" />,
          color: 'text-green-600 dark:text-green-400',
        })
      } else {
        logs.push({
          id: `step-fail-${step.stepId}`,
          type: 'step-fail',
          timestamp: new Date(step.timestamp),
          stepId: step.stepId,
          stepOrder: step.stepOrder,
          message: `Failed Step ${step.stepOrder}: ${step.error}`,
          details: { error: step.error, errorType: step.errorType, retries: step.retries },
          icon: <XCircle className="w-4 h-4" />,
          color: 'text-red-600 dark:text-red-400',
        })
      }
    })

    // Add errors
    executionResult.executionResult.errors.forEach((error, idx) => {
      logs.push({
        id: `error-${idx}`,
        type: 'error',
        timestamp: executionResult.timestamp,
        message: error,
        icon: <AlertTriangle className="w-4 h-4" />,
        color: 'text-red-600 dark:text-red-400',
      })
    })

    // Add questions
    executionResult.executionResult.questionsAsked.forEach((question, idx) => {
      logs.push({
        id: `question-${question.id}`,
        type: 'question',
        timestamp: executionResult.timestamp,
        stepId: question.context.stepId,
        stepOrder: question.context.stepOrder,
        message: `Question asked: ${question.question}`,
        details: question,
        icon: <Brain className="w-4 h-4" />,
        color: 'text-yellow-600 dark:text-yellow-400',
      })
    })

    // Sort by timestamp
    return logs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
  }, [plan, executionResult])

  const filteredEvents = useMemo(() => {
    let filtered = events

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(e => e.type === filterType)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(e => 
        e.message.toLowerCase().includes(query) ||
        (e.details && JSON.stringify(e.details).toLowerCase().includes(query))
      )
    }

    return filtered
  }, [events, filterType, searchQuery])

  const exportLog = () => {
    const logData = {
      timestamp: new Date().toISOString(),
      plan: plan?.goal,
      events: events.map(e => ({
        type: e.type,
        timestamp: e.timestamp.toISOString(),
        stepOrder: e.stepOrder,
        message: e.message,
        details: e.details,
      })),
    }
    const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `execution-log-${new Date().toISOString()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Terminal className="w-5 h-5" />
            Execution Log
            <Badge variant="outline" className="text-xs">
              {filteredEvents.length} / {events.length}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportLog}
              disabled={events.length === 0}
              className="gap-2"
            >
              <Download className="w-3 h-3" />
              Export
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <div className="flex-1 relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search log..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs h-8"
            />
          </div>
          <Select value={filterType} onValueChange={(v) => setFilterType(v as EventType | 'all')}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <Filter className="w-3 h-3 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="step-start">Step Start</SelectItem>
              <SelectItem value="step-complete">Step Complete</SelectItem>
              <SelectItem value="step-fail">Step Failed</SelectItem>
              <SelectItem value="tool-call">Tool Calls</SelectItem>
              <SelectItem value="coordination">Coordination</SelectItem>
              <SelectItem value="update">Parameter Updates</SelectItem>
              <SelectItem value="adaptation">Adaptations</SelectItem>
              <SelectItem value="error">Errors</SelectItem>
              <SelectItem value="question">Questions</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-2">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <Terminal className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
            <p>No log events</p>
            <p className="text-xs mt-1">
              {events.length === 0 
                ? 'Execute a plan to see execution logs'
                : 'No events match your filters'}
            </p>
          </div>
        ) : (
          filteredEvents.map((event) => {
            const isExpanded = expandedEvents.has(event.id)
            return (
              <Collapsible key={event.id} open={isExpanded} onOpenChange={() => toggleEvent(event.id)}>
                <div className={`p-3 rounded-lg border transition-colors ${
                  event.type === 'step-complete' ? 'border-green-500/20 bg-green-500/5' :
                  event.type === 'step-fail' || event.type === 'error' ? 'border-red-500/20 bg-red-500/5' :
                  event.type === 'update' ? 'border-blue-500/20 bg-blue-500/5' :
                  event.type === 'adaptation' ? 'border-orange-500/20 bg-orange-500/5' :
                  'border-border bg-muted/30'
                }`}>
                  <CollapsibleTrigger asChild>
                    <div className="cursor-pointer">
                      <div className="flex items-start gap-2">
                        <div className={`mt-0.5 ${event.color}`}>
                          {event.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {event.type}
                            </Badge>
                            {event.stepOrder && (
                              <Badge variant="secondary" className="text-xs">
                                Step {event.stepOrder}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground ml-auto">
                              {event.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-xs text-foreground">{event.message}</p>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${
                          isExpanded ? 'rotate-180' : ''
                        }`} />
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <pre className="text-xs bg-muted p-3 rounded overflow-x-auto max-h-40 overflow-y-auto">
                        {JSON.stringify(event.details, null, 2)}
                      </pre>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}

