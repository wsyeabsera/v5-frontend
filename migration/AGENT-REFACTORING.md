# Agent Refactoring Pattern

## General Pattern

Convert any agent from Next.js route to backend service with RabbitMQ events.

## Refactoring Steps

### 1. Extract Agent Service

**From**: Next.js route handler

**To**: Pure service class

```typescript
// Before: app/api/agents/thought-agent/route.ts
export async function POST(req: NextRequest) {
  const agent = new ThoughtAgent();
  await agent.initialize();
  const result = await agent.generateThought(...);
  return NextResponse.json(result);
}

// After: lib/agents/thought-agent/service.ts
export class ThoughtAgentService {
  async process(event: AgentEvent) {
    const agent = new ThoughtAgent();
    await agent.initialize(event.headers);
    return await agent.generateThought(
      event.data.userQuery,
      event.data.requestContext
    );
  }
}
```

### 2. Add Event Publishing

**Replace**: Return response

**With**: Publish event

```typescript
// In service
async process(event: AgentEvent) {
  const result = await agent.generateThought(...);
  
  // Publish completion event
  await rabbitMQ.publish('agent.events', 'thought.completed', {
    type: 'thought.completed',
    requestId: event.requestId,
    agent: 'thought-agent',
    data: result
  });
  
  // Still save to MongoDB
  await thoughtOutputsStorage.save(result);
  
  return result;
}
```

### 3. Create Backend Service Handler

**Create**: Backend service that subscribes to events

```typescript
// backend/services/thought-service.ts
export class ThoughtService {
  private service = new ThoughtAgentService();
  
  async handleEvent(message: RabbitMQMessage) {
    const event = JSON.parse(message.content.toString());
    
    try {
      await this.service.process(event);
      channel.ack(message);
    } catch (error) {
      // Publish error event
      await rabbitMQ.publish('agent.events', 'thought.failed', {
        type: 'thought.failed',
        requestId: event.requestId,
        error: error.message
      });
      channel.nack(message, false, true); // requeue
    }
  }
}
```

### 4. Setup RabbitMQ Subscription

**Subscribe**: To relevant events

```typescript
// Backend startup
const thoughtService = new ThoughtService();

await rabbitMQ.subscribe('thought.input', async (message) => {
  await thoughtService.handleEvent(message);
});
```

### 5. Update Frontend

**Replace**: API call

**With**: WebSocket or event trigger

```typescript
// Option 1: WebSocket (for real-time)
socket.emit('start', { 
  type: 'thought.start',
  requestId,
  userQuery 
});

// Option 2: Trigger via RabbitMQ (for background)
await rabbitMQ.publish('agent.events', 'complexity.completed', {
  // Triggers thought agent automatically
});
```

## Agent-Specific Patterns

### Simple Agents (Thought, Planner, Critic)

**Pattern**: Subscribe → Process → Publish

```typescript
// Subscribe to input
rabbitMQ.subscribe('thought.input', async (message) => {
  const event = JSON.parse(message.content.toString());
  
  // Process
  const result = await thoughtAgent.process(event);
  
  // Publish result
  await rabbitMQ.publish('agent.events', 'thought.completed', result);
});
```

### Streaming Agents (Executor)

**Pattern**: Subscribe → Stream Progress → Publish

```typescript
// Subscribe
rabbitMQ.subscribe('executor.input', async (message) => {
  // Stream each step
  for (const step of plan.steps) {
    await publishProgress(step, 'running');
    const result = await executeStep(step);
    await publishProgress(step, 'completed', result);
  }
});
```

### Monitoring Agents (Meta, Confidence Scorer)

**Pattern**: Subscribe to Multiple Events → Analyze → Publish

```typescript
// Subscribe to multiple events
rabbitMQ.subscribe('meta.input', async (message) => {
  // Subscribe to: plan.completed, critique.completed
  // Analyze overall quality
  // Publish assessment
});
```

## Common Changes

### Initialization

**Before**: Initialize in route handler

**After**: Initialize in service (can reuse)

```typescript
// Service caches initialization
private agent: ThoughtAgent | null = null;

async getAgent() {
  if (!this.agent) {
    this.agent = new ThoughtAgent();
    await this.agent.initialize();
  }
  return this.agent;
}
```

### Error Handling

**Always publish error events**:

```typescript
try {
  await process();
} catch (error) {
  await rabbitMQ.publish('agent.events', 'agent.failed', {
    type: 'thought.failed',
    requestId,
    error: error.message
  });
  throw error;
}
```

### MongoDB Storage

**Keep**: MongoDB storage for history

**Add**: Event publishing for real-time

```typescript
// Save to MongoDB (for history)
await storage.save(result);

// Publish event (for real-time)
await rabbitMQ.publish('agent.events', 'agent.completed', result);
```

## Migration Checklist per Agent

- [ ] Extract service class
- [ ] Add event publishing
- [ ] Create backend handler
- [ ] Setup RabbitMQ subscription
- [ ] Update frontend
- [ ] Test event flow
- [ ] Keep Next.js route (temporary)
- [ ] Remove Next.js route (after migration)

## Benefits

- **Consistent pattern**: All agents follow same structure
- **Easy to test**: Services are pure functions
- **Scalable**: Can run agents separately
- **Reliable**: Events persist in RabbitMQ
- **Debuggable**: Can replay events

