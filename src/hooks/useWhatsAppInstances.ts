import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from './useUserProfile';

export interface WhatsAppInstance {
  id: string;
  user_id: string;
  company_id: string;
  instance_name: string;
  phone_number?: string;
  profile_name?: string;
  profile_pic_url?: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'qr_code' | 'error';
  webhook_url?: string;
  api_key?: string;
  last_seen?: string;
  message_count: number;
  contact_count: number;
  chat_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Dados do usuário (para gestores verem todas as instâncias)
  user_profile?: {
    full_name: string;
    email: string;
    role: string;
  };
}

export interface WhatsAppChat {
  id: string;
  instance_id: string;
  user_id: string;
  contact_phone: string;
  contact_name?: string;
  contact_avatar?: string;
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
  is_archived: boolean;
  tags?: string[];
  lead_id?: string;
  property_id?: string;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppMessage {
  id: string;
  chat_id: string;
  instance_id: string;
  user_id: string;
  message_id?: string;
  from_me: boolean;
  contact_phone?: string;
  message_type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'contact';
  content?: string;
  media_url?: string;
  caption?: string;
  timestamp: string;
  read_at?: string;
  delivered_at?: string;
  created_at: string;
}

export function useWhatsAppInstances() {
  const { profile, isManager } = useUserProfile();
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [chats, setChats] = useState<WhatsAppChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar instâncias baseado no role do usuário + dados em tempo real
  const loadInstances = async () => {
    try {
      console.log('🚀 Iniciando carregamento de instâncias...');
      setLoading(true);
      setError(null);

      if (!profile) return;

      // 1. Buscar instâncias do banco (controle de usuário)
      let query = supabase
        .from('whatsapp_instances')
        .select(`
          *,
          user_profile:user_profiles(full_name, email, role)
        `);

      // Se for corretor, buscar apenas suas instâncias
      if (profile.role === 'corretor') {
        query = query.eq('user_id', profile.id);
      } 
      // Se for gestor/admin, buscar todas as instâncias (sem filtro extra)
      else if (isManager) {
        // no-op
      } else {
        // Fallback para apenas próprias instâncias
        query = query.eq('user_id', profile.id);
      }

      const { data: localInstances, error } = await query
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log('💾 Dados locais carregados:', localInstances?.length || 0, 'instâncias encontradas');

      // 2. Buscar dados em tempo real do endpoint externo (uma chamada para todas)
      console.log('🔍 Buscando dados em tempo real de TODAS as instâncias...');
      
      let externalInstances: any[] = [];
      
      try {
        console.log('📡 Chamando endpoint: GET /webhook/whatsapp-instances');
        
        const response = await fetch('https://webhooklabz.n8nlabz.com.br/webhook/whatsapp-instances', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          mode: 'cors',
        });

        if (response.ok) {
          const responseData = await response.json();
          console.log('✅ Resposta recebida do webhook:', responseData);
          
          // O endpoint retorna {success: true, data: [...]} direto
          if (responseData.success && Array.isArray(responseData.data)) {
            externalInstances = responseData.data || [];
            console.log('📊 Total de instâncias no webhook:', externalInstances.length);
          } else {
            console.warn('⚠️ Formato de resposta inesperado:', responseData);
          }
        } else {
          console.warn('❌ Erro no endpoint webhook:', response.status);
        }
      } catch (apiError) {
        console.warn('❌ Sistema externo indisponível:', apiError);
      }

      // 3. Combinar dados do webhook com dados locais
      let instancesWithRealTimeData;
      
      if (isManager) {
        // GESTORES/ADMINS: Mostrar TODAS as instâncias do webhook
        console.log('👑 Usuário é gestor/admin - mostrando todas as instâncias do webhook');
        
        instancesWithRealTimeData = externalInstances.map((externalData) => {
          // Encontrar dados locais correspondentes (se existir)
          const localData = (localInstances || []).find(local => local.instance_name === externalData.name);
          
          console.log(`🔗 Processando instância ${externalData.name}:`, {
            status: externalData.connectionStatus,
            messages: externalData._count?.Message,
            contacts: externalData._count?.Contact,
            hasLocalData: !!localData
          });
          
          // Mapear status
          const statusMap: Record<string, 'connected' | 'connecting' | 'disconnected'> = {
            open: 'connected',
            connecting: 'connecting',
            close: 'disconnected',
            closed: 'disconnected'
          };
          
          return {
            // Usar dados locais como base se existir, senão criar novo objeto
            id: localData?.id || externalData.id,
            user_id: localData?.user_id || null,
            company_id: localData?.company_id || null,
            instance_name: externalData.name,
            webhook_url: localData?.webhook_url || `https://webhooklabz.n8nlabz.com.br/webhook/${externalData.name}`,
            is_active: localData?.is_active ?? true,
            created_at: localData?.created_at || externalData.createdAt,
            updated_at: externalData.updatedAt,
            user_profile: localData?.user_profile || null,
            
            // Dados em tempo real do webhook
            status: statusMap[externalData.connectionStatus] || 'disconnected',
            profile_name: externalData.profileName,
            profile_pic_url: externalData.profilePicUrl,
            message_count: externalData._count?.Message || 0,
            contact_count: externalData._count?.Contact || 0,
            chat_count: externalData._count?.Chat || 0,
            last_seen: externalData.updatedAt,
            phone_number: externalData.ownerJid ? 
              formatPhoneNumber(externalData.ownerJid.replace('@s.whatsapp.net', '')) : 
              null,
            api_key: externalData.token
          };
        });
        
      } else {
        // CORRETORES: Combinar apenas suas instâncias locais com dados do webhook
        console.log('👤 Usuário é corretor - combinando instâncias locais com webhook');
        
        instancesWithRealTimeData = (localInstances || []).map((localInstance) => {
          // Encontrar dados correspondentes no webhook pelo nome da instância
          const externalData = externalInstances.find(ext => ext.name === localInstance.instance_name);
          
          if (externalData) {
            console.log(`🔗 Combinando dados para ${localInstance.instance_name}:`, {
              status: externalData.connectionStatus,
              messages: externalData._count?.Message,
              contacts: externalData._count?.Contact
            });
            
            // Mapear status
            const statusMap: Record<string, 'connected' | 'connecting' | 'disconnected'> = {
              open: 'connected',
              connecting: 'connecting',
              close: 'disconnected',
              closed: 'disconnected'
            };
            
            return {
              ...localInstance,
              // Atualizar com dados em tempo real do webhook
              status: statusMap[externalData.connectionStatus] || 'disconnected',
              profile_name: externalData.profileName || localInstance.profile_name,
              profile_pic_url: externalData.profilePicUrl || localInstance.profile_pic_url,
              message_count: externalData._count?.Message || localInstance.message_count,
              contact_count: externalData._count?.Contact || localInstance.contact_count,
              chat_count: externalData._count?.Chat || localInstance.chat_count,
              last_seen: externalData.updatedAt || localInstance.last_seen,
              phone_number: externalData.ownerJid ? 
                formatPhoneNumber(externalData.ownerJid.replace('@s.whatsapp.net', '')) : 
                localInstance.phone_number,
              api_key: externalData.token || localInstance.api_key
            };
          } else {
            console.log(`⚠️ Instância ${localInstance.instance_name} não encontrada no webhook, usando dados locais`);
            return {
              ...localInstance,
              status: 'disconnected' as const
            };
          }
        });
      }

      // Fallback para garantir que sempre seja um array
      if (!instancesWithRealTimeData) {
        console.warn('⚠️ Nenhuma instância processada, usando array vazio');
        instancesWithRealTimeData = [];
      }

      setInstances(instancesWithRealTimeData);
      console.log('✅ Carregamento concluído!', {
        role: profile.role,
        totalInstances: instancesWithRealTimeData.length,
        localInstances: localInstances?.length || 0,
        webhookInstances: externalInstances.length
      });

    } catch (error: any) {
      console.error('Erro ao carregar instâncias:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Função auxiliar para formatar telefone
  const formatPhoneNumber = (phone: string) => {
    if (!phone) return phone;
    // Formato brasileiro: +55 (11) 99999-9999
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 13 && cleaned.startsWith('55')) {
      return `+55 (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    }
    return `+${cleaned}`;
  };

  // Criar nova instância
  const createInstance = async (instanceData: {
    instance_name: string;
    phone_number?: string;
    assigned_user_id?: string; // Para gestores atribuírem a corretores
  }) => {
    try {
      if (!profile) throw new Error('Perfil não encontrado');
      
      // Verificar se o usuário tem permissão para criar instâncias (apenas gestores/admins)
      if (profile.role === 'corretor') {
        throw new Error('Apenas gestores e administradores podem criar instâncias WhatsApp');
      }

      // Definir para qual usuário a instância será atribuída
      const targetUserId = instanceData.assigned_user_id || profile.id;
      
      console.log('🔍 Debug criação instância:', {
        currentUser: profile.id,
        currentUserRole: profile.role,
        targetUserId: targetUserId,
        assignedUserId: instanceData.assigned_user_id,
        instanceName: instanceData.instance_name
      });

      // Gerar UUID para sessionId
      const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c == 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };

      // 1. Criar instância no sistema externo (WhatsApp)
      let externalData = null;
      
      try {
        const sessionId = generateUUID();
        console.log('🆕 Chamando endpoint: POST /webhook/criar-instancia para', instanceData.instance_name);
        console.log('📋 Parâmetros enviados:', {
          instanceName: instanceData.instance_name,
          phoneNumber: instanceData.phone_number,
          sessionId: sessionId
        });
        
        const externalResponse = await fetch('https://webhooklabz.n8nlabz.com.br/webhook/criar-instancia', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          mode: 'cors',
          body: JSON.stringify({
            instanceName: instanceData.instance_name,
            phoneNumber: instanceData.phone_number,
            sessionId: sessionId
          }),
        });

        if (!externalResponse.ok) {
          const errorData = await externalResponse.text();
          console.warn('Erro no sistema externo (continuando com criação local):', errorData);
          // Não falhar aqui, apenas avisar
        } else {
          externalData = await externalResponse.json();
          console.log('🔗 Instância criada no sistema externo:', externalData);
        }
      } catch (externalError) {
        console.warn('Sistema externo indisponível (continuando com criação local):', externalError);
        // Continuar mesmo se o sistema externo falhar
      }

      // 2. Salvar instância no banco de dados local (controle de usuário)
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .insert({
          user_id: targetUserId, // Atribuir para o usuário selecionado ou para o gestor
          instance_name: instanceData.instance_name,
          phone_number: instanceData.phone_number,
          webhook_url: `https://webhooklabz.n8nlabz.com.br/webhook/${instanceData.instance_name}`,
          status: 'qr_code', // Inicialmente aguardando QR code
          api_key: externalData?.data?.token || null
        })
        .select(`
          *,
          user_profile:user_profiles(full_name, email, role)
        `)
        .single();

      if (error) {
        console.error('❌ Erro detalhado na inserção:', {
          error,
          errorMessage: error.message,
          errorDetails: error.details,
          errorHint: error.hint,
          targetUserId,
          instanceData
        });
        
        // Se falhar ao salvar localmente, tentar deletar a instância externa (se foi criada)
        if (externalData) {
          try {
            await fetch('https://webhooklabz.n8nlabz.com.br/webhook/deletar-instancia', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              mode: 'cors',
              body: JSON.stringify({
                instanceName: instanceData.instance_name
              }),
            });
          } catch (deleteError) {
            console.warn('Erro ao limpar instância externa após falha local:', deleteError);
          }
        }
        throw error;
      }

      // 3. Combinar dados local + externo
      const combinedData = {
        ...data,
        // Dados do sistema externo se disponíveis
        qr_code: externalData?.data?.qrcode || null,
        api_key: externalData?.data?.token || null,
        status: externalData?.success ? 'qr_code' : 'disconnected'
      };

      setInstances(prev => [combinedData, ...prev]);
      return combinedData;

    } catch (error: any) {
      console.error('Erro ao criar instância:', error);
      throw error;
    }
  };

  // Atualizar status da instância
  const updateInstanceStatus = async (instanceId: string, status: WhatsAppInstance['status']) => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .update({ 
          status,
          last_seen: new Date().toISOString()
        })
        .eq('id', instanceId)
        .select(`
          *,
          user_profile:user_profiles(full_name, email, role)
        `)
        .single();

      if (error) throw error;

      setInstances(prev => 
        prev.map(instance => 
          instance.id === instanceId ? data : instance
        )
      );

      return data;

    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      throw error;
    }
  };

  // Deletar instância (apenas próprias instâncias ou se for gestor)
  const deleteInstance = async (instanceId: string) => {
    try {
      // 1. Buscar dados da instância antes de deletar
      const instanceToDelete = instances.find(inst => inst.id === instanceId);
      if (!instanceToDelete) {
        throw new Error('Instância não encontrada');
      }

      // 2. Deletar do sistema externo primeiro
      try {
        console.log('🗑️ Chamando endpoint: POST /webhook/deletar-instancia para', instanceToDelete.instance_name);
        
        const response = await fetch(`https://webhooklabz.n8nlabz.com.br/webhook/deletar-instancia`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          mode: 'cors',
          body: JSON.stringify({
            instanceName: instanceToDelete.instance_name
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.warn('❌ Erro HTTP ao deletar instância externa:', response.status, response.statusText);
          console.warn('📝 Resposta do servidor:', errorText);
          throw new Error(`Erro no sistema externo (${response.status})`);
        }

        const responseData = await response.json();
        console.log(`🗑️ Resposta da deleção externa:`, responseData);
        
        if (!responseData.success) {
          throw new Error(responseData.message || 'Falha ao deletar no sistema externo');
        }

        console.log(`✅ Instância ${instanceToDelete.instance_name} deletada do sistema externo com sucesso`);
      } catch (externalError: any) {
        console.error('❌ Erro ao deletar do sistema externo:', externalError.message);
        throw new Error(`Falha ao deletar no sistema externo: ${externalError.message}`);
      }

      // 3. Deletar do banco de dados local apenas se a deleção externa foi bem-sucedida
      const { error } = await supabase
        .from('whatsapp_instances')
        .delete()
        .eq('id', instanceId);

      if (error) {
        console.error('❌ Erro ao deletar do Supabase:', error);
        throw new Error(`Erro ao deletar do banco local: ${error.message}`);
      }

      // 4. Atualizar estado local
      setInstances(prev => prev.filter(instance => instance.id !== instanceId));
      console.log(`✅ Instância ${instanceToDelete.instance_name} deletada completamente`);

    } catch (error: any) {
      console.error('❌ Erro completo ao deletar instância:', error);
      throw error;
    }
  };

  // Conectar instância via endpoint
  const connectInstance = async (instanceId: string) => {
    try {
      const instance = instances.find(inst => inst.id === instanceId);
      if (!instance) {
        throw new Error('Instância não encontrada');
      }

      console.log('🔗 Chamando endpoint: POST /webhook/conectar-instancia para', instance.instance_name);

      const response = await fetch('https://webhooklabz.n8nlabz.com.br/webhook/conectar-instancia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        mode: 'cors',
        body: JSON.stringify({
          instanceName: instance.instance_name
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn('❌ Erro HTTP ao conectar instância:', response.status, response.statusText);
        console.warn('📝 Resposta do servidor:', errorText);
        throw new Error(`Erro ao conectar instância (${response.status})`);
      }

      const data = await response.json();
      console.log(`🔗 Resposta da conexão:`, data);

      if (data.success) {
        // Atualizar status no Supabase
        await updateInstanceStatus(instanceId, 'connected');
        console.log(`✅ Instância ${instance.instance_name} conectada com sucesso`);
        return data;
      } else {
        throw new Error(data.message || 'Falha ao conectar instância');
      }

    } catch (error: any) {
      console.error('❌ Erro ao conectar instância:', error);
      throw error;
    }
  };

  // Desconectar instância via endpoint
  const disconnectInstance = async (instanceId: string) => {
    try {
      const instance = instances.find(inst => inst.id === instanceId);
      if (!instance) {
        throw new Error('Instância não encontrada');
      }

      console.log('🔌 Chamando endpoint: POST /webhook/desconectar-instancia para', instance.instance_name);

      const response = await fetch('https://webhooklabz.n8nlabz.com.br/webhook/desconectar-instancia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        mode: 'cors',
        body: JSON.stringify({
          instanceName: instance.instance_name
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn('❌ Erro HTTP ao desconectar instância:', response.status, response.statusText);
        console.warn('📝 Resposta do servidor:', errorText);
        throw new Error(`Erro ao desconectar instância (${response.status})`);
      }

      const data = await response.json();
      console.log(`🔌 Resposta da desconexão:`, data);

      if (data.success) {
        // Atualizar status no Supabase
        await updateInstanceStatus(instanceId, 'disconnected');
        console.log(`✅ Instância ${instance.instance_name} desconectada com sucesso`);
        return data;
      } else {
        throw new Error(data.message || 'Falha ao desconectar instância');
      }

    } catch (error: any) {
      console.error('❌ Erro ao desconectar instância:', error);
      throw error;
    }
  };

  // Gerar QR Code para conexão
  const generateQrCode = async (instanceId: string): Promise<string | null> => {
    try {
      const instance = instances.find(inst => inst.id === instanceId);
      if (!instance) {
        throw new Error('Instância não encontrada');
      }

      console.log('📱 Chamando endpoint: POST /webhook/puxar-qrcode para', instance.instance_name);

      const response = await fetch(`https://webhooklabz.n8nlabz.com.br/webhook/puxar-qrcode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        mode: 'cors',
        body: JSON.stringify({
          instanceName: instance.instance_name
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn('❌ Erro HTTP ao gerar QR code:', response.status, response.statusText);
        console.warn('📝 Resposta do servidor:', errorText);
        throw new Error(`Sistema externo indisponível (${response.status}). Verifique se a instância foi criada corretamente.`);
      }

      // Verificar se a resposta tem conteúdo
      const responseText = await response.text();
      console.log('📥 Resposta bruta do QR code:', responseText);

      if (!responseText || responseText.trim() === '') {
        throw new Error('Resposta vazia do servidor. A instância pode não ter sido criada corretamente.');
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Erro ao fazer parse do JSON:', parseError);
        console.error('📝 Conteúdo que falhou no parse:', responseText);
        throw new Error('Resposta inválida do servidor. Tente novamente em alguns segundos.');
      }

      console.log('✅ Dados parseados do QR code:', data);
      
      if (data.success && data.data?.qrcode) {
        // Atualizar status da instância
        await updateInstanceStatus(instanceId, 'qr_code');
        return data.data.qrcode;
      } else if (data.success && data.qrcode) {
        // Formato alternativo da resposta
        await updateInstanceStatus(instanceId, 'qr_code');
        return data.qrcode;
      } else if (data.success && data.data?.base64) {
        // Novo formato com base64
        await updateInstanceStatus(instanceId, 'qr_code');
        return data.data.base64;
      } else {
        console.warn('⚠️ QR code não encontrado na resposta:', data);
        throw new Error(data.message || 'QR code não disponível. Verifique se a instância foi criada corretamente.');
      }

    } catch (error: any) {
      console.error('❌ Erro completo ao gerar QR code:', error);
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        throw new Error('Erro de conexão com o servidor. Verifique sua internet e tente novamente.');
      }
      throw error;
    }
  };

  // Carregar chats de uma instância específica
  const loadChats = async (instanceId: string) => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_chats')
        .select('*')
        .eq('instance_id', instanceId)
        .eq('is_archived', false)
        .order('last_message_time', { ascending: false, nullsFirst: false });

      if (error) throw error;

      setChats(data || []);
      return data || [];

    } catch (error: any) {
      console.error('Erro ao carregar chats:', error);
      throw error;
    }
  };

  // Criar novo chat
  const createChat = async (chatData: {
    instance_id: string;
    contact_phone: string;
    contact_name?: string;
    lead_id?: string;
    property_id?: string;
  }) => {
    try {
      if (!profile) throw new Error('Perfil não encontrado');

      const { data, error } = await supabase
        .from('whatsapp_chats')
        .insert({
          ...chatData,
          user_id: profile.id,
        })
        .select()
        .single();

      if (error) throw error;

      setChats(prev => [data, ...prev]);
      return data;

    } catch (error: any) {
      console.error('Erro ao criar chat:', error);
      throw error;
    }
  };

  // Carregar mensagens de um chat
  const loadMessages = async (chatId: string): Promise<WhatsAppMessage[]> => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('timestamp', { ascending: true });

      if (error) throw error;

      return data || [];

    } catch (error: any) {
      console.error('Erro ao carregar mensagens:', error);
      throw error;
    }
  };

  // Enviar mensagem
  const sendMessage = async (messageData: {
    chat_id: string;
    instance_id: string;
    contact_phone: string;
    message_type: WhatsAppMessage['message_type'];
    content: string;
    media_url?: string;
    caption?: string;
  }) => {
    try {
      if (!profile) throw new Error('Perfil não encontrado');

      const { data, error } = await supabase
        .from('whatsapp_messages')
        .insert({
          ...messageData,
          user_id: profile.id,
          from_me: true,
        })
        .select()
        .single();

      if (error) throw error;

      // Aqui você integraria com a API do WhatsApp para enviar a mensagem real

      return data;

    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error);
      throw error;
    }
  };

  // Marcar mensagens como lidas
  const markAsRead = async (chatId: string) => {
    try {
      const { error } = await supabase
        .from('whatsapp_chats')
        .update({ unread_count: 0 })
        .eq('id', chatId);

      if (error) throw error;

      setChats(prev => 
        prev.map(chat => 
          chat.id === chatId ? { ...chat, unread_count: 0 } : chat
        )
      );

    } catch (error: any) {
      console.error('Erro ao marcar como lida:', error);
      throw error;
    }
  };

  // Filtrar instâncias por usuário (para gestores)
  const getInstancesByUser = (userId: string) => {
    return instances.filter(instance => instance.user_id === userId);
  };

  // Buscar todos os usuários (para gestores atribuírem instâncias)
  const loadAllUsers = async () => {
    try {
      if (!isManager) {
        console.warn('Apenas gestores podem carregar lista de usuários');
        return [];
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, email, role')
        .order('role', { ascending: false }) // Admin, Gestor, Corretor
        .order('full_name', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error: any) {
      console.error('Erro ao carregar usuários:', error);
      return [];
    }
  };

  // Obter estatísticas das instâncias
  const getInstanceStats = () => {
    return {
      total_instances: instances.length,
      connected_instances: instances.filter(i => i.status === 'connected').length,
      total_chats: instances.reduce((sum, i) => sum + (i.chat_count || 0), 0),
      total_messages: instances.reduce((sum, i) => sum + (i.message_count || 0), 0),
      unread_messages: 0 // Será calculado quando tivermos dados dos chats
    };
  };

  // Configurar instância
  const configureInstance = async (instanceName: string, config: any) => {
    try {
      console.log('⚙️ Chamando endpoint: POST /webhook/config-instancia para', instanceName);
      
      const response = await fetch('https://webhooklabz.n8nlabz.com.br/webhook/config-instancia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        mode: 'cors',
        body: JSON.stringify({
          instanceName,
          ...config
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn('Erro ao configurar instância:', response.status, errorText);
        throw new Error(`Erro ao configurar instância (${response.status})`);
      }

      const data = await response.json();
      console.log(`⚙️ Instância ${instanceName} configurada:`, data);
      
      return data;

    } catch (error: any) {
      console.error('Erro ao configurar instância:', error);
      throw error;
    }
  };

  // Editar configuração da instância
  const editInstanceConfig = async (instanceName: string, newConfig: any) => {
    try {
      console.log('✏️ Chamando endpoint: POST /webhook/edit-config-instancia para', instanceName);
      
      const response = await fetch('https://webhooklabz.n8nlabz.com.br/webhook/edit-config-instancia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        mode: 'cors',
        body: JSON.stringify({
          instanceName,
          ...newConfig
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn('Erro ao editar configuração da instância:', response.status, errorText);
        throw new Error(`Erro ao editar configuração (${response.status})`);
      }

      const data = await response.json();
      console.log(`✏️ Configuração da instância ${instanceName} editada:`, data);
      
      return data;

    } catch (error: any) {
      console.error('Erro ao editar configuração da instância:', error);
      throw error;
    }
  };



  useEffect(() => {
    if (profile) {
      loadInstances();
    }
  }, [profile, isManager]);

  return {
    instances,
    chats,
    loading,
    error,
    createInstance,
    updateInstanceStatus,
    deleteInstance,
    generateQrCode,
    configureInstance,
    editInstanceConfig,
    loadChats,
    createChat,
    loadMessages,
    sendMessage,
    markAsRead,
    getInstancesByUser,
    getInstanceStats,
    loadAllUsers,
    refreshInstances: loadInstances,
    canCreateInstances: isManager, // Helper para saber se pode criar instâncias
    connectInstance,
    disconnectInstance
  };
} 