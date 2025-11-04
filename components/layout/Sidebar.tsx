'use client'

import { Home, MessageSquare, Settings, ChevronLeft, ChevronRight, List, Sparkles, Database, Cpu, Brain, GraduationCap, ListChecks, ShieldCheck, Play, ChevronDown, FileText, BarChart } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

const navigation = [
  {
    group: 'Main',
    items: [
      { name: 'Dashboard', href: '/', icon: Home },
      { name: 'Chat', href: '/chat', icon: MessageSquare },
      { name: 'Requests', href: '/requests', icon: List },
    ]
  },
  {
    group: 'Agent Pipeline',
    items: [
      { name: 'Complexity Detector', href: '/agents/complexity-detector', icon: Sparkles },
      { name: 'Thought Agent', href: '/agents/thought-agent', icon: Brain },
      { name: 'Planner Agent', href: '/agents/planner-agent', icon: ListChecks },
      { name: 'Critic Agent', href: '/agents/critic-agent', icon: ShieldCheck },
      { name: 'Confidence Scorer', href: '/agents/confidence-scorer', icon: BarChart },
      { name: 'Executor Agent', href: '/agents/executor-agent', icon: Play },
      { name: 'Summary Agent', href: '/agents/summary-agent', icon: FileText },
    ]
  },
  {
    group: 'Training Data',
    items: [
      { name: 'Complexity Examples', href: '/agents/complexity-examples', icon: Database },
      { name: 'Thought Examples', href: '/agents/thought-examples', icon: GraduationCap },
      { name: 'Planner Examples', href: '/agents/planner-examples', icon: ListChecks },
    ]
  },
  {
    group: 'System',
    items: [
      { name: 'Base Agent', href: '/agents/base-agent', icon: Cpu },
      { name: 'Settings', href: '/settings', icon: Settings },
    ]
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  
  // Initialize group states from localStorage
  const [groupStates, setGroupStates] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {}
    const saved = localStorage.getItem('sidebar-group-states')
    return saved ? JSON.parse(saved) : {}
  })

  // Save group states to localStorage when they change
  useEffect(() => {
    localStorage.setItem('sidebar-group-states', JSON.stringify(groupStates))
  }, [groupStates])

  const toggleGroup = (groupName: string) => {
    setGroupStates(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }))
  }

  return (
    <div
      className={`fixed left-0 top-0 z-40 h-screen bg-sidebar/95 backdrop-blur-xl transition-all duration-300 border-r border-sidebar-border/50 ${
        collapsed ? 'w-12' : 'w-56'
      }`}
    >
      <div className="flex h-full flex-col">
        {/* Logo/Brand */}
        <div className={`flex h-12 items-center ${collapsed ? 'justify-center px-2' : 'px-4'} border-b border-sidebar-border/30`}>
          {!collapsed && (
            <h1 className="text-sm font-semibold tracking-tight text-sidebar-foreground">
              Clear AI
            </h1>
          )}
          {collapsed && (
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-primary text-xs font-bold">
              C
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className={`flex-1 space-y-0.5 ${collapsed ? 'px-1.5 py-3' : 'px-2 py-3'} overflow-y-auto`}>
          {navigation.map((group) => {
            const isOpen = collapsed ? false : (groupStates[group.group] !== false)
            
            return (
              <Collapsible
                key={group.group}
                open={isOpen}
                onOpenChange={() => !collapsed && toggleGroup(group.group)}
              >
                {!collapsed && (
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors">
                    <span>{group.group}</span>
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                  </CollapsibleTrigger>
                )}
                <CollapsibleContent>
                  <div className="space-y-0.5 mt-0.5">
                    {group.items.map((item) => {
                      const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                      const Icon = item.icon

                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          className={`group relative flex items-center rounded-md text-sm font-medium transition-all ${
                            collapsed ? 'justify-center px-2 py-2' : 'gap-2.5 px-2.5 py-1.5'
                          } ${
                            isActive
                              ? 'text-accent'
                              : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-border/30'
                          }`}
                          title={collapsed ? item.name : undefined}
                        >
                          {isActive && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-accent rounded-full" />
                          )}
                          <Icon className={`flex-shrink-0 ${collapsed ? 'h-4 w-4' : 'h-[18px] w-[18px]'} ${isActive ? 'text-accent' : 'group-hover:text-accent/80'}`} />
                          {!collapsed && <span>{item.name}</span>}
                        </Link>
                      )
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )
          })}
        </nav>

        {/* Footer */}
        <div className={`border-t border-sidebar-border/30 ${collapsed ? 'p-1.5' : 'p-2'} space-y-1`}>
          {/* Theme Toggle */}
          <div className={`${collapsed ? 'flex justify-center' : ''}`}>
            <ThemeToggle collapsed={collapsed} />
          </div>

          {/* Collapse Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className={`w-full h-8 hover:bg-sidebar-border/30 ${collapsed ? 'px-2' : 'justify-start px-2.5'}`}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <>
                <ChevronLeft className="h-3.5 w-3.5 mr-2" />
                <span className="text-xs">Collapse</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

