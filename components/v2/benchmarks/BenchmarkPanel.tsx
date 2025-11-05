'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BenchmarkTestList } from './BenchmarkTestList'
import { BenchmarkTestDialog } from './BenchmarkTestDialog'
import { BenchmarkResults } from './BenchmarkResults'
import { RegressionAlerts } from './RegressionAlerts'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export function BenchmarkPanel() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  return (
    <div className="space-y-6">
      <Tabs defaultValue="tests" className="w-full">
        <div className="flex items-center justify-between mb-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="tests">Tests</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="regressions">Regressions</TabsTrigger>
          </TabsList>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Test
          </Button>
        </div>

        <TabsContent value="tests" className="mt-0">
          <BenchmarkTestList />
        </TabsContent>

        <TabsContent value="results" className="mt-0">
          <BenchmarkResults />
        </TabsContent>

        <TabsContent value="metrics" className="mt-0">
          <div className="text-center py-12 text-muted-foreground">
            <p>Performance metrics visualization coming soon</p>
          </div>
        </TabsContent>

        <TabsContent value="regressions" className="mt-0">
          <RegressionAlerts />
        </TabsContent>
      </Tabs>

      <BenchmarkTestDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  )
}

