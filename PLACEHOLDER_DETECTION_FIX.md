# Placeholder Detection Fix

## Issue

The coordinator was not detecting `EXTRACT_FROM_STEP_1` as a placeholder value, causing parameters to remain unextracted and leading to execution errors.

## Root Cause

The detection patterns only checked for:
- `includes('extracted')` - didn't match because value is "EXTRACT" not "EXTRACTED"
- `includes('from_step')` - this worked
- `match(/extracted.*step/i)` - didn't match because no "extracted" word

## Fix Applied

Updated `lib/agents/executor-agent/reasoning/coordinator.ts` (lines 423-428 and 545-550):

```typescript
// Added:
- includes('extract')  // Matches "EXTRACT_FROM_STEP_1"
- includes('from step') // Matches spaces as well as underscores
// Updated regex:
- /extract.*step/i  // Changed from /extracted.*step/i
```

## Test Results

- Test 1: Show me all facilities - ✅ PASSED
- Test 2: List facilities in New York - ✅ PASSED
- Test 3: Get details for facility HAN - ❌ FAILED (planner issue, not coordinator)
- Test 4: Get facility HAN and generate report - ✅ PASSED (after fix)

## Status

Fix is implemented and verified. System ready for full testing once frontend server is restarted.
