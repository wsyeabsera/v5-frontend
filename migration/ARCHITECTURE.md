# Backend Migration Architecture

## Overview

Migrate agent APIs from Next.js routes to a dedicated backend service with RabbitMQ event-driven communication and WebSocket streaming.

## Current Architecture

```
Frontend → Next.js API Routes → Agent Classes → MongoDB
```

**Problems:**
- No real-time updates
- Manual agent chaining in frontend
- Long operations block until complete
- No cancellation capability

## Target Architecture

```
Frontend ←WebSocket→ Backend Service
                    ↓
                RabbitMQ
                    ↓
        Agent Services (publish/subscribe)
                    ↓
                MongoDB
```

## Components

### 1. Backend Service
- Node.js/Express or similar
- WebSocket server (Socket.io or native)
- RabbitMQ client
- MongoDB client
- Agent service registry

### 2. RabbitMQ Event Bus
- Topic exchange: `agent.events`
- Routing keys: `agent.action.status` (e.g., `thought.completed`, `executor.step.progress`)
- Durable queues for each agent
- Message persistence for reliability

### 3. Agent Services
- Each agent is an independent service
- Subscribes to relevant events
- Publishes events on completion
- Processes asynchronously

### 4. WebSocket Server
- Maintains client connections
- Subscribes to progress events
- Streams updates to frontend
- Handles client commands (cancel, etc.)

## Communication Flow

### Agent Chain Flow

```
1. Complexity Detector completes
   → Publishes: { type: "complexity.completed", requestId, data }

2. Thought Agent subscribes to "complexity.completed"
   → Processes → Publishes: { type: "thought.completed", requestId, data }

3. Planner Agent subscribes to "thought.completed"
   → Processes → Publishes: { type: "plan.completed", requestId, data }

4. Critic Agent subscribes to "plan.completed"
   → Processes → Publishes: { type: "critique.completed", requestId, data }

5. Executor Agent subscribes to "critique.completed"
   → Processes → Publishes: { type: "executor.step.progress", requestId, step, data }
```

### Frontend Flow

```
1. User triggers request
   → WebSocket: { type: "start", requestId, userQuery }

2. Backend receives → Publishes to RabbitMQ: { type: "request.started", requestId }

3. Agents process → Publish progress events

4. WebSocket server subscribes to progress events
   → Streams to frontend: { type: "progress", agent, step, status }

5. Frontend updates UI in real-time
```

## Benefits

- **Real-time updates**: Frontend sees progress as it happens
- **Automatic chaining**: Agents trigger each other via events
- **Reliability**: RabbitMQ ensures message delivery
- **Scalability**: Agents can run on different machines
- **Cancellation**: Can stop operations mid-execution
- **Debugging**: Can replay events for troubleshooting

## Deployment

**Option 1: Separate Service**
- Backend service on separate port (e.g., 3001)
- Next.js frontend on 3000
- Both connect to RabbitMQ and MongoDB

**Option 2: Same Server**
- Backend service as Next.js API route handler
- WebSocket upgrade on same port
- Shared MongoDB connection

**Recommendation**: Start with Option 2 (easier migration), move to Option 1 later if needed.

