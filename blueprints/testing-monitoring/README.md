# Testing System Pages - Implementation Blueprints

## Overview

This directory contains detailed blueprints for implementing management and execution pages for the orchestrator testing system.

## Blueprint Structure

### Phase 1: Foundation (Essential)
1. **00-OVERVIEW.md** - Overview and architecture
2. **07-PHASE-1-TEST-PROMPTS.md** - Test Prompt Management
3. **08-PHASE-1-TEST-SUITES.md** - Test Suite Management

### Phase 2: Core Features (Important)
4. **09-PHASE-2-TEST-EXECUTION.md** - Test Execution
5. **10-PHASE-2-TEST-RUNS.md** - Test Run History

### Phase 3: Advanced Features (Nice to have)
6. **11-PHASE-3-TEST-COMPARISON.md** - Test Comparison & Baselines
7. **12-PHASE-3-TEST-ANALYTICS.md** - Test Analytics Dashboard

## Implementation Order

### Recommended Implementation Sequence

1. **Start with Phase 1** - These provide the foundation for test management
   - Test Prompt Management (create, edit, configure user inputs)
   - Test Suite Management (organize prompts into suites)

2. **Then Phase 2** - Core execution and results
   - Test Execution (run prompts and suites with monitoring)
   - Test Run History (view results and metrics)

3. **Finally Phase 3** - Advanced analytics
   - Test Comparison & Baselines (compare runs, detect regressions)
   - Test Analytics (trends, success rates, performance metrics)

## File Structure

Each blueprint follows this structure:
- **Page Component** - Main page file in `app/v2/orchestrator/testing/[feature]/page.tsx`
- **Feature Components** - Components in `components/v2/orchestrator/testing/[feature]/`
- **API Client Extensions** - Methods added to `lib/mcp-client-orchestrator.ts`
- **Query Hooks** - Hooks added to `lib/queries-v2.ts`
- **Sidebar Updates** - Navigation items added to `components/layout/Sidebar.tsx`

## Common Patterns

### Data Fetching
All pages use TanStack Query with:
- `useQuery` for fetching data
- `useMutation` for create/update/delete operations
- Automatic cache invalidation on mutations
- Loading and error states

### UI Components
All pages use shadcn/ui components:
- `Card` for containers
- `Button` for actions
- `Badge` for status indicators
- `Select` for dropdowns
- `Input` and `Textarea` for forms
- `Tabs` for organizing content

### Charts
Analytics pages use Recharts:
- `BarChart` for comparisons
- `LineChart` for trends
- `ResponsiveContainer` for responsive sizing

## Key Features

### Test Prompt Management
- CRUD operations for test prompts
- User input configuration (field, value, stepId, order)
- Categories and tags management
- Expected outcomes definition
- Execution statistics tracking

### Test Suite Management
- Create and manage test suites
- Add/remove test cases from prompts
- Suite versioning
- Test case metadata and overrides

### Test Execution
- Run individual test prompts
- Execute test suites (parallel or sequential)
- Real-time progress monitoring
- Automatic user input provision
- Manual user input provision (if needed)

### Test Run History
- View test run results
- Filter by orchestrator, status, date range
- Detailed test case results
- Execution metrics visualization
- Link to execution details

### Comparison & Baselines
- Compare two test runs side-by-side
- Create and manage performance baselines
- Automatic regression detection
- Performance delta calculations
- Visual comparison charts

### Analytics
- Execution trends over time
- Success rate analytics
- Performance metrics (latency, P95, P99)
- User input statistics and coverage
- Time range filtering

## API Integration

All pages integrate with the orchestrator MCP server (port 5001) via:
- `/api/mcp-orchestrator` API route
- `MCPClientOrchestrator` client class
- Tool calls: `create_test_prompt`, `run_test_suite`, etc.

## Testing Tools Available

### Test Prompt Tools
- `create_test_prompt` - Create a new test prompt
- `get_test_prompt` - Get prompt details
- `list_test_prompts` - List prompts with filters
- `update_test_prompt` - Update prompt
- `delete_test_prompt` - Delete prompt

### Test Suite Tools
- `create_test_suite` - Create a new test suite
- `get_test_suite` - Get suite details
- `list_test_suites` - List suites with filters
- `update_test_suite` - Update suite
- `delete_test_suite` - Delete suite

### Test Execution Tools
- `run_test_prompt` - Execute a single prompt
- `run_test_suite` - Execute a test suite
- `bulk_execute_prompts` - Execute multiple prompts
- `provide_test_user_input` - Provide user inputs manually

### Test Run Tools
- `get_test_run` - Get run details
- `list_test_runs` - List runs with filters

### Comparison Tools
- `compare_test_runs` - Compare two runs
- `create_baseline` - Create a baseline
- `check_regression` - Check for regressions

### Analytics Tools
- `get_performance_report` - Get performance report
- `analyze_performance_trends` - Analyze trends

## Next Steps

Read blueprints in order:
1. `00-OVERVIEW.md` - Start here for architecture overview
2. `07-PHASE-1-TEST-PROMPTS.md` - Test Prompt Management
3. `08-PHASE-1-TEST-SUITES.md` - Test Suite Management
4. `09-PHASE-2-TEST-EXECUTION.md` - Test Execution
5. `10-PHASE-2-TEST-RUNS.md` - Test Run History
6. `11-PHASE-3-TEST-COMPARISON.md` - Test Comparison & Baselines
7. `12-PHASE-3-TEST-ANALYTICS.md` - Test Analytics Dashboard

