/**
 * Hook otimizado para carregamento seletivo de chats com paginação keyset
 * Implementa arquitetura 3 colunas: Instâncias → Conversas → Mensagens
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type {
  UseImobiproChatsReturn,
  ImobiproChatsState,
  InstanciaCorretorInfo,
  ConversaSessionInfo,
  MensagemInfo
} from '@/types/imobiproChats';
import {
  buscarInstanciasCorretores,
  buscarConversasPorInstancia,
  buscarLeadsPorInstancia,
  buscarMensagensDaSessao,
  enviarMensagem
} from '@/services/imobiproQueries';

export function useOptimizedChats(): UseImobiproChatsReturn {
  const { profile } = useUserProfile();
  const abortControllerRef = useRef<AbortController | null>(null);
  const subscriptionRef = useRef<any>(null);

  // Estados principais com paginação
  const [state, setState] = useState<ImobiproChatsState>({
    // Estados de loading
    loading: false,
    instanciasLoading: false,
    conversasLoading: false,
    mensagensLoading: false,
    
    // Estados de erro
    error: null,
    
    // Dados
    instancias: [],
    conversas: [],
    mensagens: [],
    
    // Seleções
    selectedInstancia: null,
    selectedSession: null,
    
    // Busca
    searchTerm: '',

    // Paginação
    conversasHasMore: true,
    mensagensHasMore: true,
    conversasCursor: null,
    mensagensCursor: null
  });

  // Utilitário para cancelar requisições pendentes
  const cancelPendingRequests = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
  }, []);

  // Atualizar estado de forma segura
  const updateState = useCallback((updates: Partial<ImobiproChatsState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Utilitário para limpar subscriptions
  const cleanupSubscriptions = useCallback(() => {
    if (subscriptionRef.current) {
      console.log('🧹 Cancelando subscription anterior...');
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }
  }, []);

  // Configurar subscription para mensagens da sessão atual (apenas session ativo)
  const setupMessagesSubscription = useCallback((sessionId: string) => {
    cleanupSubscriptions();

    if (!sessionId || sessionId.startsWith('lead_')) {
      console.log('⏭️ Pulando subscription para lead ou sessão inválida');
      return;
    }

    console.log('📡 Configurando subscription OTIMIZADA para sessão:', sessionId);

    try {
      const subscription = supabase
        .channel(`optimized_messages_${sessionId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'imobipro_messages',
            filter: `session_id=eq.${sessionId}`
          },
          (payload) => {
            console.log('📨 Nova mensagem via realtime otimizado:', payload);
            
            if (payload.eventType === 'INSERT') {
              const novaRow = payload.new as any;
              const messageContent = novaRow.message as any;
              const type = messageContent?.type as 'human' | 'ai';
              
              const novaMensagem: MensagemInfo = {
                id: novaRow.id,
                session_id: novaRow.session_id,
                type,
                content: messageContent?.content || '',
                timestamp: novaRow.data,
                instancia: novaRow.instancia,
                is_from_client: type === 'human',
                has_tool_calls: Boolean(messageContent?.tool_calls && messageContent.tool_calls.length > 0),
                metadata: messageContent?.additional_kwargs || {}
              };

              // Adicionar apenas se não existir
              updateState(prev => {
                const exists = prev.mensagens.some(m => m.id === novaMensagem.id);
                if (exists) return prev;
                
                return {
                  ...prev,
                  mensagens: [...prev.mensagens, novaMensagem]
                };
              });
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('✅ Subscription otimizada ativa para sessão:', sessionId);
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Erro na subscription otimizada:', sessionId);
            toast.error('Erro na conexão em tempo real');
          }
        });

      subscriptionRef.current = subscription;
      
    } catch (error) {
      console.error('❌ Erro ao configurar subscription otimizada:', error);
      toast.error('Erro ao configurar atualizações em tempo real');
    }
  }, [updateState, cleanupSubscriptions]);

  // 1. Carregar instâncias (1ª coluna)
  const loadInstancias = useCallback(async () => {
    if (!profile) {
      console.warn('🚫 Usuário não autenticado para carregar instâncias');
      return;
    }

    console.log('🔄 Carregando instâncias OTIMIZADO...');
    updateState({ instanciasLoading: true, error: null });

    try {
      cancelPendingRequests();

      const instancias = await buscarInstanciasCorretores({
        userRole: profile.role,
        userId: profile.id,
        companyId: profile.company_id
      });

      updateState({
        instancias,
        instanciasLoading: false,
        error: null
      });

      console.log('✅ Instâncias carregadas (otimizado):', instancias.length);

    } catch (error) {
      console.error('❌ Erro ao carregar instâncias otimizado:', error);
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      
      updateState({
        instanciasLoading: false,
        error: `Erro ao carregar instâncias: ${errorMsg}`
      });

      toast.error('Erro ao carregar instâncias', {
        description: errorMsg
      });
    }
  }, [profile, updateState, cancelPendingRequests]);

  // 2. Carregar conversas de uma instância (2ª coluna) com paginação
  const loadConversas = useCallback(async (instancia: string, resetPagination = true) => {
    if (!instancia) {
      console.warn('🚫 Instância não fornecida para carregar conversas');
      return;
    }

    console.log('💬 Carregando conversas OTIMIZADO para:', instancia, { resetPagination });
    updateState({ conversasLoading: true, error: null });

    try {
      cancelPendingRequests();

      // Configurar cursor baseado no reset
      const cursor = resetPagination ? null : state.conversasCursor;

      let conversas: ConversaSessionInfo[];
      
      try {
        // Tentar usar função SQL otimizada primeiro
        conversas = await buscarConversasPorInstancia({
          instancia,
          searchTerm: state.searchTerm || undefined,
          limit: 50,
          cursorTime: cursor || undefined
        });
      } catch (error) {
        console.log('⚠️ Função SQL não disponível, usando fallback para leads');
        // Fallback para busca de leads se função SQL não estiver disponível
        conversas = await buscarLeadsPorInstancia({
          instancia,
          searchTerm: state.searchTerm || undefined,
          limit: 50,
          cursorTime: cursor || undefined
        });
      }

      // Determinar se há mais dados
      const hasMore = conversas.length === 50;

      // Determinar novo cursor
      let newCursor = null;
      if (conversas.length > 0) {
        const lastConversa = conversas[conversas.length - 1];
        newCursor = lastConversa.ultima_mensagem_time;
      }

      updateState({
        conversas: resetPagination ? conversas : [...state.conversas, ...conversas],
        conversasLoading: false,
        conversasHasMore: hasMore,
        conversasCursor: newCursor,
        error: null,
        // Limpar seleção de sessão se resetando
        selectedSession: resetPagination ? null : state.selectedSession
      });

      console.log('✅ Conversas carregadas (otimizado):', conversas.length, { hasMore, cursor: newCursor });

    } catch (error) {
      console.error('❌ Erro ao carregar conversas otimizado:', error);
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      
      updateState({
        conversasLoading: false,
        error: `Erro ao carregar conversas: ${errorMsg}`
      });

      toast.error('Erro ao carregar conversas', {
        description: errorMsg
      });
    }
  }, [state.searchTerm, state.conversasCursor, state.conversas, state.selectedSession, updateState, cancelPendingRequests]);

  // 3. Carregar mensagens de uma sessão (3ª coluna) com paginação
  const loadMensagens = useCallback(async (sessionId: string, resetPagination = true) => {
    if (!sessionId) {
      console.warn('🚫 Session ID não fornecido para carregar mensagens');
      return;
    }

    console.log('📝 Carregando mensagens OTIMIZADO para:', sessionId, { resetPagination });
    updateState({ mensagensLoading: true, error: null });

    try {
      cancelPendingRequests();

      // Configurar cursor baseado no reset
      const cursor = resetPagination ? null : state.mensagensCursor;

      const mensagens = await buscarMensagensDaSessao({
        sessionId,
        limit: 50,
        cursorData: cursor?.data,
        cursorId: cursor?.id,
        ascending: true
      });

      // Determinar se há mais dados
      const hasMore = mensagens.length === 50;

      // Determinar novo cursor
      let newCursor = null;
      if (mensagens.length > 0) {
        const lastMensagem = mensagens[mensagens.length - 1];
        newCursor = {
          data: lastMensagem.timestamp,
          id: lastMensagem.id
        };
      }

      updateState({
        mensagens: resetPagination ? mensagens : [...state.mensagens, ...mensagens],
        mensagensLoading: false,
        mensagensHasMore: hasMore,
        mensagensCursor: newCursor,
        error: null
      });

      console.log('✅ Mensagens carregadas (otimizado):', mensagens.length, { hasMore, cursor: newCursor });

    } catch (error) {
      console.error('❌ Erro ao carregar mensagens otimizado:', error);
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      
      updateState({
        mensagensLoading: false,
        error: `Erro ao carregar mensagens: ${errorMsg}`
      });

      toast.error('Erro ao carregar mensagens', {
        description: errorMsg
      });
    }
  }, [state.mensagensCursor, state.mensagens, updateState, cancelPendingRequests]);

  // 4. Carregar mais conversas (infinite scroll)
  const loadMoreConversas = useCallback(async () => {
    if (!state.selectedInstancia || !state.conversasHasMore || state.conversasLoading) {
      return;
    }

    console.log('📄 Carregando mais conversas...');
    await loadConversas(state.selectedInstancia, false);
  }, [state.selectedInstancia, state.conversasHasMore, state.conversasLoading, loadConversas]);

  // 5. Carregar mais mensagens (infinite scroll)
  const loadMoreMensagens = useCallback(async () => {
    if (!state.selectedSession || !state.mensagensHasMore || state.mensagensLoading) {
      return;
    }

    console.log('📄 Carregando mais mensagens...');
    await loadMensagens(state.selectedSession, false);
  }, [state.selectedSession, state.mensagensHasMore, state.mensagensLoading, loadMensagens]);

  // 6. Carregar mensagens mais antigas (scroll para cima)
  const loadOlderMensagens = useCallback(async () => {
    if (!state.selectedSession || state.mensagensLoading) {
      return;
    }

    console.log('📄 Carregando mensagens mais antigas...');
    
    // TODO: Implementar carregamento de mensagens mais antigas
    // Requer lógica invertida de cursor
    toast.info('Carregamento de mensagens antigas será implementado em breve');
  }, [state.selectedSession, state.mensagensLoading]);

  // 7. Enviar mensagem (otimizado)
  const sendMessage = useCallback(async (sessionId: string, content: string): Promise<boolean> => {
    if (!sessionId || !content.trim()) {
      console.warn('🚫 Dados insuficientes para enviar mensagem');
      return false;
    }

    if (!profile || !state.selectedInstancia) {
      console.warn('🚫 Usuário não autenticado ou instância não selecionada');
      toast.error('Erro ao enviar mensagem', {
        description: 'Usuário não autenticado ou instância não selecionada'
      });
      return false;
    }

    console.log('📤 Enviando mensagem OTIMIZADA...');

    try {
      const novaMensagem = await enviarMensagem({
        sessionId,
        content: content.trim(),
        instancia: state.selectedInstancia,
        userId: profile.id,
        type: 'ai'
      });

      console.log('✅ Mensagem enviada (otimizada)');
      toast.success('Mensagem enviada');

      // A mensagem será adicionada automaticamente via subscription real-time
      return true;

    } catch (error) {
      console.error('❌ Erro ao enviar mensagem otimizada:', error);
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      
      toast.error('Erro ao enviar mensagem', {
        description: errorMsg
      });

      return false;
    }
  }, [profile, state.selectedInstancia]);

  // 8. Seleções otimizadas
  const setSelectedInstancia = useCallback((instancia: string | null) => {
    console.log('🎯 Selecionando instância:', instancia);
    
    updateState({
      selectedInstancia: instancia,
      selectedSession: null,
      conversas: [],
      mensagens: [],
      conversasCursor: null,
      mensagensCursor: null,
      conversasHasMore: true,
      mensagensHasMore: true
    });

    // Limpar subscription anterior
    cleanupSubscriptions();

    // Carregar conversas automaticamente se instância selecionada
    if (instancia) {
      loadConversas(instancia, true);
    }
  }, [updateState, cleanupSubscriptions, loadConversas]);

  const setSelectedSession = useCallback((sessionId: string | null) => {
    console.log('🎯 Selecionando sessão:', sessionId);
    
    updateState({
      selectedSession: sessionId,
      mensagens: [],
      mensagensCursor: null,
      mensagensHasMore: true
    });

    if (sessionId) {
      // Carregar mensagens automaticamente
      loadMensagens(sessionId, true);
      // Configurar subscription em tempo real apenas para esta sessão
      setupMessagesSubscription(sessionId);
    } else {
      // Limpar subscription se nenhuma sessão selecionada
      cleanupSubscriptions();
    }
  }, [updateState, loadMensagens, setupMessagesSubscription, cleanupSubscriptions]);

  const setSearchTerm = useCallback((term: string) => {
    updateState({ searchTerm: term });

    // Recarregar conversas se instância selecionada
    if (state.selectedInstancia) {
      loadConversas(state.selectedInstancia, true);
    }
  }, [updateState, state.selectedInstancia, loadConversas]);

  // 9. Refresh completo
  const refreshData = useCallback(async () => {
    console.log('🔄 Atualizando dados OTIMIZADO...');
    updateState({ loading: true });

    try {
      await loadInstancias();

      if (state.selectedInstancia) {
        await loadConversas(state.selectedInstancia, true);
      }

      if (state.selectedSession) {
        await loadMensagens(state.selectedSession, true);
      }

      console.log('✅ Dados atualizados (otimizado)');

    } finally {
      updateState({ loading: false });
    }
  }, [updateState, loadInstancias, loadConversas, loadMensagens, state.selectedInstancia, state.selectedSession]);

  // 10. Cleanup
  const cleanup = useCallback(() => {
    console.log('🧹 Limpando dados do hook otimizado...');
    cancelPendingRequests();
    cleanupSubscriptions();
    
    updateState({
      loading: false,
      instanciasLoading: false,
      conversasLoading: false,
      mensagensLoading: false,
      error: null,
      instancias: [],
      conversas: [],
      mensagens: [],
      selectedInstancia: null,
      selectedSession: null,
      searchTerm: '',
      conversasHasMore: true,
      mensagensHasMore: true,
      conversasCursor: null,
      mensagensCursor: null
    });
  }, [cancelPendingRequests, cleanupSubscriptions, updateState]);

  // Efeito para carregar instâncias inicialmente
  useEffect(() => {
    if (profile) {
      loadInstancias();
    }

    // Cleanup na desmontagem
    return () => {
      cancelPendingRequests();
      cleanupSubscriptions();
    };
  }, [profile, loadInstancias, cancelPendingRequests, cleanupSubscriptions]);

  // Retornar estado e ações
  return {
    // Estado
    ...state,
    
    // Ações
    setSelectedInstancia,
    setSelectedSession,
    setSearchTerm,
    loadInstancias,
    loadConversas,
    loadMensagens,
    loadMoreConversas,
    loadMoreMensagens,
    loadOlderMensagens,
    sendMessage,
    refreshData,
    cleanup
  };
}