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

    if (instanciasError) throw instanciasError;

    // Obter instâncias únicas
    const instanciasUnicas = [...new Set(instancias?.map(i => i.instancia) || [])];
    console.log('📋 Instâncias encontradas:', instanciasUnicas);

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
    if (params.userRole === 'corretor' && params.userId) {
      resultadosFiltrados = resultados.filter(r => 
        r.corretor_id === params.userId || r.is_sdr
      );
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
 * Busca conversas de uma instância específica
 * Usa queries simplificadas para compatibilidade com Supabase client
 */
export async function buscarConversasPorInstancia(params: BuscarConversasParams): Promise<ConversaSessionInfo[]> {
  console.log('💬 Buscando conversas para instância:', params.instancia);

  try {
    // 1. Buscar todas as mensagens da instância
    let query = supabase
      .from('imobipro_messages')
      .select('session_id, message, data, instancia')
      .eq('instancia', params.instancia);

    // Aplicar filtro de busca se fornecido
    if (params.searchTerm && params.searchTerm.trim()) {
      // Buscar no conteúdo das mensagens
      query = query.or(`message->>content.ilike.%${params.searchTerm.trim()}%,session_id.ilike.%${params.searchTerm.trim()}%`);
    }

    const { data: mensagens, error } = await query;

    if (error) {
      console.error('❌ Erro ao buscar mensagens:', error);
      throw error;
    }

    if (!mensagens || mensagens.length === 0) {
      console.log('📭 Nenhuma mensagem encontrada para instância:', params.instancia);
      return [];
    }

    // 2. Agrupar mensagens por session_id
    const conversasPorSession = new Map<string, any[]>();
    mensagens.forEach(msg => {
      if (!conversasPorSession.has(msg.session_id)) {
        conversasPorSession.set(msg.session_id, []);
      }
      conversasPorSession.get(msg.session_id)!.push(msg);
    });

    // 3. Processar cada conversa
    const conversas: ConversaSessionInfo[] = [];
    
    for (const [sessionId, msgList] of conversasPorSession.entries()) {
      // Ordenar mensagens por data
      msgList.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

      const primeiraMensagem = msgList[0];
      const ultimaMensagem = msgList[msgList.length - 1];

      // Encontrar primeiro contato do cliente (type: 'human')
      const primeiroContatoCliente = msgList.find(msg => 
        msg.message?.type === 'human'
      );

      let clienteNome = null;
      let primeiroContato = null;

      if (primeiroContatoCliente) {
        primeiroContato = primeiroContatoCliente.message?.content || null;
        clienteNome = extrairNomeCliente(primeiroContato);
      }

      conversas.push({
        session_id: sessionId,
        instancia: params.instancia,
        cliente_nome: clienteNome,
        primeiro_contato: primeiroContato,
        ultima_mensagem: ultimaMensagem.message?.content || null,
        ultima_mensagem_time: ultimaMensagem.data,
        total_mensagens: msgList.length,
        primeira_mensagem_time: primeiraMensagem.data,
        has_unread: false // TODO: implementar lógica de não lidas
      });
    }

    // 4. Ordenar por última mensagem (mais recente primeiro)
    conversas.sort((a, b) => 
      new Date(b.ultima_mensagem_time).getTime() - new Date(a.ultima_mensagem_time).getTime()
    );

    // 5. Aplicar paginação se necessário
    let resultado = conversas;
    if (params.offset) {
      resultado = resultado.slice(params.offset);
    }
    if (params.limit) {
      resultado = resultado.slice(0, params.limit);
    }

    console.log('✅ Conversas processadas:', resultado.length);
    return resultado;

  } catch (error) {
    console.error('❌ Erro ao buscar conversas:', error);
    throw new Error(`Erro ao buscar conversas: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

// ==========================================
// QUERIES PARA 3ª COLUNA - MENSAGENS DA CONVERSA
// ==========================================

/**
 * Busca mensagens de uma sessão específica
 * Usa query simplificada para compatibilidade com Supabase client
 */
export async function buscarMensagensDaSessao(params: BuscarMensagensParams): Promise<MensagemInfo[]> {
  console.log('📝 Buscando mensagens da sessão:', params.sessionId);

  try {
    // Validar session_id
    if (!validarSessionId(params.sessionId)) {
      throw new Error('Session ID inválido');
    }

    // Buscar mensagens da sessão
    let query = supabase
      .from('imobipro_messages')
      .select('id, session_id, message, data, instancia')
      .eq('session_id', params.sessionId)
      .order('data', { ascending: true });

    // Aplicar paginação se necessário
    if (params.limit) {
      query = query.limit(params.limit);
    }
    if (params.offset) {
      query = query.range(params.offset, (params.offset + (params.limit || 50)) - 1);
    }

    const { data: mensagens, error } = await query;

    if (error) {
      console.error('❌ Erro ao buscar mensagens:', error);
      throw error;
    }

    if (!mensagens || mensagens.length === 0) {
      console.log('📭 Nenhuma mensagem encontrada para sessão:', params.sessionId);
      return [];
    }

    // Processar mensagens
    const resultado: MensagemInfo[] = mensagens.map(msg => {
      const messageContent = msg.message as any;
      const type = messageContent?.type as 'human' | 'ai';
      const content = messageContent?.content || '';
      
      // Verificar se tem tool_calls
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