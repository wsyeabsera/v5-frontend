import { Card } from '@/components/ui/card'

interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  icon?: React.ReactNode
}

export function StatsCard({ title, value, description, icon }: StatsCardProps) {
  return (
    <Card className="group relative p-4 overflow-hidden cursor-default border-border/40 dark:border-border/20 dark:bg-card/50">
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-muted-foreground mb-1.5">{title}</p>
          <h3 className="text-2xl font-bold tracking-tight mb-0.5 tabular-nums">
            {value}
          </h3>
          {description && (
            <p className="text-[11px] text-muted-foreground/80">{description}</p>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 text-muted-foreground/40 group-hover:text-accent/60 transition-colors">
            {icon}
          </div>
        )}
      </div>
    </Card>
  )
}

