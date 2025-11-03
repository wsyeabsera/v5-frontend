# MCP Prompt Recommendations

## Analysis Methodology

This document analyzes the actual MCP data model and identifies practical workflow templates (prompts) based on **real data fields and relationships** available in the system.

**Data Model Analysis:**
- Reviewed actual tool schemas and data structures
- Identified real relationships between entities (facility ↔ contaminants, shipments ↔ inspections, contracts ↔ shipments)
- Focused on data fields that actually exist, not theoretical scenarios

**Current State:**
- 28 MCP tools available (5 CRUD operations × 5 entities + 3 AI analysis tools)
- 4 existing prompts: analyze-facility-compliance, generate-contamination-report, review-shipment-inspection, compare-facilities-performance
- Actual data fields: contamination levels (explosive/HCl/SO2), inspection acceptance rates, waste types, heating values, timestamps, producers, contracts

## Actual Data Structure

### Contaminants
- Fields: `wasteItemDetected`, `material`, `facilityId`, `detection_time`, `explosive_level` (low/medium/high), `hcl_level` (low/medium/high), `so2_level` (low/medium/high), `estimated_size`, `shipment_id`
- Relationships: Links to facility and shipment

### Inspections
- Fields: `facility_id`, `is_delivery_accepted` (boolean), `does_delivery_meets_conditions` (boolean), `selected_wastetypes` (array of {category, percentage}), `heating_value_calculation` (number), `waste_producer`, `contract_reference_id`
- Relationships: Links to facility, contract, and producer

### Shipments
- Fields: `entry_timestamp`, `exit_timestamp`, `source`, `facilityId`, `license_plate`, `contract_reference_id`, `contractId`
- Relationships: Links to facility and contract

### Contracts
- Fields: `producerName`, `debitorName`, `wasteCode`
- Relationships: Linked via contractId/contract_reference_id to shipments and inspections

## Recommended Prompts by Category

### Contamination Analysis (Based on Actual Contaminant Fields)

#### 1. `analyze-contamination-by-material`
**Description:** Analyze contamination patterns grouped by material type, showing which materials have highest risk levels (explosive, HCl, SO2) and size distributions.

**Required Arguments:**
- `facilityId` (string, optional) - Filter by facility (if not provided, analyzes all facilities)
- `material` (string, optional) - Filter by specific material type
- `timeRange` (string, required) - Time range for analysis (e.g., "30days", "90days")

**Data Used:**
- `material` field from contaminants
- `explosive_level`, `hcl_level`, `so2_level` (low/medium/high enum values)
- `estimated_size` for size analysis
- `detection_time` for temporal patterns

**Related Tools:**
- `list_contaminants` (filtered by facilityId, material, detection_time)
- `get_facility` (if facility-specific)
- `list_shipments` (to analyze source patterns by material)

**Example Query:** "Analyze contamination patterns for plastic materials at facility HAN over the last 90 days"

---

#### 2. `assess-risk-level-trends`
**Description:** Track trends in contamination risk levels (explosive, HCl, SO2) over time, identifying facilities or materials with increasing risk patterns.

**Required Arguments:**
- `facilityId` (string, optional) - Filter by facility
- `riskType` (string, optional) - Focus on specific risk: "explosive", "hcl", "so2", or "all"
- `timeRange` (string, required) - Time range (e.g., "90days", "6months")

**Data Used:**
- `explosive_level`, `hcl_level`, `so2_level` enum values (low/medium/high)
- `detection_time` for temporal analysis
- `facilityId` for facility-specific trends

**Related Tools:**
- `list_contaminants` (grouped by time periods and risk levels)
- `get_facility` (for facility details)
- `generate-contamination-report` (can use internally for context)

**Example Query:** "Show me trends in explosive risk levels for facility HAN over the past 6 months"

---

### Inspection Analysis (Based on Actual Inspection Fields)

#### 3. `analyze-delivery-acceptance-rates`
**Description:** Calculate and analyze delivery acceptance rates (`is_delivery_accepted`) and condition compliance (`does_delivery_meets_conditions`) by facility, producer, or contract.

