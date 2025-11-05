'use client'

import { useMemo, useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ThoughtNode } from './ThoughtNode'
import { PlanNode } from './PlanNode'
import { TaskNode } from './TaskNode'
import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from 'lucide-react'

interface FlowchartViewProps {
  thoughts: any[]
  plans: any[]
  tasks: any[]
  onViewThought?: (thoughtId: string) => void
  onViewPlan?: (planId: string) => void
  onViewTask?: (taskId: string) => void
}

interface FlowNode {
  id: string
  type: 'thought' | 'plan' | 'task'
  data: any
  x: number
  y: number
  width: number
  height: number
}

interface FlowConnection {
  from: string
  to: string
  type: 'thought-plan' | 'plan-task'
}

export function FlowchartView({
  thoughts,
  plans,
  tasks,
  onViewThought,
  onViewPlan,
  onViewTask,
}: FlowchartViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // Build flowchart structure
  const { nodes, connections } = useMemo(() => {
    const nodeMap = new Map<string, FlowNode>()
    const conns: FlowConnection[] = []

    const nodeWidth = 320
    const nodeHeight = 200
    const horizontalSpacing = 400
    const verticalSpacing = 250

    let thoughtY = 0
    let planY = 0
    let taskY = 0

    // Create thought nodes
    thoughts.forEach((thought: any, index: number) => {
      const thoughtId = thought._id || thought.id
      nodeMap.set(thoughtId, {
        id: thoughtId,
        type: 'thought',
        data: thought,
        x: 0,
        y: thoughtY,
        width: nodeWidth,
        height: nodeHeight,
      })
      thoughtY += nodeHeight + verticalSpacing
    })

    // Create plan nodes
    plans.forEach((plan: any, index: number) => {
      const planId = plan._id || plan.id
      const thoughtId = plan.thoughtId

      // Find related thought
      const thought = thoughts.find((t: any) => (t._id || t.id) === thoughtId)
      let x = horizontalSpacing
      let y = 0

      if (thought) {
        const thoughtNode = nodeMap.get(thought._id || thought.id)
        if (thoughtNode) {
          y = thoughtNode.y
          // Create connection
          conns.push({
            from: thought._id || thought.id,
            to: planId,
            type: 'thought-plan',
          })
        }
      } else {
        y = planY
        planY += nodeHeight + verticalSpacing
      }

      nodeMap.set(planId, {
        id: planId,
        type: 'plan',
        data: plan,
        x,
        y,
        width: nodeWidth,
        height: nodeHeight,
      })
    })

    // Create task nodes
    tasks.forEach((task: any, index: number) => {
      const taskId = task._id || task.id
      const planId = task.planId

      // Find related plan
      const plan = plans.find((p: any) => (p._id || p.id) === planId)
      let x = horizontalSpacing * 2
      let y = 0

      if (plan) {
        const planNode = nodeMap.get(plan._id || plan.id)
        if (planNode) {
          // Stack tasks vertically below their plan
          const existingTasks = Array.from(nodeMap.values()).filter(
            (n) => n.type === 'task' && n.data.planId === planId
          )
          y = planNode.y + existingTasks.length * (nodeHeight + 50)
          // Create connection
          conns.push({
            from: plan._id || plan.id,
            to: taskId,
            type: 'plan-task',
          })
        }
      } else {
        y = taskY
        taskY += nodeHeight + verticalSpacing
      }

      nodeMap.set(taskId, {
        id: taskId,
        type: 'task',
        data: task,
        x,
        y,
        width: nodeWidth,
        height: nodeHeight,
      })
    })

    return {
      nodes: Array.from(nodeMap.values()),
      connections: conns,
    }
  }, [thoughts, plans, tasks])

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setZoom((prev) => Math.max(0.5, Math.min(2, prev * delta)))
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true)
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(2, prev * 1.2))
  }

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(0.5, prev * 0.8))
  }

  const handleReset = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  const getConnectionPath = (fromId: string, toId: string) => {
    const fromNode = nodes.find((n) => n.id === fromId)
    const toNode = nodes.find((n) => n.id === toId)

    if (!fromNode || !toNode) return ''

    const fromX = fromNode.x + fromNode.width
    const fromY = fromNode.y + fromNode.height / 2
    const toX = toNode.x
    const toY = toNode.y + toNode.height / 2

    const midX = (fromX + toX) / 2

    return `M ${fromX} ${fromY} L ${midX} ${fromY} L ${midX} ${toY} L ${toX} ${toY}`
  }

  const getConnectionColor = (type: string) => {
    switch (type) {
      case 'thought-plan':
        return '#3b82f6' // blue
      case 'plan-task':
        return '#10b981' // green
      default:
        return '#6b7280' // gray
    }
  }

  const containerWidth = Math.max(1200, Math.max(...nodes.map((n) => n.x + n.width)) + 100)
  const containerHeight = Math.max(800, Math.max(...nodes.map((n) => n.y + n.height)) + 100)

  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border rounded-lg bg-muted/30">
        <h3 className="text-lg font-semibold mb-2">No nodes to display</h3>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Create thoughts, plans, or tasks to visualize the execution flow.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-lg">Visual Flowchart</h3>
          <span className="text-sm text-muted-foreground">
            {nodes.length} node{nodes.length !== 1 ? 's' : ''} • {connections.length} connection{connections.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleZoomOut}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleZoomIn}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Flowchart Container */}
      <Card className="overflow-hidden border-2">
        <div
          ref={containerRef}
          className="relative w-full h-[600px] overflow-auto bg-muted/20 cursor-move"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <svg
            width={containerWidth}
            height={containerHeight}
            className="absolute inset-0"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
            }}
          >
            {/* Arrow head definitions */}
            <defs>
              <marker
                id="arrowhead-thought-plan"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3, 0 6"
                  fill="#3b82f6"
                />
              </marker>
              <marker
                id="arrowhead-plan-task"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3, 0 6"
                  fill="#10b981"
                />
              </marker>
            </defs>
            {/* Connections */}
            {connections.map((conn, index) => {
              const path = getConnectionPath(conn.from, conn.to)
              if (!path) return null
              const markerId = conn.type === 'thought-plan' ? 'arrowhead-thought-plan' : 'arrowhead-plan-task'
              return (
                <path
                  key={`conn-${index}`}
                  d={path}
                  stroke={getConnectionColor(conn.type)}
                  strokeWidth="2"
                  fill="none"
                  strokeDasharray={conn.type === 'thought-plan' ? '0' : '5,5'}
                  markerEnd={`url(#${markerId})`}
                />
              )
            })}
          </svg>

          {/* Nodes */}
          <div
            className="absolute inset-0"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
            }}
          >
            {nodes.map((node) => (
              <div
                key={node.id}
                className="absolute"
                style={{
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                  width: `${node.width}px`,
                }}
              >
                {node.type === 'thought' && (
                  <ThoughtNode thought={node.data} onView={onViewThought} />
                )}
                {node.type === 'plan' && (
                  <PlanNode plan={node.data} onView={onViewPlan} onViewThought={node.data.thoughtId ? () => onViewThought?.(node.data.thoughtId) : undefined} />
                )}
                {node.type === 'task' && (
                  <TaskNode task={node.data} onView={onViewTask} onViewPlan={node.data.planId ? () => onViewPlan?.(node.data.planId) : undefined} />
                )}
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}

