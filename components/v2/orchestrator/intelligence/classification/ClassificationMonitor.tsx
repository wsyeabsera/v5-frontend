'use client'

import { useState } from 'react'
import { ClassificationList } from './ClassificationList'
import { ClassificationCharts } from './ClassificationCharts'
import { ClassificationDetails } from './ClassificationDetails'
import { ClassificationTester } from './ClassificationTester'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search } from 'lucide-react'

export function ClassificationMonitor() {
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [complexityFilter, setComplexityFilter] = useState<string>('all')
  const [selectedClassification, setSelectedClassification] = useState<any>(null)

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <Tabs defaultValue="tester" className="w-full">
        <TabsList className="grid w-full max-w-3xl grid-cols-4 mb-6">
          <TabsTrigger value="tester">Test Classification</TabsTrigger>
          <TabsTrigger value="list">Classification History</TabsTrigger>
          <TabsTrigger value="charts">Analytics</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="tester" className="space-y-4">
          <ClassificationTester onClassificationComplete={setSelectedClassification} />
        </TabsContent>

        <TabsContent value="list" className="space-y-4">
          <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="search">Search</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="search"
                    placeholder="Search queries..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger id="category" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="analytical">Analytical</SelectItem>
                    <SelectItem value="creative">Creative</SelectItem>
                    <SelectItem value="procedural">Procedural</SelectItem>
                    <SelectItem value="debugging">Debugging</SelectItem>
                    <SelectItem value="generation">Generation</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="complexity">Complexity</Label>
                <Select value={complexityFilter} onValueChange={setComplexityFilter}>
                  <SelectTrigger id="complexity" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Complexities</SelectItem>
                    <SelectItem value="simple">Simple</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="complex">Complex</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
          <ClassificationList
            searchQuery={searchQuery}
            categoryFilter={categoryFilter}
            complexityFilter={complexityFilter}
            onSelect={setSelectedClassification}
          />
        </TabsContent>

        <TabsContent value="charts" className="space-y-4">
          <ClassificationCharts
            categoryFilter={categoryFilter}
            complexityFilter={complexityFilter}
          />
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          {selectedClassification ? (
            <ClassificationDetails classification={selectedClassification} />
          ) : (
            <Card className="p-12">
              <div className="text-center text-muted-foreground">
                Select a classification to view details
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

