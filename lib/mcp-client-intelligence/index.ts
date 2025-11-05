export { memoryClient, MemoryClient } from './memory'
export { historyQueryClient, HistoryQueryClient } from './history-query'
export { benchmarksClient, BenchmarksClient } from './benchmarks'
export { smartFeaturesClient, SmartFeaturesClient } from './smart-features'
export { patternRecognitionClient, PatternRecognitionClient } from './pattern-recognition'

// Import clients for convenience object
import { memoryClient } from './memory'
import { historyQueryClient } from './history-query'
import { benchmarksClient } from './benchmarks'
import { smartFeaturesClient } from './smart-features'
import { patternRecognitionClient } from './pattern-recognition'

// Convenience export for all clients
export const mcpClientIntelligence = {
  memory: memoryClient,
  historyQuery: historyQueryClient,
  benchmarks: benchmarksClient,
  smartFeatures: smartFeaturesClient,
  patternRecognition: patternRecognitionClient,
}

