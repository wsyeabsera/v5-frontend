# Dashboard with Real-Time Updates

## Overview

Build a dashboard showing live stats and activity feed using WebSocket.

## File: `lib/websocket.ts`

```typescript
'use client';

import { io, Socket } from 'socket.io-client';
import { useEffect, useState } from 'react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

export function useWebSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socketInstance = io(BACKEND_URL);

    socketInstance.on('connect', () => {
      console.log('[WebSocket] Connected');
      setConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('[WebSocket] Disconnected');
      setConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return { socket, connected };
}

export function useActivityFeed() {
  const { socket } = useWebSocket();
  const [activity, setActivity] = useState<any>(null);

  useEffect(() => {
    if (!socket) return;

    socket.emit('subscribe:activity');

    socket.on('activity:update', (data) => {
      setActivity(data.data);
    });

    return () => {
      socket.off('activity:update');
    };
  }, [socket]);

  return activity;
}

export function useStats() {
  const { socket } = useWebSocket();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (!socket) return;

    socket.emit('subscribe:stats');

    socket.on('stats:update', (data) => {
      setStats(data.data);
    });

    return () => {
      socket.off('stats:update');
    };
  }, [socket]);

  return stats;
}
```

## File: `components/dashboard/StatsCard.tsx`

```typescript
import { Card } from '@/components/ui/card';

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
}

export function StatsCard({ title, value, description, icon }: StatsCardProps) {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <h3 className="text-3xl font-bold mt-2">{value}</h3>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
    </Card>
  );
}
```

## File: `components/dashboard/ActivityFeed.tsx`

```typescript
'use client';

import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useActivityFeed } from '@/lib/websocket';

export function ActivityFeed() {
  const activity = useActivityFeed();

  if (!activity) {
    return (
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Recent Activity</h3>
        <p className="text-sm text-muted-foreground">Loading activity...</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-4">Recent Activity</h3>
      
      <ScrollArea className="h-[400px]">
        <div className="space-y-4">
          {/* Recent Inspections */}
          <div>
            <h4 className="text-sm font-medium mb-2">Recent Inspections</h4>
            {activity.recentInspections?.slice(0, 5).map((inspection: any) => (
              <div key={inspection._id} className="text-sm py-2 border-b">
                <div className="flex justify-between">
                  <span className="font-medium">
                    {inspection.facility_id?.name}
                  </span>
                  <span className={inspection.is_delivery_accepted ? 'text-green-600' : 'text-red-600'}>
                    {inspection.is_delivery_accepted ? '✓ Accepted' : '✗ Rejected'}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(inspection.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          {/* Recent Contaminants */}
          <div>
            <h4 className="text-sm font-medium mb-2">Recent Contaminants</h4>
            {activity.recentContaminants?.slice(0, 5).map((contaminant: any) => (
              <div key={contaminant._id} className="text-sm py-2 border-b">
                <div className="font-medium">{contaminant.wasteItemDetected}</div>
                <div className="text-xs text-muted-foreground">
                  {contaminant.facility_id?.name} • {contaminant.material}
                </div>
                <div className="text-xs mt-1">
                  <span className={`mr-2 ${contaminant.explosive_level === 'high' ? 'text-red-600' : ''}`}>
                    💥 {contaminant.explosive_level}
                  </span>
                  <span className={contaminant.hcl_level === 'high' ? 'text-red-600' : ''}>
                    🧪 {contaminant.hcl_level}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
    </Card>
  );
}
```

## Page: `app/page.tsx`

```typescript
'use client';

import { StatsCard } from '@/components/dashboard/StatsCard';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { useStats } from '@/lib/websocket';
import { Building, Package, AlertTriangle, CheckCircle } from 'lucide-react';

export default function Home() {
  const stats = useStats();

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-4xl font-bold mb-8">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          title="Facilities"
          value={stats?.overview.facilities || 0}
          icon={<Building className="w-6 h-6" />}
        />
        <StatsCard
          title="Shipments"
          value={stats?.overview.shipments || 0}
          icon={<Package className="w-6 h-6" />}
        />
        <StatsCard
          title="Contaminants"
          value={stats?.overview.contaminants || 0}
          icon={<AlertTriangle className="w-6 h-6" />}
        />
        <StatsCard
          title="Acceptance Rate"
          value={stats?.metrics.overallAcceptanceRate || '0%'}
          description="Last 30 days"
          icon={<CheckCircle className="w-6 h-6" />}
        />
      </div>

      {/* Activity Feed */}
      <ActivityFeed />
    </div>
  );
}
```

## Next Blueprint

Read `04-STATE-MANAGEMENT.md`

