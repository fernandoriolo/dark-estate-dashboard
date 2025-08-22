/**
 * Queries SQL otimizadas para nova arquitetura baseada em imobipro_messages
 * Testadas e validadas no Supabase
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  InstanciaCorretorInfo,
  ConversaSessionInfo,
  MensagemInfo,
  BuscarInstanciasParams,
  BuscarConversasParams,
  BuscarMensagensParams,
  EnviarMensagemParams
} from '@/types/imobiproChats';

// ==========================================
// QUERIES PARA 1ª COLUNA - INSTÂNCIAS/CORRETORES
// ==========================================

/**
 * Busca todas as instâncias com seus corretores e contagem de conversas
 * Usa método simplificado com queries separadas para compatibilidade
 */
export async function buscarInstanciasCorretores(params: BuscarInstanciasParams): Promise<InstanciaCorretorInfo[]> {
  console.log('🔍 Buscando instâncias/corretores:', params);

  try {
    // 1. Buscar todas as instâncias únicas das mensagens
    const { data: instancias, error: instanciasError } = await supabase
      .from('imobipro_messages')
      .select('instancia')
      .not('instancia', 'is', null);

    if (instanciasError) {
      console.error('❌ Erro ao buscar instâncias na tabela imobipro_messages:', instanciasError);
      console.log('⚠️ Pode ser problema de RLS. Tentando buscar na tabela whatsapp_instances...');
      
      // Fallback: buscar na tabela whatsapp_instances
      try {
        const { data: instanciasWA, error: errorWA } = await supabase
          .from('whatsapp_instances')
          .select(`
            instance_name,
            user_id,
            status,
            is_active,
            user_profiles(full_name)
          `);

        if (!errorWA && instanciasWA && instanciasWA.length > 0) {
          console.log('✅ Encontradas instâncias via whatsapp_instances:', instanciasWA.length);
          const instanciasFallback = instanciasWA.map(inst => ({
            instancia: inst.instance_name,
            corretor_id: inst.user_id,
            corretor_nome: inst.user_profiles?.full_name || null,
            instance_display_name: inst.instance_name,
            total_conversas: 0, // Não sabemos o total sem acesso à imobipro_messages
            is_sdr: inst.instance_name === 'sdr',
            status: inst.status,
            is_active: inst.is_active
          }));

          // Adicionar SDR se não estiver na lista
          if (!instanciasFallback.some(i => i.is_sdr)) {
            instanciasFallback.unshift({
              instancia: 'sdr',
              corretor_id: null,
              corretor_nome: null,
              instance_display_name: 'Agente SDR',
              total_conversas: 0,
              is_sdr: true,
              status: 'active',
              is_active: true
            });
          }

          return instanciasFallback;
        }
      } catch (fallbackError) {
        console.error('❌ Erro no fallback também:', fallbackError);
      }
      
      // Fallback final: retornar apenas SDR se tudo falhar
      return [{
        instancia: 'sdr',
        corretor_id: null,
        corretor_nome: null,
        instance_display_name: 'Agente SDR',
        total_conversas: 0,
        is_sdr: true,
        status: 'active',
        is_active: true
      }];
    }

    // Obter instâncias únicas
    const instanciasUnicas = [...new Set(instancias?.map(i => i.instancia) || [])];
    console.log('📋 Instâncias encontradas:', instanciasUnicas);
    console.log('📊 Total de registros na tabela:', instancias?.length);
    console.log('🔍 Role do usuário:', params.userRole);
    console.log('👤 User ID:', params.userId);

    const resultados: InstanciaCorretorInfo[] = [];

    // 2. Para cada instância, buscar dados do corretor e contar conversas
    for (const instancia of instanciasUnicas) {
      // Contar conversas da instância
      const { data: conversas, error: conversasError } = await supabase
        .from('imobipro_messages')
        .select('session_id')
        .eq('instancia', instancia);

      if (conversasError) {
        console.warn(`⚠️ Erro ao contar conversas para ${instancia}:`, conversasError);
        continue;
      }

      const totalConversas = new Set(conversas?.map(c => c.session_id) || []).size;

      // Se é SDR, não buscar dados de corretor
      if (instancia === 'sdr') {
        resultados.push({
          instancia: 'sdr',
          corretor_id: null,
          corretor_nome: null,
          instance_display_name: 'Agente SDR',
          total_conversas: totalConversas,
          is_sdr: true,
          status: 'active',
          is_active: true
        });
        continue;
      }

      // Buscar dados do corretor pela instância
      const { data: instanciaData, error: instanciaError } = await supabase
        .from('whatsapp_instances')
        .select(`
          instance_name,
          user_id,
          status,
          is_active,
          user_profiles!inner(full_name)
        `)
        .eq('instance_name', instancia)
        .single();

      if (instanciaError || !instanciaData) {
        // Instância sem corretor vinculado
        resultados.push({
          instancia,
          corretor_id: null,
          corretor_nome: null,
          instance_display_name: instancia,
          total_conversas: totalConversas,
          is_sdr: false,
          status: 'unknown',
          is_active: false
        });
        continue;
      }

      resultados.push({
        instancia,
        corretor_id: instanciaData.user_id,
        corretor_nome: instanciaData.user_profiles?.full_name || null,
        instance_display_name: instanciaData.instance_name || instancia,
        total_conversas: totalConversas,
        is_sdr: false,
        status: instanciaData.status,
        is_active: instanciaData.is_active
      });
    }

    // 3. Filtrar por papel do usuário se necessário
    let resultadosFiltrados = resultados;
    console.log('📊 Resultados antes do filtro por role:', resultados.length);
    console.log('🔍 Todas as instâncias encontradas:', resultados.map(r => ({ 
      instancia: r.instancia, 
      corretor_id: r.corretor_id, 
      is_sdr: r.is_sdr, 
      total_conversas: r.total_conversas 
    })));
    
    if (params.userRole === 'corretor' && params.userId) {
      console.log('🔒 Aplicando filtro de corretor para user ID:', params.userId);
      resultadosFiltrados = resultados.filter(r => {
        const match = r.corretor_id === params.userId || r.is_sdr;
        console.log(`🎯 Instância ${r.instancia}: corretor_id=${r.corretor_id}, is_sdr=${r.is_sdr}, match=${match}`);
        return match;
      });
      console.log('📊 Resultados após filtro de corretor:', resultadosFiltrados.length);
    } else {
      console.log('👑 Usuário é gestor/admin, sem filtro por role - mostrando todas as instâncias');
      console.log('📊 Total de instâncias retornadas:', resultadosFiltrados.length);
    }

    // 4. Ordenar: SDR primeiro, depois por conversas, depois por nome
    resultadosFiltrados.sort((a, b) => {
      if (a.is_sdr && !b.is_sdr) return -1;
      if (!a.is_sdr && b.is_sdr) return 1;
      if (a.total_conversas !== b.total_conversas) {
        return b.total_conversas - a.total_conversas;
      }
      return (a.corretor_nome || '').localeCompare(b.corretor_nome || '');
    });

    console.log('✅ Instâncias processadas:', resultadosFiltrados.length);
    return resultadosFiltrados;

  } catch (error) {
    console.error('❌ Erro ao buscar instâncias:', error);
    throw new Error(`Erro ao buscar instâncias: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

// ==========================================
// QUERIES PARA 2ª COLUNA - CONVERSAS POR INSTÂNCIA
// ==========================================

/**
 * Busca conversas usando método compatível (com fallback para função otimizada)
 */
export async function buscarConversasPorInstancia(params: BuscarConversasParams): Promise<ConversaSessionInfo[]> {
  console.log('💬 Buscando conversas para instância:', params.instancia);

  try {
    // Tentar função SQL otimizada primeiro, com fallback para método básico
    try {
      const { data: conversas, error } = await supabase
        .rpc('buscar_conversas_keyset', {
          p_instancia: params.instancia,
          p_cursor_time: params.cursorTime || null,
          p_cursor_session: params.cursorSession || null,
          p_limit: params.limit || 50,
          p_search_term: params.searchTerm || null
        });

      if (!error && conversas) {
        // Processar dados da função SQL para o formato esperado
        const resultado: ConversaSessionInfo[] = conversas.map(conversa => {
          const messageContent = conversa.last_message as any;
          const clienteNome = extrairNomeCliente(messageContent?.content || '');
          
          return {
            session_id: conversa.session_id,
            instancia: conversa.instancia,
            cliente_nome: clienteNome,
            primeiro_contato: messageContent?.content || 'Sem conteúdo',
            ultima_mensagem: messageContent?.content || '',
            ultima_mensagem_time: conversa.last_time,
            total_mensagens: conversa.total_mensagens,
            primeira_mensagem_time: conversa.first_time,
            has_unread: false
          };
        });

        console.log('✅ Conversas processadas (SQL otimizada):', resultado.length);
        return resultado;
      }
    } catch (sqlError) {
      console.log('⚠️ Função SQL otimizada não disponível, usando método de fallback');
    }

    // Fallback: buscar conversas diretamente da tabela imobipro_messages
    const { data: mensagens, error: mensagensError } = await supabase
      .from('imobipro_messages')
      .select('session_id, instancia, message, data')
      .eq('instancia', params.instancia)
      .order('data', { ascending: false });

    if (mensagensError) {
      console.error('❌ Erro ao buscar conversas (fallback):', mensagensError);
      throw mensagensError;
    }

    if (!mensagens || mensagens.length === 0) {
      console.log('📭 Nenhuma conversa encontrada para instância:', params.instancia);
      return [];
    }

    // Agrupar por session_id e criar conversas
    const conversasMap = new Map<string, {
      session_id: string;
      instancia: string;
      primeira_mensagem: any;
      ultima_mensagem: any;
      ultima_mensagem_time: string;
      primeira_mensagem_time: string;
      total_mensagens: number;
    }>();

    mensagens.forEach(msg => {
      const sessionId = msg.session_id;
      
      if (!conversasMap.has(sessionId)) {
        conversasMap.set(sessionId, {
          session_id: sessionId,
          instancia: msg.instancia,
          primeira_mensagem: msg.message,
          ultima_mensagem: msg.message,
          ultima_mensagem_time: msg.data,
          primeira_mensagem_time: msg.data,
          total_mensagens: 1
        });
      } else {
        const conversa = conversasMap.get(sessionId)!;
        conversa.total_mensagens++;
        
        // Atualizar primeira mensagem se esta for mais antiga
        if (msg.data < conversa.primeira_mensagem_time) {
          conversa.primeira_mensagem = msg.message;
          conversa.primeira_mensagem_time = msg.data;
        }
        
        // Atualizar última mensagem se esta for mais recente
        if (msg.data > conversa.ultima_mensagem_time) {
          conversa.ultima_mensagem = msg.message;
          conversa.ultima_mensagem_time = msg.data;
        }
      }
    });

    // Converter para array e aplicar filtros
    let conversasArray = Array.from(conversasMap.values());

    // Aplicar filtro de busca se fornecido
    if (params.searchTerm && params.searchTerm.trim()) {
      const termoBusca = params.searchTerm.toLowerCase();
      conversasArray = conversasArray.filter(conversa => {
        const conteudo = conversa.ultima_mensagem?.content?.toLowerCase() || '';
        return conteudo.includes(termoBusca) || conversa.session_id.toLowerCase().includes(termoBusca);
      });
    }

    // Ordenar por última mensagem (mais recente primeiro)
    conversasArray.sort((a, b) => new Date(b.ultima_mensagem_time).getTime() - new Date(a.ultima_mensagem_time).getTime());

    // Aplicar paginação
    const limit = params.limit || 50;
    conversasArray = conversasArray.slice(0, limit);

    // Converter para formato esperado
    const resultado: ConversaSessionInfo[] = conversasArray.map(conversa => {
      const messageContent = conversa.ultima_mensagem as any;
      const clienteNome = extrairNomeCliente(messageContent?.content || '');
      
      return {
        session_id: conversa.session_id,
        instancia: conversa.instancia,
        cliente_nome: clienteNome,
        primeiro_contato: conversa.primeira_mensagem?.content || 'Sem conteúdo',
        ultima_mensagem: messageContent?.content || '',
        ultima_mensagem_time: conversa.ultima_mensagem_time,
        total_mensagens: conversa.total_mensagens,
        primeira_mensagem_time: conversa.primeira_mensagem_time,
        has_unread: false
      };
    });

    console.log('✅ Conversas processadas (método fallback):', resultado.length);
    return resultado;

  } catch (error) {
    console.error('❌ Erro ao buscar conversas:', error);
    throw new Error(`Erro ao buscar conversas: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

/**
 * Busca leads vinculados ao corretor da instância selecionada (método fallback)
 * Mantido para compatibilidade com instâncias que não têm conversas reais
 */
export async function buscarLeadsPorInstancia(params: BuscarConversasParams): Promise<ConversaSessionInfo[]> {
  console.log('👥 Buscando leads vinculados ao corretor da instância:', params.instancia);

  try {
    // 1. Primeiro, buscar o corretor vinculado à instância
    let corretorId: string | null = null;
    
    if (params.instancia !== 'sdr') {
      const { data: instanciaData } = await supabase
        .from('whatsapp_instances')
        .select('user_id')
        .eq('instance_name', params.instancia)
        .single();
      
      corretorId = instanciaData?.user_id || null;
    }
    
    // 2. Buscar leads vinculados ao corretor
    let query = supabase
      .from('leads')
      .select('id, nome, phone, email, created_at')
      .order('created_at', { ascending: false });

    // Filtrar por corretor se não for SDR
    if (corretorId) {
      query = query.eq('id_corretor_responsavel', corretorId);
    } else if (params.instancia === 'sdr') {
      // Para SDR, pegar leads sem corretor ou leads do SDR
      query = query.or('id_corretor_responsavel.is.null,canal.eq.sdr_whatsapp');
    } else {
      // Se não encontrou corretor, retornar vazio
      console.log('⚠️ Corretor não encontrado para instância:', params.instancia);
      return [];
    }

    // Aplicar filtro de busca se fornecido
    if (params.searchTerm && params.searchTerm.trim()) {
      query = query.or(`nome.ilike.%${params.searchTerm.trim()}%,phone.ilike.%${params.searchTerm.trim()}%,email.ilike.%${params.searchTerm.trim()}%`);
    }

    // Aplicar keyset pagination se fornecido
    if (params.cursorTime) {
      query = query.lt('created_at', params.cursorTime);
    }

    // Aplicar paginação
    if (params.limit) {
      query = query.limit(params.limit);
    }

    const { data: leads, error } = await query;

    if (error) {
      console.error('❌ Erro ao buscar leads:', error);
      throw error;
    }

    if (!leads || leads.length === 0) {
      console.log('📭 Nenhum lead encontrado para instância:', params.instancia);
      return [];
    }

    // 3. Converter leads para formato ConversaSessionInfo
    const resultado: ConversaSessionInfo[] = leads.map(lead => ({
      session_id: `lead_${lead.id}`, // Identificador único baseado no lead ID
      instancia: params.instancia,
      cliente_nome: lead.nome,
      primeiro_contato: `Lead: ${lead.nome} - ${lead.phone}`, // Informações do lead
      ultima_mensagem: `Email: ${lead.email || 'Não informado'}`,
      ultima_mensagem_time: lead.created_at,
      total_mensagens: 1, // Como é um lead, sempre 1
      primeira_mensagem_time: lead.created_at,
      has_unread: false,
      lead_id: lead.id, // Adicionar ID do lead para referência
      lead_phone: lead.phone,
      lead_email: lead.email
    }));

    console.log('✅ Leads processados:', resultado.length);
    return resultado;

  } catch (error) {
    console.error('❌ Erro ao buscar leads:', error);
    throw new Error(`Erro ao buscar leads: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

// ==========================================
// QUERIES PARA 3ª COLUNA - MENSAGENS DA CONVERSA
// ==========================================

/**
 * Busca mensagens de uma sessão específica (agora baseada em lead)
 * ALTERAÇÃO: Se session_id tem formato lead_${id}, busca mensagens relacionadas ao lead
 */
export async function buscarMensagensDaSessao(params: BuscarMensagensParams): Promise<MensagemInfo[]> {
  console.log('📝 Buscando mensagens para:', params.sessionId);

  try {
    // Verificar se é um lead_id (formato: lead_${id})
    if (params.sessionId.startsWith('lead_')) {
      const leadId = params.sessionId.replace('lead_', '');
      
      // Buscar informações do lead
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('id, nome, phone, email, created_at')
        .eq('id', leadId)
        .single();
      
      if (leadError || !lead) {
        console.log('📭 Lead não encontrado:', leadId);
        return [];
      }
      
      // Buscar mensagens relacionadas ao telefone/nome do lead
      const { data: mensagens, error } = await supabase
        .from('imobipro_messages')
        .select('id, session_id, message, data, instancia')
        .or(`message->>content.ilike.%${lead.phone}%,message->>content.ilike.%${lead.nome}%`)
        .order('data', { ascending: true });
      
      if (error) {
        console.error('❌ Erro ao buscar mensagens do lead:', error);
        throw error;
      }
      
      // Se não há mensagens, criar uma mensagem virtual com dados do lead
      if (!mensagens || mensagens.length === 0) {
        return [{
          id: 0,
          session_id: params.sessionId,
          type: 'human',
          content: `Lead: ${lead.nome}\nTelefone: ${lead.phone}\nEmail: ${lead.email || 'Não informado'}\nCriado em: ${new Date(lead.created_at).toLocaleString('pt-BR')}`,
          timestamp: lead.created_at,
          instancia: 'lead_info',
          is_from_client: true,
          has_tool_calls: false,
          metadata: { lead_id: lead.id, is_virtual: true }
        }];
      }
      
      // Processar mensagens encontradas
      const resultado: MensagemInfo[] = mensagens.map(msg => {
        const messageContent = msg.message as any;
        const type = messageContent?.type as 'human' | 'ai';
        const content = messageContent?.content || '';
        
        const hasToolCalls = messageContent?.tool_calls && 
                            Array.isArray(messageContent.tool_calls) && 
                            messageContent.tool_calls.length > 0;

        return {
          id: msg.id,
          session_id: msg.session_id,
          type,
          content,
          timestamp: msg.data,
          instancia: msg.instancia,
          is_from_client: type === 'human',
          has_tool_calls: hasToolCalls,
          metadata: messageContent?.additional_kwargs || {}
        };
      });
      
      // Adicionar informações do lead no início
      resultado.unshift({
        id: -1,
        session_id: params.sessionId,
        type: 'human',
        content: `📋 Lead Selecionado: ${lead.nome}\n📞 ${lead.phone}\n📧 ${lead.email || 'Email não informado'}`,
        timestamp: lead.created_at,
        instancia: 'lead_info',
        is_from_client: true,
        has_tool_calls: false,
        metadata: { lead_id: lead.id, is_lead_info: true }
      });
      
      return resultado;
    }
    
    // Código original para sessões normais com fallback para função otimizada
    if (!validarSessionId(params.sessionId) && !params.sessionId.startsWith('chat_')) {
      throw new Error('Session ID inválido');
    }

    // Tentar usar função SQL otimizada primeiro, com fallback para query básica
    let mensagens: any[] = [];
    let error: any = null;
    
    try {
      const { data: mensagensOtimizadas, error: errorOtimizado } = await supabase
        .rpc('buscar_mensagens_keyset', {
          p_session_id: params.sessionId,
          p_cursor_data: params.cursorData || null,
          p_cursor_id: params.cursorId || null,
          p_limit: params.limit || 50,
          p_ascending: params.ascending !== false // default true
        });

      if (!errorOtimizado && mensagensOtimizadas) {
        mensagens = mensagensOtimizadas;
      } else {
        throw new Error('Função otimizada não disponível');
      }
    } catch (sqlError) {
      console.log('⚠️ Função SQL otimizada não disponível, usando query básica');
      
      // Fallback: query básica
      let query = supabase
        .from('imobipro_messages')
        .select('id, session_id, message, data, instancia')
        .eq('session_id', params.sessionId)
        .order('data', { ascending: params.ascending !== false });

      if (params.limit) {
        query = query.limit(params.limit);
      }

      const { data: mensagensBasicas, error: errorBasico } = await query;
      
      if (errorBasico) {
        error = errorBasico;
      } else {
        mensagens = mensagensBasicas || [];
      }
    }

    if (error) {
      console.error('❌ Erro ao buscar mensagens:', error);
      throw error;
    }

    if (!mensagens || mensagens.length === 0) {
      console.log('📭 Nenhuma mensagem encontrada para sessão:', params.sessionId);
      return [];
    }

    const resultado: MensagemInfo[] = mensagens.map(msg => {
      const messageContent = msg.message as any;
      const type = messageContent?.type as 'human' | 'ai';
      const content = messageContent?.content || '';
      
      const hasToolCalls = messageContent?.tool_calls && 
                          Array.isArray(messageContent.tool_calls) && 
                          messageContent.tool_calls.length > 0;

      return {
        id: msg.id,
        session_id: msg.session_id,
        type,
        content,
        timestamp: msg.data,
        instancia: msg.instancia,
        is_from_client: type === 'human',
        has_tool_calls: Boolean(hasToolCalls),
        metadata: messageContent?.additional_kwargs || {}
      };
    });

    console.log('✅ Mensagens processadas:', resultado.length);
    return resultado;

  } catch (error) {
    console.error('❌ Erro ao buscar mensagens:', error);
    throw new Error(`Erro ao buscar mensagens: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

// ==========================================
// ENVIO DE MENSAGENS
// ==========================================

/**
 * Envia uma nova mensagem para uma sessão
 */
export async function enviarMensagem(params: EnviarMensagemParams): Promise<MensagemInfo> {
  console.log('📤 Enviando mensagem:', { sessionId: params.sessionId, contentLength: params.content.length });

  // Preparar payload JSONB
  const messagePayload = {
    type: params.type,
    content: params.content,
    tool_calls: [],
    additional_kwargs: {},
    response_metadata: {},
    invalid_tool_calls: []
  };

  const { data, error } = await supabase
    .from('imobipro_messages')
    .insert({
      session_id: params.sessionId,
      message: messagePayload,
      instancia: params.instancia,
      data: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Erro ao enviar mensagem:', error);
    throw new Error(`Erro ao enviar mensagem: ${error.message}`);
  }

  // Log de auditoria
  await supabase
    .from('audit_logs')
    .insert({
      actor_id: params.userId,
      action: 'message_sent_imobipro',
      resource: 'imobipro_messages',
      resource_id: data.id.toString(),
      meta: {
        session_id: params.sessionId,
        instancia: params.instancia,
        content_length: params.content.length,
        message_type: params.type,
        timestamp: new Date().toISOString()
      }
    });

  return {
    id: data.id,
    session_id: data.session_id,
    type: params.type,
    content: params.content,
    timestamp: data.data,
    instancia: data.instancia,
    is_from_client: false, // sempre false para mensagens enviadas pelo corretor
    has_tool_calls: false,
    metadata: {}
  };
}

// ==========================================
// UTILITÁRIOS
// ==========================================

/**
 * Extrai nome do cliente da primeira mensagem
 * TODO: Implementar regex mais sofisticada
 */
function extrairNomeCliente(primeiroContato: string): string | null {
  if (!primeiroContato) return null;

  // Patterns simples para extrair nome
  const patterns = [
    /meu nome é ([a-záàâãéèêíìôõóúçñ\s]+)/i,
    /me chamo ([a-záàâãéèêíìôõóúçñ\s]+)/i,
    /sou ([a-záàâãéèêíìôõóúçñ\s]+)/i,
  ];

  for (const pattern of patterns) {
    const match = primeiroContato.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  // Se não conseguir extrair, retornar "Cliente" como fallback
  return 'Cliente';
}

/**
 * Valida se um session_id é válido (UUID format)
 */
export function validarSessionId(sessionId: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(sessionId);
}