**Required Arguments:**
- `facilityId` (string, optional) - Filter by facility
- `wasteProducer` (string, optional) - Filter by waste producer name
- `contractReferenceId` (string, optional) - Filter by contract
- `timeRange` (string, required) - Time range for analysis

**Data Used:**
- `is_delivery_accepted` (boolean) - Acceptance rate
- `does_delivery_meets_conditions` (boolean) - Compliance rate
- `waste_producer` - Producer performance
- `contract_reference_id` - Contract compliance
- `facility_id` - Facility performance

**Related Tools:**
- `list_inspections` (filtered by facilityId, wasteProducer, contractReferenceId, date range)
- `get_facility` (for facility context)
- `get_contract` (for contract context)

**Example Query:** "Analyze delivery acceptance rates for Green Industries Inc over the last quarter"

---

#### 4. `analyze-waste-type-composition`
**Description:** Analyze waste type compositions from inspections, showing percentages by category and how they vary by facility, producer, or over time.

**Required Arguments:**
- `facilityId` (string, optional) - Filter by facility
- `wasteProducer` (string, optional) - Filter by producer
- `timeRange` (string, required) - Time range for analysis

**Data Used:**
- `selected_wastetypes` (array of {category, percentage}) - The actual waste type data
- `facility_id` - Facility grouping
- `waste_producer` - Producer grouping

**Related Tools:**
- `list_inspections` (filtered by facilityId, wasteProducer, date range)
- `get_facility` (for facility context)

**Example Query:** "Show me waste type composition for facility HAN over the last 30 days"

---

#### 5. `analyze-heating-value-patterns`
**Description:** Analyze heating value calculations (`heating_value_calculation`) patterns by facility, producer, or waste type to identify trends and anomalies.

**Required Arguments:**
- `facilityId` (string, optional) - Filter by facility
- `wasteProducer` (string, optional) - Filter by producer
- `timeRange` (string, required) - Time range for analysis

**Data Used:**
- `heating_value_calculation` (number) - The actual heating value
- `selected_wastetypes` - Waste type correlation
- `facility_id`, `waste_producer` - Grouping fields

**Related Tools:**
- `list_inspections` (filtered and grouped by heating values)
- `get_facility` (for facility context)

**Example Query:** "Analyze heating value patterns for Central Waste Processing Hub over the past quarter"

---

### Producer & Contract Analysis (Based on Actual Relationships)

#### 6. `evaluate-producer-performance`
**Description:** Evaluate producer performance based on inspection acceptance rates, contamination incidents linked to shipments, and contract compliance.

**Required Arguments:**
- `wasteProducer` (string, required) - Producer name to evaluate
- `timeRange` (string, required) - Time range for analysis
- `includeContracts` (boolean, optional) - Include contract-level analysis (default: true)

**Data Used:**
- `waste_producer` field from inspections
- `is_delivery_accepted`, `does_delivery_meets_conditions` - Quality metrics
- `contract_reference_id` - Contract relationships
- Contaminants linked via `shipment_id` → shipments → source (if producer matches)

**Related Tools:**
- `list_inspections` (filtered by wasteProducer)
- `list_contracts` (filtered by producerName)
- `list_shipments` (linked via contracts or source matching)
- `list_contaminants` (linked via shipment_id)

**Example Query:** "Evaluate performance of Green Industries Inc over the last 90 days"

---

#### 7. `analyze-contract-fulfillment`
**Description:** Analyze contract fulfillment by tracking shipments and inspections associated with a contract, checking acceptance rates and compliance.

**Required Arguments:**
- `contractId` (string, required) - Contract ID to analyze
- `timeRange` (string, optional) - Time range for analysis (default: contract duration)

**Data Used:**
- `contractId` / `contract_reference_id` links
- Shipments: `contractId`, `contract_reference_id`
- Inspections: `contract_reference_id`
- Inspection acceptance rates (`is_delivery_accepted`)

