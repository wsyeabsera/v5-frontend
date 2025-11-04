# Executor Agent Migration Guide

## Why Executor First?

- **Longest operations**: Needs streaming most
- **Step-by-step progress**: Users need to see each step
- **Cancellation critical**: Should be able to stop mid-execution
- **Highest value**: Biggest UX improvement

## Migration Steps

### 1. Extract Agent Logic

**Current**: Agent logic mixed with Next.js route handling

**Target**: Pure agent service class

```typescript
// lib/agents/executor-agent/service.ts
export class ExecutorAgentService {
  async execute(requestId: string, plan: Plan, context: RequestContext) {
    // Existing executor logic
    // But publish events instead of storing in MongoDB only
  }
}
```

### 2. Add Event Publishing

**Replace**: Direct MongoDB storage

**With**: RabbitMQ event publishing

```typescript
// Instead of:
await executorOutputsStorage.save(result);

// Do:
await rabbitMQ.publish('agent.events', 'executor.step.progress', {
  type: 'executor.step.progress',
  requestId,
  agent: 'executor-agent',
  data: { step, status: 'running' }
});

// Still save to MongoDB for history
await executorOutputsStorage.save(result);
```

### 3. Create Backend Service Endpoint

**New**: Backend service endpoint

```typescript
// backend/services/executor-service.ts
export class ExecutorService {
  async handleRequest(event: RabbitMQMessage) {
    const { requestId, plan, context } = event.data;
    
    const executor = new ExecutorAgentService();
    
    // Stream progress
    executor.on('step.progress', (step, status) => {
      rabbitMQ.publish('agent.events', 'executor.step.progress', {
        type: 'executor.step.progress',
        requestId,
        agent: 'executor-agent',
        data: { step, status }
      });
    });
    
    await executor.execute(requestId, plan, context);
  }
}
```

### 4. Subscribe to RabbitMQ

**Setup**: Subscribe to critique.completed

```typescript
// Backend startup
await rabbitMQ.subscribe('executor.input', async (message) => {
  const event = JSON.parse(message.content.toString());
  
  const service = new ExecutorService();
  await service.handleRequest(event);
  
  channel.ack(message);
});
```

### 5. WebSocket Integration

**Stream**: Progress to frontend

```typescript
// WebSocket server subscribes to executor events
rabbitMQ.subscribe('websocket.progress', async (message) => {
  const event = JSON.parse(message.content.toString());
  
  if (event.agent === 'executor-agent') {
    io.to(`request:${event.requestId}`).emit('progress', event);
  }
});
```

## Key Changes

### Progress Publishing

**Before**: Return result at end

**After**: Publish progress throughout

```typescript
// In executor execution loop
for (const step of plan.steps) {
  // Publish start
  await publishProgress(requestId, step, 'running');
  
  // Execute
  const result = await executeStep(step);
  
  // Publish complete
  await publishProgress(requestId, step, 'completed', result);
}
```

### Error Handling

**Publish errors** as events:

```typescript
try {
  await executeStep(step);
} catch (error) {
  await rabbitMQ.publish('agent.events', 'executor.step.failed', {
    type: 'executor.step.failed',
    requestId,
    agent: 'executor-agent',
    data: { step, error: error.message }
  });
}
```

### Cancellation Support

**Handle cancel command**:

```typescript
// Store cancellation flag
const cancellationFlags = new Map<string, boolean>();

// WebSocket cancel handler
socket.on('cancel', async (data) => {
  cancellationFlags.set(data.requestId, true);
});

// In executor loop
for (const step of plan.steps) {
  if (cancellationFlags.get(requestId)) {
    await publishProgress(requestId, step, 'cancelled');
    break;
  }
  // Execute step...
}
```

## Frontend Changes

### Replace API Call

**Before**: 
```typescript
const response = await fetch('/api/agents/executor-agent', {...});
const data = await response.json();
```

**After**:
```typescript
// Connect WebSocket
const socket = io('ws://localhost:3001', {
  query: { requestId }
});

// Listen for progress
socket.on('progress', (event) => {
  if (event.agent === 'executor-agent') {
    updateStepStatus(event.step, event.status);
  }
});

// Send start command
socket.emit('start', { requestId, plan, context });
```

### UI Updates

**Show progress**:
- Step indicators (running, completed, failed)
- Progress percentage
- Real-time result updates
- Cancel button

## Testing

### Test Events

1. Start executor → Verify events published
2. Step progress → Verify WebSocket receives
3. Cancel → Verify cancellation works
4. Error → Verify error events published

### Keep Next.js Route

**During migration**: Keep old route working

**Gradually migrate**: Frontend can use either

**Remove**: After migration complete

## Benefits

- **Real-time progress**: See each step execute
- **Cancellation**: Stop long operations
- **Better UX**: No more waiting
- **Debugging**: Can replay events
- **Reliability**: Events persisted in RabbitMQ

