export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
  toolInvocations?: ToolInvocation[];
}

export interface ToolInvocation {
  toolCallId: string;
  toolName: string;
  args: any;
  result?: any;
  state?: 'partial-call' | 'call' | 'result';
}

export interface ToolCall {
  name: string;
  arguments: any;
  result?: any;
}

export interface Model {
  id: string;
  name: string;
  provider: string;
  description: string;
}

export interface ApiKeys {
  anthropic?: string;
  openai?: string;
  google?: string;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

export interface MCPResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export interface Facility {
  _id: string;
  name: string;
  shortCode: string;
  location: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contaminant {
  _id: string;
  wasteItemDetected: string;
  material: string;
  facility_id: Facility;
  detection_time: string;
  explosive_level: 'low' | 'medium' | 'high';
  hcl_level: 'low' | 'medium' | 'high';
  so2_level: 'low' | 'medium' | 'high';
  estimated_size: number;
  shipment_id: string;
  createdAt: string;
  updatedAt: string;
}

export interface Inspection {
  _id: string;
  facility_id: Facility;
  is_delivery_accepted: boolean;
  does_delivery_meets_conditions: boolean;
  selected_wastetypes: Array<{
    category: string;
    percentage: string;
  }>;
  heating_value_calculation: number;
  waste_producer: string;
  contract_reference_id: string;
  createdAt: string;
  updatedAt: string;
}

export interface Shipment {
  _id: string;
  entry_timestamp: string;
  exit_timestamp: string;
  source: string;
  facility_id: Facility;
  license_plate: string;
  contract_reference_id: string;
  contractId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityData {
  recentInspections: Inspection[];
  recentContaminants: Contaminant[];
  recentShipments: Shipment[];
}

export interface StatsData {
  overview: {
    facilities: number;
    shipments: number;
    contaminants: number;
    inspections: number;
  };
  metrics: {
    overallAcceptanceRate: string;
    avgHeatingValue: number;
    highRiskContaminants: number;
  };
}

