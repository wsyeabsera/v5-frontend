'use client'

import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { JsonViewer } from '@/components/ui/json-viewer'

interface SummaryContentViewProps {
  content: string
  className?: string
}

/**
 * Detects if content is JSON and extracts the summary text
 */
function detectAndExtractSummary(content: string): {
  isJson: boolean
  summaryText: string
  jsonData?: any
} {
  // Try to parse as JSON
  try {
    const parsed = JSON.parse(content)
    
    // Check if it's a nested result structure (result.result.summary)
    if (parsed?.result?.result?.summary) {
      return {
        isJson: false, // The summary is markdown, not JSON
        summaryText: parsed.result.result.summary,
        jsonData: parsed,
      }
    }
    
    // Check if it's result.summary
    if (parsed?.result?.summary) {
      return {
        isJson: false, // The summary is markdown, not JSON
        summaryText: parsed.result.summary,
        jsonData: parsed,
      }
    }
    
    // Check if it's a direct summary property
    if (parsed?.summary && typeof parsed.summary === 'string') {
      return {
        isJson: false,
        summaryText: parsed.summary,
        jsonData: parsed,
      }
    }
    
    // If it's valid JSON but no summary found, treat as JSON to display
    return {
      isJson: true,
      summaryText: content,
      jsonData: parsed,
    }
  } catch {
    // Not JSON, treat as markdown
    return {
      isJson: false,
      summaryText: content,
    }
  }
}

export function SummaryContentView({ content, className = '' }: SummaryContentViewProps) {
  const { isJson, summaryText, jsonData } = useMemo(
    () => detectAndExtractSummary(content),
    [content]
  )

  if (isJson) {
    // Display JSON using JsonViewer
    return (
      <div className={`flex-1 overflow-y-auto p-6 bg-background ${className}`}>
        <div className="max-w-5xl mx-auto">
          <JsonViewer
            data={jsonData || JSON.parse(content)}
            collapsible={true}
            defaultExpanded={true}
            searchable={true}
            showCopyButton={true}
            maxHeight="100%"
          />
        </div>
      </div>
    )
  }

  // Display Markdown
  return (
    <div className={`flex-1 overflow-y-auto min-h-0 p-8 bg-background ${className}`}>
      <div className="max-w-4xl mx-auto prose prose-base dark:prose-invert 
        prose-headings:font-bold prose-headings:tracking-tight prose-headings:scroll-mt-8
        prose-h1:text-3xl prose-h1:mb-4 prose-h1:mt-8 prose-h1:border-b prose-h1:border-border prose-h1:pb-3
        prose-h2:text-2xl prose-h2:mb-3 prose-h2:mt-6 prose-h2:text-primary
        prose-h3:text-xl prose-h3:mb-2 prose-h3:mt-4
        prose-h4:text-lg prose-h4:mb-2 prose-h4:mt-4
        prose-p:leading-7 prose-p:mb-4 prose-p:text-foreground
        prose-strong:font-semibold prose-strong:text-foreground
        prose-em:italic prose-em:text-foreground
        prose-code:font-mono prose-code:text-sm prose-code:bg-muted prose-code:text-foreground
        prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-[''] prose-code:after:content-['']
        prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-lg
        prose-pre:p-4 prose-pre:overflow-x-auto prose-pre:my-4
        prose-pre code:bg-transparent prose-pre code:p-0 prose-pre code:before:content-[''] prose-pre code:after:content-['']
        prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-6 prose-blockquote:pr-4 prose-blockquote:py-2 prose-blockquote:my-4
        prose-blockquote:bg-muted/50 prose-blockquote:rounded-r-lg prose-blockquote:italic
        prose-a:text-primary prose-a:font-medium prose-a:underline-offset-4 hover:prose-a:underline prose-a:decoration-2
        prose-ul:list-disc prose-ul:pl-6 prose-ul:my-4 prose-ul:space-y-2
        prose-ol:list-decimal prose-ol:pl-6 prose-ol:my-4 prose-ol:space-y-2
        prose-li:my-1 prose-li:leading-7
        prose-hr:border-border prose-hr:my-8
        prose-table:w-full prose-table:my-4 prose-table:border-collapse
        prose-th:bg-muted prose-th:border prose-th:border-border prose-th:p-3 prose-th:text-left prose-th:font-semibold
        prose-td:border prose-td:border-border prose-td:p-3
        prose-img:rounded-lg prose-img:shadow-md prose-img:my-4
        prose-figure:my-4">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {summaryText}
        </ReactMarkdown>
      </div>
    </div>
  )
}

