'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { useRecentActivity } from '@/lib/queries'
import { CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react'

function formatRelativeTime(date: string) {
  const now = new Date()
  const then = new Date(date)
  const diff = now.getTime() - then.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export function ActivityFeed() {
  const { data: activity, isLoading } = useRecentActivity()

  if (isLoading || !activity) {
    return (
      <div className="border-t border-border/40 dark:border-border/20 pt-6">
        <h3 className="mb-4">Recent Activity</h3>
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <Clock className="w-3.5 h-3.5 animate-pulse" />
          <span>Loading activity...</span>
        </div>
      </div>
    )
  }

  const allActivities: Array<{
    id: string
    type: string
    accepted?: boolean
    item?: string
    facility: string
    material?: string
    level?: string
    time: string
  }> = []

  if (activity.recentInspections) {
    activity.recentInspections.slice(0, 5).forEach((inspection: any) => {
      allActivities.push({
        id: inspection._id,
        type: 'inspection',
        accepted: inspection.is_delivery_accepted,
        facility: inspection.facility_id?.name || 'Unknown Facility',
        time: inspection.createdAt,
      })
    })
  }

  if (activity.recentContaminants) {
    activity.recentContaminants.slice(0, 5).forEach((contaminant: any) => {
      allActivities.push({
        id: contaminant._id,
        type: 'contaminant',
        item: contaminant.wasteItemDetected,
        facility: contaminant.facility_id?.name || 'Unknown Facility',
        material: contaminant.material,
        level: contaminant.explosive_level,
        time: contaminant.detection_time || contaminant.createdAt,
      })
    })
  }

  allActivities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

  return (
    <div className="border-t border-border/40 dark:border-border/20 pt-6">
      <h3 className="mb-4">Recent Activity</h3>
      
      <ScrollArea className="h-[400px]">
        <div className="space-y-0.5">
          {allActivities.slice(0, 10).map((item: any) => (
            <div
              key={item.id}
              className="group relative flex gap-3 py-2.5 px-3 rounded-md hover:bg-muted/30 transition-colors cursor-default"
            >
              {/* Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {item.type === 'inspection' ? (
                  item.accepted ? (
                    <CheckCircle className="w-3.5 h-3.5 text-green-600/80" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-red-600/80" />
                  )
                ) : (
                  <AlertTriangle className={`w-3.5 h-3.5 ${
                    item.level === 'high' ? 'text-red-600/80' : 'text-yellow-600/80'
                  }`} />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {item.type === 'inspection' ? (
                      <>
                        <p className="text-[13px] font-medium">
                          {item.accepted ? 'Inspection passed' : 'Inspection failed'}
                        </p>
                        <p className="text-[12px] text-muted-foreground truncate">
                          {item.facility}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-[13px] font-medium truncate">
                          {item.item}
                        </p>
                        <p className="text-[12px] text-muted-foreground truncate">
                          {item.facility} • {item.material}
                        </p>
                      </>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground/70 whitespace-nowrap">
                    {formatRelativeTime(item.time)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

