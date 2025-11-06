'use client'

import { useMemoryEffectiveness } from '@/lib/queries-v2'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2 } from 'lucide-react'

export function MemoryEffectiveness() {
  const effectiveness = useMemoryEffectiveness()

  if (!effectiveness || effectiveness.length === 0) {
    return (
      <Card className="p-12">
        <p className="text-center text-muted-foreground">No memory effectiveness data available</p>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-4">Top Performing Memories</h3>
      <ScrollArea className="h-[600px]">
        <div className="space-y-4 pr-4">
          {effectiveness.map((memory: any) => (
            <Card key={memory.memoryId} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge>{memory.category}</Badge>
                    <span className="text-sm font-medium">
                      Effectiveness: {memory.effectiveness.toFixed(1)}%
                    </span>
                  </div>
                  <h4 className="font-semibold">{memory.title}</h4>
                  <p className="text-sm text-muted-foreground">{memory.description}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Usage: {memory.usageCount}</span>
                    {memory.successRate > 0 && (
                      <span>Success Rate: {memory.successRate.toFixed(1)}%</span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </Card>
  )
}

