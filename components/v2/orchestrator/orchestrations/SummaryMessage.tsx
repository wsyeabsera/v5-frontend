'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Code2, FileJson, Bot } from 'lucide-react'

interface SummaryMessageProps {
  content: string
}

/**
 * Detects if content is JSON and extracts the summary text
 */
function detectAndExtractSummary(content: string): {
  isJson: boolean
  summaryText: string
  jsonData?: any
} {
  try {
    const parsed = JSON.parse(content)
    
    if (parsed?.result?.result?.summary) {
      return {
        isJson: false,
        summaryText: parsed.result.result.summary,
        jsonData: parsed,
      }
    }
    
    if (parsed?.result?.summary) {
      return {
        isJson: false,
        summaryText: parsed.result.summary,
        jsonData: parsed,
      }
    }
    
    if (parsed?.summary && typeof parsed.summary === 'string') {
      return {
        isJson: false,
        summaryText: parsed.summary,
        jsonData: parsed,
      }
    }
    
    return {
      isJson: true,
      summaryText: content,
      jsonData: parsed,
    }
  } catch {
    return {
      isJson: false,
      summaryText: content,
    }
  }
}

/**
 * Custom code component for ReactMarkdown
 */
function CodeBlock({ children, className, ...props }: any) {
  const match = /language-(\w+)/.exec(className || '')
  const language = match ? match[1] : ''
  const code = String(children).replace(/\n$/, '')
  const isJsonLanguage = language === 'json'
  const looksLikeJson = !language && (code.trim().startsWith('{') || code.trim().startsWith('['))
  
  if (isJsonLanguage || looksLikeJson) {
    try {
      const parsed = JSON.parse(code)
      return (
        <Card className="my-3 border overflow-hidden">
          <div className="flex items-center gap-2 p-2 border-b bg-muted/50">
            <FileJson className="w-3.5 h-3.5 text-primary" />
            <Badge variant="outline" className="text-xs">JSON</Badge>
          </div>
          <pre className="p-3 overflow-x-auto bg-muted/30 text-xs font-mono max-h-[400px] overflow-y-auto">
            <code>{JSON.stringify(parsed, null, 2)}</code>
          </pre>
        </Card>
      )
    } catch {
      // Not valid JSON, render as code
    }
  }
  
  return (
    <Card className="my-3 border overflow-hidden">
      <div className="flex items-center gap-2 p-2 border-b bg-muted/50">
        <Code2 className="w-3.5 h-3.5 text-primary" />
        {language && <Badge variant="outline" className="text-xs">{language}</Badge>}
      </div>
      <pre className="p-3 overflow-x-auto bg-muted/30 text-xs font-mono max-h-[400px] overflow-y-auto">
        <code className={className} {...props}>
          {code}
        </code>
      </pre>
    </Card>
  )
}

export function SummaryMessage({ content }: SummaryMessageProps) {
  const { isJson, summaryText } = React.useMemo(
    () => detectAndExtractSummary(content),
    [content]
  )

  // If it's pure JSON, display it as formatted JSON
  if (isJson) {
    try {
      const parsed = JSON.parse(content)
      return (
        <Card className="p-4 bg-card border rounded-2xl rounded-bl-md shadow-sm">
          <div className="flex items-start gap-2">
            <Bot className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <FileJson className="w-3.5 h-3.5 text-primary" />
                <Badge variant="outline" className="text-xs">JSON Summary</Badge>
              </div>
              <pre className="text-xs font-mono bg-muted/50 p-3 rounded overflow-x-auto max-h-[400px] overflow-y-auto">
                {JSON.stringify(parsed, null, 2)}
              </pre>
            </div>
          </div>
        </Card>
      )
    } catch {
      // Fall through to markdown rendering
    }
  }

  // Display Markdown with proper styling
  return (
    <Card className="p-4 bg-card border rounded-2xl rounded-bl-md shadow-sm">
      <div className="flex items-start gap-2">
        <Bot className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
        <div className="flex-1 prose prose-sm dark:prose-invert max-w-none
          prose-headings:font-semibold prose-headings:tracking-tight prose-headings:mt-4 prose-headings:mb-2
          prose-h1:text-xl prose-h1:mb-3 prose-h1:mt-2 prose-h1:border-b prose-h1:border-border prose-h1:pb-2
          prose-h2:text-lg prose-h2:mb-2 prose-h2:mt-3 prose-h2:text-primary
          prose-h3:text-base prose-h3:mb-1.5 prose-h3:mt-2
          prose-p:leading-6 prose-p:mb-2 prose-p:text-foreground prose-p:text-sm
          prose-strong:font-semibold prose-strong:text-foreground
          prose-em:italic prose-em:text-foreground
          prose-code:font-mono prose-code:text-xs prose-code:bg-muted prose-code:text-foreground
          prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-[''] prose-code:after:content-['']
          prose-pre:bg-transparent prose-pre:border-0 prose-pre:p-0 prose-pre:my-0
          prose-pre code:bg-transparent prose-pre code:p-0 prose-pre code:before:content-[''] prose-pre code:after:content-['']
          prose-blockquote:border-l-2 prose-blockquote:border-primary prose-blockquote:pl-3 prose-blockquote:pr-2 prose-blockquote:py-1 prose-blockquote:my-2
          prose-blockquote:bg-muted/50 prose-blockquote:rounded-r prose-blockquote:italic prose-blockquote:text-sm
          prose-a:text-primary prose-a:font-medium prose-a:underline-offset-2 hover:prose-a:underline prose-a:decoration-1 prose-a:text-xs
          prose-ul:list-disc prose-ul:pl-4 prose-ul:my-2 prose-ul:space-y-1 prose-ul:text-sm
          prose-ol:list-decimal prose-ol:pl-4 prose-ol:my-2 prose-ol:space-y-1 prose-ol:text-sm
          prose-li:my-0.5 prose-li:leading-6 prose-li:text-sm
          prose-hr:border-border prose-hr:my-3
          prose-table:w-full prose-table:my-2 prose-table:border-collapse prose-table:text-xs
          prose-th:bg-muted prose-th:border prose-th:border-border prose-th:p-2 prose-th:text-left prose-th:font-semibold prose-th:text-xs
          prose-td:border prose-td:border-border prose-td:p-2 prose-td:text-xs">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, className, children, ...props }: any) {
                const inline = (props as any).inline
                if (inline) {
                  return (
                    <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono" {...props}>
                      {children}
                    </code>
                  )
                }
                return <CodeBlock className={className} {...props}>{children}</CodeBlock>
              },
            }}
          >
            {summaryText}
          </ReactMarkdown>
        </div>
      </div>
    </Card>
  )
}

