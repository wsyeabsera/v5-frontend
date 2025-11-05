'use client'

import { TaskList } from '@/components/v2/tasks/TaskList'
import { ListTodo } from 'lucide-react'

export default function TasksPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8 space-y-2">
        <div className="flex items-center gap-3">
          <ListTodo className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">Task Management</h1>
        </div>
        <p className="text-muted-foreground">
          View and manage task executions from plan execution.
        </p>
      </div>

      <TaskList />
    </div>
  )
}

