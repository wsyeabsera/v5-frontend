'use client'

import { useState } from 'react'
import { EnhancementHistory } from './EnhancementHistory'
import { EnhancementComparison } from './EnhancementComparison'
import { EnhancementMetrics } from './EnhancementMetrics'
import { EnhancementTester } from './EnhancementTester'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

export function PromptEnhancementViewer() {
  const [phaseFilter, setPhaseFilter] = useState<string>('all')
  const [selectedEnhancement, setSelectedEnhancement] = useState<any>(null)

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <Tabs defaultValue="tester" className="w-full">
        <TabsList className="grid w-full max-w-3xl grid-cols-4 mb-6">
          <TabsTrigger value="tester">Test Enhancement</TabsTrigger>
          <TabsTrigger value="history">Enhancement History</TabsTrigger>
          <TabsTrigger value="comparison">Before/After</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="tester" className="space-y-4">
          <EnhancementTester onEnhancementComplete={setSelectedEnhancement} />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center gap-4">
              <div>
                <Label htmlFor="phase">Phase</Label>
                <Select value={phaseFilter} onValueChange={setPhaseFilter}>
                  <SelectTrigger id="phase" className="w-[200px] mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Phases</SelectItem>
                    <SelectItem value="thought">Thought</SelectItem>
                    <SelectItem value="plan">Plan</SelectItem>
                    <SelectItem value="execution">Execution</SelectItem>
                    <SelectItem value="summary">Summary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
          <EnhancementHistory phaseFilter={phaseFilter} onSelect={setSelectedEnhancement} />
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          {selectedEnhancement ? (
            <EnhancementComparison enhancement={selectedEnhancement} />
          ) : (
            <Card className="p-12">
              <div className="text-center text-muted-foreground">
                Select an enhancement to view comparison
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <EnhancementMetrics phaseFilter={phaseFilter} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

