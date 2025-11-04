# RabbitMQ Event System Design

## Exchange Structure

### Main Exchange: `agent.events`
- **Type**: Topic exchange
- **Durable**: Yes (survives broker restart)
- **Purpose**: Route all agent events

## Routing Keys

### Pattern: `agent.action.status`

**Examples:**
- `complexity.completed`
- `thought.completed`
- `plan.completed`
- `critique.completed`
- `executor.step.progress`
- `executor.step.completed`
- `executor.completed`
- `meta.assessment.completed`
- `replan.completed`

### Wildcards
- `*.completed` - All completion events
- `executor.*` - All executor events
- `*.progress` - All progress events

## Queues

### Agent Input Queues

**Queue: `thought.input`**
- Routing key: `complexity.completed`
- Durable: Yes
- Purpose: Trigger Thought Agent when complexity detected

**Queue: `planner.input`**
- Routing key: `thought.completed`
- Durable: Yes
- Purpose: Trigger Planner Agent when thoughts ready

**Queue: `critic.input`**
- Routing key: `plan.completed`
- Durable: Yes
- Purpose: Trigger Critic Agent when plan ready

**Queue: `executor.input`**
- Routing key: `critique.completed`
- Durable: Yes
- Purpose: Trigger Executor Agent when critique ready

**Queue: `meta.input`**
- Routing key: `plan.completed`, `critique.completed`
- Durable: Yes
- Purpose: Trigger Meta Agent for quality assessment

### WebSocket Queue

**Queue: `websocket.progress`**
- Routing key: `*.progress`, `*.completed`
- Durable: No (ephemeral)
- Purpose: Stream progress to frontend

## Message Format

### Standard Event Message

```typescript
{
  type: string;              // Event type (routing key)
  requestId: string;        // Request ID for chaining
  timestamp: string;        // ISO timestamp
  agent: string;            // Agent name
  data: any;                // Event-specific data
  metadata?: {
    userId?: string;
    sessionId?: string;
    [key: string]: any;
  };
}
```

### Example Messages

**Complexity Completed:**
```json
{
  "type": "complexity.completed",
  "requestId": "req-123",
  "timestamp": "2024-01-15T10:00:00Z",
  "agent": "complexity-detector",
  "data": {
    "complexity": 0.7,
    "reasoning": "Complex query requiring multiple steps"
  }
}
```

**Thought Completed:**
```json
{
  "type": "thought.completed",
  "requestId": "req-123",
  "timestamp": "2024-01-15T10:00:05Z",
  "agent": "thought-agent",
  "data": {
    "thoughts": [...],
    "primaryApproach": "...",
    "recommendedTools": [...]
  }
}
```

**Executor Step Progress:**
```json
{
  "type": "executor.step.progress",
  "requestId": "req-123",
  "timestamp": "2024-01-15T10:01:00Z",
  "agent": "executor-agent",
  "data": {
    "stepId": "step-1",
    "stepOrder": 1,
    "status": "running",
    "tool": "list_facilities",
    "progress": 0.5
  }
}
```

## Publisher Pattern

### Agent Publishes Event

```typescript
// After agent completes processing
await rabbitMQ.publish('agent.events', 'thought.completed', {
  type: 'thought.completed',
  requestId: requestContext.requestId,
  timestamp: new Date().toISOString(),
  agent: 'thought-agent',
  data: thoughtOutput
});
```

## Subscriber Pattern

### Agent Subscribes to Event

```typescript
// Thought Agent subscribes to complexity.completed
await rabbitMQ.subscribe('thought.input', async (message) => {
  const event = JSON.parse(message.content.toString());
  
  // Process event
  const thoughtAgent = new ThoughtAgent();
  await thoughtAgent.initialize();
  const result = await thoughtAgent.generateThought(
    event.data.userQuery,
    event.data.requestContext
  );
  
  // Publish result
  await rabbitMQ.publish('agent.events', 'thought.completed', {
    type: 'thought.completed',
    requestId: event.requestId,
    timestamp: new Date().toISOString(),
    agent: 'thought-agent',
    data: result
  });
  
  // ACK message
  channel.ack(message);
});
```

## Error Handling

### Failed Processing

```typescript
try {
  // Process event
} catch (error) {
  // Publish error event
  await rabbitMQ.publish('agent.events', 'thought.failed', {
    type: 'thought.failed',
    requestId: event.requestId,
    timestamp: new Date().toISOString(),
    agent: 'thought-agent',
    error: error.message
  });
  
  // NACK message (requeue or dead letter)
  channel.nack(message, false, true); // requeue
}
```

### Dead Letter Queue

- Failed messages after max retries go to DLQ
- Monitor DLQ for persistent failures
- Manual intervention or alerting

## Benefits

- **Reliability**: Messages persist, survive crashes
- **Decoupling**: Agents don't know about each other
- **Scalability**: Multiple instances can process same queue
- **Debugging**: Can replay events from queue
- **Monitoring**: Track all events in one place

