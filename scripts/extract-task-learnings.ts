import { mcpClientV2 } from '../lib/mcp-client-v2'

interface TaskMetrics {
  executionTime: number
  stepsCompleted: number
  retries: number
  userInputsRequired: number
}

function calculateMetrics(task: any): TaskMetrics {
  const executionHistory = task.executionHistory || []
  
  // Calculate total execution time from durations
  let executionTime = 0
  executionHistory.forEach((entry: any) => {
    if (entry.duration) {
      executionTime += entry.duration
    }
  })
  
  // If no durations, calculate from timestamps
  if (executionTime === 0 && executionHistory.length >= 2) {
    const start = new Date(executionHistory[0].timestamp).getTime()
    const end = new Date(executionHistory[executionHistory.length - 1].timestamp).getTime()
    executionTime = end - start
  }
  
  // Count completed steps
  const stepsCompleted = Object.keys(task.stepOutputs || {}).length
  
  // Count total retries
  const retryCount = task.retryCount || {}
  const retries = Object.values(retryCount).reduce((sum: number, count: any) => sum + (count || 0), 0)
  
  // Count user inputs
  const userInputs = task.userInputs || {}
  const userInputsRequired = Object.keys(userInputs).length
  
  return {
    executionTime: Math.max(executionTime, 0),
    stepsCompleted,
    retries,
    userInputsRequired
  }
}

function extractInsights(task: any): string[] {
  const insights: string[] = []
  
  if (task.status === 'failed' && task.error) {
    insights.push(`Task failed with error: ${task.error}`)
  }
  
  const retryCount = task.retryCount || {}
  const totalRetries = Object.values(retryCount).reduce((sum: number, count: any) => sum + (count || 0), 0)
  if (totalRetries > 0) {
    insights.push(`Task required ${totalRetries} retries`)
  }
  
  if (Object.keys(task.userInputs || {}).length > 0) {
    insights.push('Task required user input during execution')
  }
  
  return insights
}

async function extractLearningsForTask(taskId: string, planId: string, status: 'completed' | 'failed', task: any) {
  const metrics = calculateMetrics(task)
  const insights = extractInsights(task)
  
  try {
    const result = await mcpClientV2.request('learn_from_task', {
      taskId,
      planId,
      status,
      metrics,
      insights: insights.length > 0 ? insights : undefined
    })
    
    console.log(`✓ Extracted learnings for task ${taskId} (${status})`)
    return result
  } catch (error: any) {
    console.error(`✗ Failed to extract learnings for task ${taskId}:`, error.message)
    return null
  }
}

async function extractAllLearnings() {
  console.log('Starting to extract learnings from all tasks...\n')
  
  // Get all completed tasks
  const completedResponse = await fetch('http://localhost:4000/sse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'list_tasks',
        arguments: { status: 'completed', limit: 50 }
      }
    })
  })
  const completedData = await completedResponse.json()
  const completedTasks = completedData.result?.tasks || []
  
  // Get all failed tasks
  const failedResponse = await fetch('http://localhost:4000/sse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'list_tasks',
        arguments: { status: 'failed', limit: 50 }
      }
    })
  })
  const failedData = await failedResponse.json()
  const failedTasks = failedData.result?.tasks || []
  
  console.log(`Found ${completedTasks.length} completed tasks and ${failedTasks.length} failed tasks\n`)
  
  // Extract learnings from completed tasks
  for (const task of completedTasks) {
    await extractLearningsForTask(task._id, task.planId, 'completed', task)
    await new Promise(resolve => setTimeout(resolve, 100)) // Small delay
  }
  
  // Extract learnings from failed tasks
  for (const task of failedTasks) {
    await extractLearningsForTask(task._id, task.planId, 'failed', task)
    await new Promise(resolve => setTimeout(resolve, 100)) // Small delay
  }
  
  console.log(`\n✓ Completed extracting learnings from ${completedTasks.length + failedTasks.length} tasks`)
}

// Run if called directly
if (require.main === module) {
  extractAllLearnings().catch(console.error)
}

export { extractAllLearnings, calculateMetrics, extractInsights }

