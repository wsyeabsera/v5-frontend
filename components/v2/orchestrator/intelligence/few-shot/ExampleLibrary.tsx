'use client'

import { useState } from 'react'
import { useFewShotExamples } from '@/lib/queries-v2'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

interface ExampleLibraryProps {
  phaseFilter: string
}

export function ExampleLibrary({ phaseFilter }: ExampleLibraryProps) {
  const [query, setQuery] = useState('')
  const [searchEnabled, setSearchEnabled] = useState(false)

  const filters: any = {}
  if (phaseFilter !== 'all') {
    filters.phase = phaseFilter as 'thought' | 'plan' | 'execution' | 'summary'
  }
  if (searchEnabled && query) {
    filters.query = query
  }

  const { data: examplesData, isLoading } = useFewShotExamples(
    searchEnabled && query ? filters : undefined
  )

  const handleSearch = () => {
    if (query.trim().length > 0 && phaseFilter !== 'all') {
      setSearchEnabled(true)
    }
  }

  const examples = examplesData?.examples || []
  const canSearch = query.trim().length > 0 && phaseFilter !== 'all'

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <Card className="p-4">
        <div className="space-y-2">
          <Label htmlFor="example-query">Search Query</Label>
          <div className="flex gap-2">
            <Input
              id="example-query"
              placeholder="Enter a query to find few-shot examples..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setSearchEnabled(false)
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={!canSearch || isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
            </Button>
          </div>
          {phaseFilter === 'all' && (
            <p className="text-sm text-muted-foreground">
              Please select a phase above to search for examples
            </p>
          )}
          {phaseFilter !== 'all' && !canSearch && (
            <p className="text-sm text-muted-foreground">
              Showing examples for phase: {phaseFilter}
            </p>
          )}
        </div>
      </Card>

      {/* Examples List */}
      {isLoading && searchEnabled ? (
        <Card className="p-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
        </Card>
      ) : !searchEnabled ? (
        <Card className="p-12">
          <p className="text-center text-muted-foreground">
            Enter a query above to search for few-shot learning examples
          </p>
        </Card>
      ) : examples.length === 0 ? (
        <Card className="p-12">
          <p className="text-center text-muted-foreground">No examples found</p>
        </Card>
      ) : (
        <Card className="p-6">
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              Found {examples.length} example{examples.length !== 1 ? 's' : ''}
              {examplesData?.averageSimilarity && (
                <span className="ml-2">
                  (Avg Similarity: {(examplesData.averageSimilarity * 100).toFixed(1)}%)
                </span>
              )}
            </p>
          </div>
          <ScrollArea className="h-[600px]">
            <div className="space-y-4 pr-4">
              {examples.map((example: any, index: number) => (
                <Card key={index} className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge>Similarity: {((example.similarity || 0) * 100).toFixed(1)}%</Badge>
                      {example.confidence && (
                        <Badge variant="outline">Confidence: {example.confidence}%</Badge>
                      )}
                      {example.quality && (
                        <Badge variant="secondary">Quality: {example.quality}%</Badge>
                      )}
                    </div>
                    <p className="font-medium">{example.query || 'No query'}</p>
                    {example.thought && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Thought:</p>
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {typeof example.thought === 'string'
                            ? example.thought
                            : JSON.stringify(example.thought)}
                        </p>
                      </div>
                    )}
                    {example.plan && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Plan:</p>
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {typeof example.plan === 'string'
                            ? example.plan
                            : JSON.stringify(example.plan)}
                        </p>
                      </div>
                    )}
                    {example.execution && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Execution:</p>
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {typeof example.execution === 'string'
                            ? example.execution
                            : JSON.stringify(example.execution)}
                        </p>
                      </div>
                    )}
                    {example.summary && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Summary:</p>
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {typeof example.summary === 'string'
                            ? example.summary
                            : JSON.stringify(example.summary)}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </Card>
      )}
    </div>
  )
}

