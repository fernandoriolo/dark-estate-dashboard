// Tipos para o sistema N8N
export interface N8NEndpoint {
  id: string;
  endpoint_key: string;
  display_name: string;
  description?: string;
  url: string;
  bearer_token: string;
  category: 'agenda' | 'whatsapp' | 'outros';
  is_active: boolean;
  company_id: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface N8NResponse {
  success: boolean;
  status: number;
  endpoint: string;
  data: any;
  timestamp: string;
  error?: string;
}

export interface N8NCallOptions {
  endpointKey: string;
  payload: any;
  idempotencyKey?: string;
}

export interface N8NTestResult {
  success: boolean;
  status: number;
  responseTime: number;
  error?: string;
  data?: any;
}

export type EndpointCategory = 'agenda' | 'whatsapp' | 'outros';

export const ENDPOINT_CATEGORIES: Record<EndpointCategory, string> = {
  agenda: '📅 Agenda',
  whatsapp: '💬 WhatsApp',
  outros: '🔧 Outros'
};