'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronUp, Copy, Check, Download, FileText } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

interface FullOutputProps {
  testRun: any
  execution?: any
}

export function FullOutput({ testRun, execution }: FullOutputProps) {
  const [copied, setCopied] = useState<string | null>(null)

  if (!testRun) return null

  const run = testRun?.data || testRun
  const exec = execution?.data || execution
  const firstResult = run.results?.[0]

  const handleCopy = async (text: string, section: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(section)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleExport = (format: 'json' | 'text') => {
    const data = {
      testRun: run,
      execution: exec,
      timestamp: new Date().toISOString(),
    }

    let content: string
    let filename: string
    let mimeType: string

    if (format === 'json') {
      content = JSON.stringify(data, null, 2)
      filename = `test-run-${run.runId}-${Date.now()}.json`
      mimeType = 'application/json'
    } else {
      content = `Test Run: ${run.runId}\n` +
        `Status: ${run.status}\n` +
        `Started: ${new Date(run.startedAt).toLocaleString()}\n` +
        `Completed: ${run.completedAt ? new Date(run.completedAt).toLocaleString() : 'N/A'}\n\n` +
        `Summary:\n${JSON.stringify(run.summary, null, 2)}\n\n` +
        `Execution Results:\n${JSON.stringify(exec?.results || {}, null, 2)}\n\n` +
        `Full Execution Data:\n${JSON.stringify(exec || {}, null, 2)}`
      filename = `test-run-${run.runId}-${Date.now()}.txt`
      mimeType = 'text/plain'
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6" />
          <h3 className="text-2xl font-bold">Full Output</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('json')}
          >
            <Download className="w-4 h-4 mr-2" />
            Export JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('text')}
          >
            <Download className="w-4 h-4 mr-2" />
            Export Text
          </Button>
        </div>
      </div>

      <Accordion type="multiple" className="w-full">
        {/* Test Run Details */}
        <AccordionItem value="test-run">
          <AccordionTrigger>
            <div className="flex items-center justify-between w-full pr-4">
              <span className="font-semibold">Test Run Details</span>
              <Badge variant="outline">{run.status}</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium mb-2">Run Information</div>
                <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto">
                  {JSON.stringify(
                    {
                      runId: run.runId,
                      status: run.status,
                      startedAt: run.startedAt,
                      completedAt: run.completedAt,
                      summary: run.summary,
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  handleCopy(
                    JSON.stringify(run, null, 2),
                    'test-run'
                  )
                }
              >
                {copied === 'test-run' ? (
                  <>
                    <Check className="w-4 h-4 mr-2 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Execution Results */}
        {exec && (
          <AccordionItem value="execution">
            <AccordionTrigger>
              <div className="flex items-center justify-between w-full pr-4">
                <span className="font-semibold">Orchestrator Execution</span>
                <Badge variant="outline">{exec.status}</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium mb-2">Execution Data</div>
                  <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto max-h-[400px] overflow-y-auto">
                    {JSON.stringify(exec, null, 2)}
                  </pre>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    handleCopy(JSON.stringify(exec, null, 2), 'execution')
                  }
                >
                  {copied === 'execution' ? (
                    <>
                      <Check className="w-4 h-4 mr-2 text-green-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Phase Results */}
        {exec?.results && (
          <>
            {exec.results.thought && (
              <AccordionItem value="thought">
                <AccordionTrigger>
                  <span className="font-semibold">Thought Phase Output</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto max-h-[400px] overflow-y-auto whitespace-pre-wrap">
                      {typeof exec.results.thought === 'string'
                        ? exec.results.thought
                        : JSON.stringify(exec.results.thought, null, 2)}
                    </pre>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        handleCopy(
                          typeof exec.results.thought === 'string'
                            ? exec.results.thought
                            : JSON.stringify(exec.results.thought, null, 2),
                          'thought'
                        )
                      }
                    >
                      {copied === 'thought' ? (
                        <>
                          <Check className="w-4 h-4 mr-2 text-green-600" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {exec.results.plan && (
              <AccordionItem value="plan">
                <AccordionTrigger>
                  <span className="font-semibold">Plan Phase Output</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto max-h-[400px] overflow-y-auto">
                      {JSON.stringify(exec.results.plan, null, 2)}
                    </pre>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        handleCopy(
                          JSON.stringify(exec.results.plan, null, 2),
                          'plan'
                        )
                      }
                    >
                      {copied === 'plan' ? (
                        <>
                          <Check className="w-4 h-4 mr-2 text-green-600" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {exec.results.execution && (
              <AccordionItem value="execution-phase">
                <AccordionTrigger>
                  <span className="font-semibold">Execution Phase Output</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto max-h-[400px] overflow-y-auto">
                      {JSON.stringify(exec.results.execution, null, 2)}
                    </pre>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        handleCopy(
                          JSON.stringify(exec.results.execution, null, 2),
                          'execution-phase'
                        )
                      }
                    >
                      {copied === 'execution-phase' ? (
                        <>
                          <Check className="w-4 h-4 mr-2 text-green-600" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {exec.results.summary && (
              <AccordionItem value="summary">
                <AccordionTrigger>
                  <span className="font-semibold">Summary Phase Output</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto max-h-[400px] overflow-y-auto whitespace-pre-wrap">
                      {typeof exec.results.summary === 'string'
                        ? exec.results.summary
                        : JSON.stringify(exec.results.summary, null, 2)}
                    </pre>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        handleCopy(
                          typeof exec.results.summary === 'string'
                            ? exec.results.summary
                            : JSON.stringify(exec.results.summary, null, 2),
                          'summary'
                        )
                      }
                    >
                      {copied === 'summary' ? (
                        <>
                          <Check className="w-4 h-4 mr-2 text-green-600" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
          </>
        )}

        {/* Test Result Details */}
        {firstResult && (
          <AccordionItem value="test-result">
            <AccordionTrigger>
              <div className="flex items-center justify-between w-full pr-4">
                <span className="font-semibold">Test Result Details</span>
                <Badge
                  variant={
                    firstResult.status === 'passed'
                      ? 'default'
                      : firstResult.status === 'failed'
                      ? 'destructive'
                      : 'outline'
                  }
                >
                  {firstResult.status}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto max-h-[400px] overflow-y-auto">
                  {JSON.stringify(firstResult, null, 2)}
                </pre>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    handleCopy(JSON.stringify(firstResult, null, 2), 'test-result')
                  }
                >
                  {copied === 'test-result' ? (
                    <>
                      <Check className="w-4 h-4 mr-2 text-green-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </Card>
  )
}

