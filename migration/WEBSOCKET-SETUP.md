# WebSocket Setup Guide

## Purpose

Stream real-time progress updates from agents to frontend, handle client commands (cancel, etc.).

## Connection Management

### Server Setup

```typescript
// WebSocket server (Socket.io or native)
const io = new Server(server, {
  cors: { origin: "*" } // Configure properly
});

// Connection handling
io.on('connection', (socket) => {
  const requestId = socket.handshake.query.requestId;
  
  // Join room for this request
  socket.join(`request:${requestId}`);
  
  // Subscribe to RabbitMQ progress events
  subscribeToProgress(requestId, (event) => {
    socket.emit('progress', event);
  });
  
  // Handle client commands
  socket.on('cancel', async (data) => {
    await cancelRequest(data.requestId);
  });
  
  socket.on('disconnect', () => {
    // Cleanup
  });
});
```

### Client Connection

```typescript
// Frontend WebSocket client
const socket = io('ws://localhost:3001', {
  query: { requestId: 'req-123' }
});

// Listen for progress
socket.on('progress', (event) => {
  updateUI(event);
});

// Send commands
socket.emit('cancel', { requestId: 'req-123' });
```

## Message Types

### Server → Client

**Progress Update:**
```typescript
{
  type: 'progress',
  agent: 'executor-agent',
  step: 1,
  status: 'running' | 'completed' | 'failed',
  data: { ... }
}
```

**Agent Completed:**
```typescript
{
  type: 'agent.completed',
  agent: 'thought-agent',
  requestId: 'req-123',
  data: { ... }
}
```

**Error:**
```typescript
{
  type: 'error',
  agent: 'executor-agent',
  message: 'Error message',
  step?: 1
}
```

**Request Completed:**
```typescript
{
  type: 'request.completed',
  requestId: 'req-123',
  result: { ... }
}
```

### Client → Server

**Start Request:**
```typescript
{
  type: 'start',
  requestId: 'req-123',
  userQuery: '...',
  context: { ... }
}
```

**Cancel Request:**
```typescript
{
  type: 'cancel',
  requestId: 'req-123'
}
```

**User Feedback:**
```typescript
{
  type: 'feedback',
  requestId: 'req-123',
  questionId: 'q-1',
  answer: '...'
}
```

## RabbitMQ Integration

### WebSocket Server Subscribes to Progress

```typescript
// Subscribe to all progress events
await rabbitMQ.subscribe('websocket.progress', async (message) => {
  const event = JSON.parse(message.content.toString());
  
  // Get all sockets for this request
  const sockets = io.sockets.adapter.rooms.get(`request:${event.requestId}`);
  
  if (sockets) {
    // Emit to all connected clients for this request
    io.to(`request:${event.requestId}`).emit('progress', {
      type: 'progress',
      agent: event.agent,
      step: event.data?.step,
      status: event.data?.status,
      data: event.data
    });
  }
  
  channel.ack(message);
});
```

## Streaming Pattern

### Executor Step-by-Step

```typescript
// Executor Agent publishes progress
for (const step of plan.steps) {
  // Publish step start
  await rabbitMQ.publish('agent.events', 'executor.step.progress', {
    type: 'executor.step.progress',
    requestId,
    agent: 'executor-agent',
    data: {
      stepId: step.id,
      stepOrder: step.order,
      status: 'running',
      tool: step.action
    }
  });
  
  // Execute step
  const result = await executeStep(step);
  
  // Publish step complete
  await rabbitMQ.publish('agent.events', 'executor.step.progress', {
    type: 'executor.step.progress',
    requestId,
    agent: 'executor-agent',
    data: {
      stepId: step.id,
      stepOrder: step.order,
      status: 'completed',
      result: result
    }
  });
}
```

### Frontend Updates

```typescript
socket.on('progress', (event) => {
  if (event.agent === 'executor-agent' && event.status === 'running') {
    // Update step indicator
    setStepStatus(event.step, 'running');
  } else if (event.status === 'completed') {
    // Show result
    setStepResult(event.step, event.data.result);
  }
});
```

## Connection Lifecycle

### Request Lifecycle

1. **Client connects** → Join request room
2. **Client sends start** → Backend publishes to RabbitMQ
3. **Agents process** → Publish progress events
4. **WebSocket streams** → Client receives updates
5. **Request completes** → Client receives final result
6. **Client disconnects** → Cleanup subscriptions

### Reconnection Handling

```typescript
// Client reconnects
socket.on('connect', () => {
  // Rejoin request room
  socket.emit('rejoin', { requestId });
  
  // Server sends current state
  socket.on('state', (state) => {
    restoreUI(state);
  });
});
```

## Benefits

- **Real-time updates**: See progress as it happens
- **Better UX**: No waiting for long operations
- **Cancellation**: Can stop operations
- **Multi-client**: Multiple clients can watch same request
- **Reconnection**: Auto-reconnect with state restore