**Related Tools:**
- `get_contract` (get contract details)
- `list_shipments` (filtered by contractId or contract_reference_id)
- `list_inspections` (filtered by contract_reference_id)
- `list_contaminants` (linked via shipment_id)

**Example Query:** "Analyze fulfillment for contract [contractId] including all shipments and inspections"

---

### Shipment & Source Analysis (Based on Actual Shipment Fields)

#### 8. `analyze-source-performance`
**Description:** Analyze shipment source performance based on delivery timestamps, acceptance rates, and contamination incidents from shipments originating from that source.

**Required Arguments:**
- `source` (string, required) - Source/carrier name to analyze
- `timeRange` (string, required) - Time range for analysis
- `facilityId` (string, optional) - Filter by destination facility

**Data Used:**
- `source` field from shipments
- `entry_timestamp`, `exit_timestamp` - Delivery time analysis
- `facilityId` - Destination facility
- Contaminants linked via `shipment_id`

**Related Tools:**
- `list_shipments` (filtered by source, facilityId, date range)
- `list_inspections` (filtered by shipments from source)
- `list_contaminants` (filtered by shipment_id)
- `get_facility` (for facility context)

**Example Query:** "Analyze performance of shipments from source 'ABC Logistics' to facility HAN over the last 60 days"

---

#### 9. `analyze-delivery-time-patterns`
**Description:** Analyze shipment delivery time patterns (entry_timestamp to exit_timestamp) by facility, source, or contract to identify bottlenecks.

**Required Arguments:**
- `facilityId` (string, optional) - Filter by facility
- `source` (string, optional) - Filter by source
- `timeRange` (string, required) - Time range for analysis

**Data Used:**
- `entry_timestamp`, `exit_timestamp` - Actual timestamp fields
- Calculate duration = exit - entry
- `facilityId`, `source` - Grouping fields

**Related Tools:**
- `list_shipments` (filtered by facilityId, source, date range)
- Calculate time differences from timestamps
- `get_facility` (for facility context)

**Example Query:** "Analyze delivery time patterns for facility HAN shipments over the past month"

---

### Cross-Entity Analysis (Based on Actual Relationships)

#### 10. `trace-contamination-to-source`
**Description:** Trace a contamination incident back through shipment to source/producer, analyzing the full chain using actual relationships.

**Required Arguments:**
- `contaminantId` (string, required) - Contaminant ID to trace
- `includeRelated` (boolean, optional) - Include other contaminants from same shipment/source (default: true)

**Data Used:**
- Contaminant: `shipment_id`, `facilityId`, `material`, risk levels
- Shipment: `source`, `contractId`, `contract_reference_id` (from shipment_id)
- Contract: `producerName`, `debitorName` (from contractId)
- Related contaminants: Same `shipment_id` or same `source` via shipment

**Related Tools:**
- `get_contaminant` (get contamination details)
- `get_shipment` (via shipment_id)
- `get_contract` (via contractId from shipment)
- `list_contaminants` (filtered by shipment_id or source via shipment)

**Example Query:** "Trace contamination [contaminantId] back to its source and show related incidents"

---

#### 11. `analyze-producer-facility-risk`
**Description:** Analyze contamination risk levels (explosive/HCl/SO2) by producer-facility combinations, showing which producer-facility pairs have highest risk.

**Required Arguments:**
- `producerName` (string, optional) - Filter by producer
- `facilityId` (string, optional) - Filter by facility
- `riskLevel` (string, optional) - Filter by minimum risk level: "low", "medium", "high"
- `timeRange` (string, required) - Time range for analysis

**Data Used:**
- Contaminants: `explosive_level`, `hcl_level`, `so2_level`, `facilityId`
- Shipments: `source` (producer), `facilityId` (link via shipment_id)
- Match producer via shipment source → contaminants

**Related Tools:**
- `list_contaminants` (filtered by facilityId, date range)
- `list_shipments` (to match source/producer)
- `get_facility` (for facility context)
- `list_contracts` (to match producerName)

**Example Query:** "Show me producer-facility combinations with high explosive risk over the last quarter"

---

