'use client'

import { useState } from 'react'
import { PatternList } from './PatternList'
import { PatternDetails } from './PatternDetails'
import { PatternExtraction } from './PatternExtraction'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

export function PatternInsights() {
  const [patternTypeFilter, setPatternTypeFilter] = useState<string>('all')
  const [selectedPattern, setSelectedPattern] = useState<any>(null)

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-3 mb-6">
          <TabsTrigger value="list">Patterns</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="extraction">Extract Patterns</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center gap-4">
              <div>
                <Label htmlFor="pattern-type">Pattern Type</Label>
                <Select value={patternTypeFilter} onValueChange={setPatternTypeFilter}>
                  <SelectTrigger id="pattern-type" className="w-[200px] mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="failure">Failure</SelectItem>
                    <SelectItem value="optimization">Optimization</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
          <PatternList patternTypeFilter={patternTypeFilter} onSelect={setSelectedPattern} />
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          {selectedPattern ? (
            <PatternDetails pattern={selectedPattern} />
          ) : (
            <Card className="p-12">
              <div className="text-center text-muted-foreground">
                Select a pattern to view details
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="extraction" className="space-y-4">
          <PatternExtraction />
        </TabsContent>
      </Tabs>
    </div>
  )
}

