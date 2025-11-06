'use client'

import { useState } from 'react'
import { ExampleLibrary } from './ExampleLibrary'
import { ExampleEffectiveness } from './ExampleEffectiveness'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

export function FewShotMonitor() {
  const [phaseFilter, setPhaseFilter] = useState<string>('all')

  return (
    <div className="space-y-6">
      {/* Filters */}
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

      {/* Tabs */}
      <Tabs defaultValue="library" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
          <TabsTrigger value="library">Example Library</TabsTrigger>
          <TabsTrigger value="effectiveness">Effectiveness</TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="space-y-4">
          <ExampleLibrary phaseFilter={phaseFilter} />
        </TabsContent>

        <TabsContent value="effectiveness" className="space-y-4">
          <ExampleEffectiveness phaseFilter={phaseFilter} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