#### 12. `time-based-contamination-analysis`
**Description:** Analyze contamination patterns over time using actual detection_time timestamps, identifying trends, peaks, and seasonal patterns.

**Required Arguments:**
- `facilityId` (string, optional) - Filter by facility
- `material` (string, optional) - Filter by material type
- `timeRange` (string, required) - Time range (e.g., "30days", "3months", "year")

**Data Used:**
- `detection_time` (ISO 8601 timestamp) - Actual time field
- `explosive_level`, `hcl_level`, `so2_level` - Risk levels over time
- `material`, `facilityId` - Grouping fields

**Related Tools:**
- `list_contaminants` (filtered by facilityId, material, detection_time range)
- Group by time periods (daily, weekly, monthly)
- `get_facility` (for facility context)

**Example Query:** "Show me contamination trends by week for facility HAN over the past 3 months"

---

## Summary Statistics

**Total Recommended Prompts:** 12

**By Category:**
- Contamination Analysis: 2 prompts (material patterns, risk trends)
- Inspection Analysis: 3 prompts (acceptance rates, waste types, heating values)
- Producer & Contract Analysis: 2 prompts (producer performance, contract fulfillment)
- Shipment & Source Analysis: 2 prompts (source performance, delivery times)
- Cross-Entity Analysis: 3 prompts (contamination tracing, producer-facility risk, time analysis)

**Coverage Analysis:**
- **Current:** 4 prompts cover basic analysis workflows
- **With Recommendations:** 16 total prompts providing data-driven workflow coverage
- **Tool Utilization:** All prompts use actual available tools and data fields
- **Data-Driven:** Every recommendation based on real fields and relationships in the system

## Implementation Priority

### High Priority (Implement First)
1. `analyze-delivery-acceptance-rates` - Uses core inspection boolean fields
2. `evaluate-producer-performance` - Common use case with actual producer data
3. `analyze-contamination-by-material` - Uses material field and risk level enums
4. `trace-contamination-to-source` - Follows actual shipment_id → source relationship

### Medium Priority (Implement Second)
5. `analyze-waste-type-composition` - Uses actual selected_wastetypes array
6. `analyze-source-performance` - Uses source field from shipments
7. `analyze-contract-fulfillment` - Uses contract relationships
8. `assess-risk-level-trends` - Uses risk level enums over time

### Lower Priority (Implement Third)
9. `analyze-heating-value-patterns` - Uses heating_value_calculation number
10. `analyze-delivery-time-patterns` - Uses timestamp calculations
11. `analyze-producer-facility-risk` - Complex cross-entity analysis
12. `time-based-contamination-analysis` - Temporal pattern analysis

## Notes

- All prompts are based on **actual data fields** that exist in the system
- All relationships use **real foreign keys** (facilityId, shipment_id, contract_reference_id, etc.)
- No recommendations assume data that doesn't exist (no capacity, routes, maintenance data, etc.)
- Every prompt uses tools that are actually available
- Field types match actual schemas (enums: low/medium/high, booleans, timestamps, arrays)
- All examples use realistic entity names from the system (HAN, Green Industries Inc, etc.)

## Data Field Reference

For prompt implementers, here are the key data fields available:

**Contaminants:**
- Risk levels: `explosive_level`, `hcl_level`, `so2_level` (enum: "low" | "medium" | "high")
- Identification: `wasteItemDetected`, `material`, `estimated_size`
- Relationships: `facilityId`, `shipment_id`
- Time: `detection_time` (ISO 8601)

**Inspections:**
- Acceptance: `is_delivery_accepted`, `does_delivery_meets_conditions` (boolean)
- Waste data: `selected_wastetypes` (array: {category, percentage})
- Energy: `heating_value_calculation` (number)
- Relationships: `facility_id`, `contract_reference_id`, `waste_producer`

**Shipments:**
- Timing: `entry_timestamp`, `exit_timestamp` (ISO 8601)
- Identification: `license_plate`, `source`
- Relationships: `facilityId`, `contractId`, `contract_reference_id`

**Contracts:**
- Parties: `producerName`, `debitorName`
- Classification: `wasteCode`
