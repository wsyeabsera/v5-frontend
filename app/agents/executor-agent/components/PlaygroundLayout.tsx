'use client'

import { ReactNode } from 'react'
import { Card } from '@/components/ui/card'

interface PlaygroundLayoutProps {
  leftPanel: ReactNode
  centerPanel: ReactNode
  rightPanel: ReactNode
  bottomPanel: ReactNode
}

export function PlaygroundLayout({
  leftPanel,
  centerPanel,
  rightPanel,
  bottomPanel,
}: PlaygroundLayoutProps) {
  return (
    <div className="h-[calc(100vh-180px)] flex flex-col gap-4">
      {/* Three-Panel Layout */}
      <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
        {/* Left Panel: Plan & Control (3 columns) */}
        <div className="col-span-12 lg:col-span-3 overflow-y-auto pr-2">
          {leftPanel}
        </div>

        {/* Center Panel: Live Execution Monitor (6 columns) */}
        <div className="col-span-12 lg:col-span-6 overflow-y-auto pr-2">
          {centerPanel}
        </div>

        {/* Right Panel: LLM Reasoning (3 columns) */}
        <div className="col-span-12 lg:col-span-3 overflow-y-auto pr-2">
          {rightPanel}
        </div>
      </div>

      {/* Bottom Panel: Execution Log (Full Width) */}
      <div className="h-[300px] flex-shrink-0">
        {bottomPanel}
      </div>
    </div>
  )
}

