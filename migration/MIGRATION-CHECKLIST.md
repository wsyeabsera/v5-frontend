# Migration Checklist

## Phase 1: Foundation (Week 1-2)

### Infrastructure Setup
- [ ] Install RabbitMQ (local/dev)
- [ ] Setup RabbitMQ exchanges and queues
- [ ] Install WebSocket library (Socket.io or native)
- [ ] Create backend service structure
- [ ] Setup MongoDB connection in backend
- [ ] Create RabbitMQ client wrapper

### Basic Event System
- [ ] Define event message format
- [ ] Create event publisher utility
- [ ] Create event subscriber utility
- [ ] Test basic publish/subscribe
- [ ] Setup dead letter queue

## Phase 2: Executor Migration (Week 3-4)

### Executor Agent
- [ ] Extract ExecutorAgentService class
- [ ] Add progress event publishing
- [ ] Create ExecutorService backend handler
- [ ] Setup RabbitMQ subscription
- [ ] Implement WebSocket streaming
- [ ] Add cancellation support
- [ ] Test step-by-step progress
- [ ] Update frontend to use WebSocket
- [ ] Keep Next.js route (fallback)

### Testing
- [ ] Test event publishing
- [ ] Test WebSocket streaming
- [ ] Test cancellation
- [ ] Test error handling
- [ ] Test reconnection

## Phase 3: Core Agents (Week 5-7)

### Thought Agent
- [ ] Extract ThoughtAgentService
- [ ] Add event publishing
- [ ] Create ThoughtService handler
- [ ] Subscribe to complexity.completed
- [ ] Publish thought.completed
- [ ] Update frontend

### Planner Agent
- [ ] Extract PlannerAgentService
- [ ] Add event publishing
- [ ] Create PlannerService handler
- [ ] Subscribe to thought.completed
- [ ] Publish plan.completed
- [ ] Update frontend

### Critic Agent
- [ ] Extract CriticAgentService
- [ ] Add event publishing
- [ ] Create CriticService handler
- [ ] Subscribe to plan.completed
- [ ] Publish critique.completed
- [ ] Update frontend

## Phase 4: Supporting Agents (Week 8-9)

### Complexity Detector
- [ ] Extract ComplexityDetectorService
- [ ] Add event publishing
- [ ] Create ComplexityService handler
- [ ] Publish complexity.completed (triggers chain)
- [ ] Update frontend

### Meta Agent
- [ ] Extract MetaAgentService
- [ ] Add event publishing
- [ ] Create MetaService handler
- [ ] Subscribe to plan.completed, critique.completed
- [ ] Publish meta.assessment.completed
- [ ] Update frontend

### Confidence Scorer
- [ ] Extract ConfidenceScorerService
- [ ] Add event publishing
- [ ] Create ConfidenceService handler
- [ ] Subscribe to relevant events
- [ ] Publish confidence.score.completed
- [ ] Update frontend

## Phase 5: Cleanup (Week 10)

### Remove Old Routes
- [ ] Remove Executor Next.js route
- [ ] Remove Thought Next.js route
- [ ] Remove Planner Next.js route
- [ ] Remove Critic Next.js route
- [ ] Remove other agent routes
- [ ] Cleanup unused imports

### Documentation
- [ ] Update API documentation
- [ ] Document event system
- [ ] Document WebSocket protocol
- [ ] Update deployment guide

## Migration Order Priority

1. **Executor** - Most value from streaming
2. **Thought** - Foundation of chain
3. **Planner** - Depends on Thought
4. **Critic** - Depends on Planner
5. **Complexity Detector** - Triggers chain
6. **Meta Agent** - Monitoring
7. **Confidence Scorer** - Supporting
8. **Tool Memory** - Supporting
9. **Replan** - Less frequent
10. **Summary** - Less critical

## Testing Strategy

### Unit Tests
- [ ] Test each agent service
- [ ] Test event publishing
- [ ] Test event handling

### Integration Tests
- [ ] Test agent chain (events trigger correctly)
- [ ] Test WebSocket streaming
- [ ] Test error handling
- [ ] Test cancellation

### End-to-End Tests
- [ ] Full request flow
- [ ] Multiple concurrent requests
- [ ] Reconnection handling
- [ ] Error recovery

## Rollback Plan

### If Issues Occur
- [ ] Keep Next.js routes as fallback
- [ ] Feature flag to switch between old/new
- [ ] Monitor RabbitMQ queue depths
- [ ] Monitor WebSocket connections
- [ ] Quick rollback to old routes if needed

## Success Criteria

- [ ] All agents migrated to backend
- [ ] WebSocket streaming working
- [ ] Events flowing correctly
- [ ] Frontend showing real-time updates
- [ ] No regressions in functionality
- [ ] Performance equal or better
- [ ] Error handling robust

