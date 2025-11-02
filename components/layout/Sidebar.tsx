'use client'

import { Home, MessageSquare, Settings, ChevronLeft, ChevronRight, List } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Chat', href: '/chat', icon: MessageSquare },
  { name: 'Requests', href: '/requests', icon: List },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

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
        <nav className={`flex-1 space-y-0.5 ${collapsed ? 'px-1.5 py-3' : 'px-2 py-3'}`}>
          {navigation.map((item) => {
            const isActive = pathname === item.href
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

