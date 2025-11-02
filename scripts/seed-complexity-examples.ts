/**
 * Seed Complexity Examples Script
 * 
 * Adds diverse complexity examples to Pinecone for better semantic matching.
 * Covers simple, medium, and complex queries in the waste management domain.
 * 
 * Run with: npx tsx scripts/seed-complexity-examples.ts
 */

import { storeComplexityExample } from '@/lib/pinecone/complexity-examples'
import { ComplexityConfig } from '@/types'

interface ExampleSeed {
  query: string
  config: ComplexityConfig
  description: string
}

const EXAMPLES: ExampleSeed[] = [
  // SIMPLE (1 reasoning pass) - Basic lookups, single operations
  {
    query: 'list all facilities',
    config: {
      complexityScore: 0.2,
      reasoningPasses: 1,
      confidence: 0.95,
      tags: ['facility', 'list', 'simple'],
    },
    description: 'Simple list operation',
  },
  {
    query: 'show me facility HAN',
    config: {
      complexityScore: 0.15,
      reasoningPasses: 1,
      confidence: 0.95,
      tags: ['facility', 'get', 'simple'],
    },
    description: 'Simple get operation',
  },
  {
    query: 'what shipments are at facility HAN',
    config: {
      complexityScore: 0.25,
      reasoningPasses: 1,
      confidence: 0.9,
      tags: ['shipment', 'facility', 'simple'],
    },
    description: 'Simple filtered query',
  },
  {
    query: 'get inspection details',
    config: {
      complexityScore: 0.2,
      reasoningPasses: 1,
      confidence: 0.9,
      tags: ['inspection', 'get', 'simple'],
    },
    description: 'Simple retrieval',
  },

  // MEDIUM (2 reasoning passes) - Analysis, comparisons, single entity deep dive
  {
    query: 'analyze facility HAN performance',
    config: {
      complexityScore: 0.5,
      reasoningPasses: 2,
      confidence: 0.85,
      tags: ['facility', 'analysis', 'performance', 'medium'],
      agentHints: ['generate_intelligent_facility_report'],
    },
    description: 'Single facility analysis',
  },
  {
    query: 'compare facility HAN and facility WCR',
    config: {
      complexityScore: 0.55,
      reasoningPasses: 2,
      confidence: 0.85,
      tags: ['facility', 'compare', 'medium'],
    },
    description: 'Two-facility comparison',
  },
  {
    query: 'analyze contamination risks for facility HAN',
    config: {
      complexityScore: 0.5,
      reasoningPasses: 2,
      confidence: 0.85,
      tags: ['contaminant', 'facility', 'risk', 'analysis', 'medium'],
    },
    description: 'Risk analysis for single facility',
  },
  {
    query: 'generate facility report for HAN',
    config: {
      complexityScore: 0.45,
      reasoningPasses: 2,
      confidence: 0.9,
      tags: ['facility', 'report', 'generate', 'medium'],
      agentHints: ['generate_intelligent_facility_report'],
    },
    description: 'Report generation for single facility',
  },
  {
    query: 'what are the contamination levels at facility HAN',
    config: {
      complexityScore: 0.4,
      reasoningPasses: 2,
      confidence: 0.85,
      tags: ['contaminant', 'facility', 'medium'],
    },
    description: 'Single facility contamination query',
  },

  // COMPLEX (3 reasoning passes) - Multi-entity, cross-facility, comprehensive analysis
  {
    query: 'analyze all facilities and generate comprehensive reports comparing their performance',
    config: {
      complexityScore: 0.75,
      reasoningPasses: 3,
      confidence: 0.9,
      tags: ['facility', 'all', 'analyze', 'report', 'compare', 'comprehensive', 'complex'],
      agentHints: ['generate_intelligent_facility_report'],
    },
    description: 'Multi-facility comprehensive analysis',
  },
  {
    query: 'compare performance across all facilities and suggest improvements',
    config: {
      complexityScore: 0.8,
      reasoningPasses: 3,
      confidence: 0.85,
      tags: ['facility', 'all', 'compare', 'performance', 'suggest', 'complex'],
    },
    description: 'Cross-facility comparison with recommendations',
  },
  {
    query: 'analyze contamination risks across all facilities and identify trends',
    config: {
      complexityScore: 0.75,
      reasoningPasses: 3,
      confidence: 0.85,
      tags: ['contaminant', 'facility', 'all', 'risk', 'trends', 'complex'],
    },
    description: 'Multi-facility risk analysis with trend identification',
  },
  {
    query: 'generate intelligent reports for all facilities and compare their waste processing efficiency',
    config: {
      complexityScore: 0.8,
      reasoningPasses: 3,
      confidence: 0.9,
      tags: ['facility', 'all', 'report', 'generate', 'compare', 'efficiency', 'complex'],
      agentHints: ['generate_intelligent_facility_report'],
    },
    description: 'Multi-facility report generation with comparison',
  },
  {
    query: 'analyze shipments across all facilities, identify high-risk contaminants, and suggest inspection questions',
    config: {
      complexityScore: 0.85,
      reasoningPasses: 3,
      confidence: 0.85,
      tags: ['shipment', 'facility', 'all', 'contaminant', 'risk', 'inspection', 'suggest', 'complex'],
      agentHints: ['analyze_shipment_risk', 'suggest_inspection_questions'],
    },
    description: 'Multi-entity comprehensive analysis with suggestions',
  },
  {
    query: 'evaluate all facilities performance, compare waste types, and recommend process improvements',
    config: {
      complexityScore: 0.8,
      reasoningPasses: 3,
      confidence: 0.85,
      tags: ['facility', 'all', 'evaluate', 'compare', 'recommend', 'complex'],
    },
    description: 'Comprehensive evaluation with recommendations',
  },
  {
    query: 'what is the total waste volume across all facilities and how does it compare by region',
    config: {
      complexityScore: 0.7,
      reasoningPasses: 3,
      confidence: 0.85,
      tags: ['waste', 'volume', 'facility', 'all', 'aggregate', 'compare', 'complex'],
    },
    description: 'Aggregation with comparison',
  },
]

async function seedExamples() {
  console.log(`🚀 Starting to seed ${EXAMPLES.length} complexity examples...\n`)

  let successCount = 0
  let errorCount = 0

  for (const example of EXAMPLES) {
    try {
      const created = await storeComplexityExample({
        query: example.query,
        config: example.config,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        usageCount: 0,
      })

      console.log(`✅ [${example.config.reasoningPasses} pass] ${example.description}`)
      console.log(`   Query: "${example.query}"`)
      console.log(`   Score: ${example.config.complexityScore}, Tags: ${example.config.tags?.join(', ')}`)
      console.log(`   ID: ${created.id}\n`)

      successCount++
    } catch (error: any) {
      console.error(`❌ Failed to seed: "${example.query}"`)
      console.error(`   Error: ${error.message}\n`)
      errorCount++
    }
  }

  console.log(`\n📊 Summary:`)
  console.log(`   ✅ Success: ${successCount}`)
  console.log(`   ❌ Errors: ${errorCount}`)
  console.log(`   📈 Total: ${EXAMPLES.length}`)
}

// Run if executed directly
if (require.main === module) {
  seedExamples()
    .then(() => {
      console.log('\n✨ Seeding complete!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Fatal error:', error)
      process.exit(1)
    })
}

export { seedExamples, EXAMPLES }

