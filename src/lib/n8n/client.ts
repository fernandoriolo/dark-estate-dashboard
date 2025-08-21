import { supabase } from '@/integrations/supabase/client';
import { N8NCallOptions, N8NResponse, N8NTestResult } from './types';

/**
 * Cliente centralizado para chamadas N8N
 * Gerencia todas as chamadas de webhook de forma segura através da Edge Function
 */
export class N8NClient {
  private static instance: N8NClient;
  private baseUrl: string;

  private constructor() {
    // URL da Edge Function que gerencia os endpoints
    this.baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/n8n-endpoint-manager`;
  }

  public static getInstance(): N8NClient {
    if (!N8NClient.instance) {
      N8NClient.instance = new N8NClient();
    }
    return N8NClient.instance;
  }

  /**
   * Fazer chamada para endpoint N8N via Edge Function
   */
  async call(options: N8NCallOptions): Promise<N8NResponse> {
    try {
      console.log(`🚀 N8NClient: Chamando ${options.endpointKey}`, options.payload);

      // Obter token de autenticação
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Usuário não autenticado');
      }

      // Fazer chamada para a Edge Function
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          endpointKey: options.endpointKey,
          payload: options.payload,
          idempotencyKey: options.idempotencyKey || crypto.randomUUID()
        })
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error(`❌ N8NClient erro [${response.status}]:`, responseData);
        throw new Error(responseData.error || `HTTP ${response.status}`);
      }

      console.log(`✅ N8NClient sucesso:`, responseData);
      return responseData as N8NResponse;

    } catch (error: any) {
      console.error(`❌ N8NClient erro:`, error);
      throw new Error(`Falha na chamada N8N: ${error.message}`);
    }
  }

  /**
   * Testar conectividade de um endpoint
   */
  async testEndpoint(endpointKey: string): Promise<N8NTestResult> {
    const startTime = Date.now();

    try {
      const testPayload = {
        test: true,
        timestamp: new Date().toISOString(),
        message: 'Teste de conectividade N8N'
      };

      const response = await this.call({
        endpointKey,
        payload: testPayload,
        idempotencyKey: `test-${Date.now()}`
      });

      const responseTime = Date.now() - startTime;

      return {
        success: response.success,
        status: response.status,
        responseTime,
        data: response.data
      };

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      return {
        success: false,
        status: 0,
        responseTime,
        error: error.message
      };
    }
  }

  /**
   * Métodos de conveniência para endpoints específicos
   */

  // Agenda
  async getAgenda(filters?: any) {
    return this.call({
      endpointKey: 'agenda.list',
      payload: { filters }
    });
  }

  async createEvent(eventData: any) {
    return this.call({
      endpointKey: 'agenda.create',
      payload: eventData
    });
  }

  async editEvent(eventId: string, eventData: any) {
    return this.call({
      endpointKey: 'agenda.edit',
      payload: { eventId, ...eventData }
    });
  }

  async deleteEvent(eventId: string) {
    return this.call({
      endpointKey: 'agenda.delete',
      payload: { eventId }
    });
  }

  // WhatsApp
  async getWhatsAppInstances() {
    return this.call({
      endpointKey: 'whatsapp.instances',
      payload: {}
    });
  }

  async createWhatsAppInstance(instanceData: any) {
    return this.call({
      endpointKey: 'whatsapp.create',
      payload: instanceData
    });
  }

  async getQRCode(instanceId: string) {
    return this.call({
      endpointKey: 'whatsapp.qrcode',
      payload: { instanceId }
    });
  }

  async deleteWhatsAppInstance(instanceId: string) {
    return this.call({
      endpointKey: 'whatsapp.delete',
      payload: { instanceId }
    });
  }

  async configureWhatsAppInstance(instanceName: string, config: any) {
    return this.call({
      endpointKey: 'whatsapp.config',
      payload: { instanceName, config }
    });
  }

  async editWhatsAppInstanceConfig(instanceName: string, config: any) {
    return this.call({
      endpointKey: 'whatsapp.edit_config',
      payload: { instanceName, config }
    });
  }

  // Outros
  async manageInquilinato(data: any) {
    return this.call({
      endpointKey: 'inquilinato.manage',
      payload: data
    });
  }

  async getAgendaIds() {
    return this.call({
      endpointKey: 'agenda.ids',
      payload: {}
    });
  }

  async generateChatSummary(conversationData: any) {
    return this.call({
      endpointKey: 'chats.summary',
      payload: conversationData
    });
  }

  async manageChatFollowup(followupData: any) {
    return this.call({
      endpointKey: 'chats.followup',
      payload: followupData
    });
  }
}

// Instância singleton para uso global
export const n8nClient = N8NClient.getInstance();