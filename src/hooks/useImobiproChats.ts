/**
 * Hook para nova arquitetura de chats baseada em imobipro_messages
 * Criado em paralelo ao hook atual para migração segura
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

export function useImobiproChats(): UseImobiproChatsReturn {
  const { profile } = useUserProfile();
  const abortControllerRef = useRef<AbortController | null>(null);
  const subscriptionRef = useRef<any>(null);

  // Estados principais
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
    searchTerm: ''
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

  // Configurar subscription para mensagens da sessão atual
  const setupMessagesSubscription = useCallback((sessionId: string) => {
    // Limpar subscription anterior
    cleanupSubscriptions();

    if (!sessionId) return;

    console.log('📡 Configurando subscription para sessão:', sessionId);

    try {
      const subscription = supabase
        .channel(`imobipro_messages_${sessionId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'imobipro_messages',
            filter: `session_id=eq.${sessionId}`
          },
          (payload) => {
            console.log('📨 Nova mensagem recebida via realtime:', payload.new);
            
            // Processar nova mensagem
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

            // Atualizar estado com nova mensagem apenas se não existir
            updateState(prev => {
              const exists = prev.mensagens.some(m => m.id === novaMensagem.id);
              if (exists) return prev;
              
              return {
                ...prev,
                mensagens: [...prev.mensagens, novaMensagem]
              };
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'imobipro_messages',
            filter: `session_id=eq.${sessionId}`
          },
          (payload) => {
            console.log('📝 Mensagem atualizada via realtime:', payload.new);
            
            // Processar mensagem atualizada
            const updatedRow = payload.new as any;
            const messageContent = updatedRow.message as any;
            const type = messageContent?.type as 'human' | 'ai';
            
            const mensagemAtualizada: MensagemInfo = {
              id: updatedRow.id,
              session_id: updatedRow.session_id,
              type,
              content: messageContent?.content || '',
              timestamp: updatedRow.data,
              instancia: updatedRow.instancia,
              is_from_client: type === 'human',
              has_tool_calls: Boolean(messageContent?.tool_calls && messageContent.tool_calls.length > 0),
              metadata: messageContent?.additional_kwargs || {}
            };

            // Atualizar mensagem existente
            updateState(prev => ({
              ...prev,
              mensagens: prev.mensagens.map(m => 
                m.id === mensagemAtualizada.id ? mensagemAtualizada : m
              )
            }));
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'imobipro_messages',
            filter: `session_id=eq.${sessionId}`
          },
          (payload) => {
            console.log('🗑️ Mensagem removida via realtime:', payload.old);
            
            const deletedRow = payload.old as any;
            
            // Remover mensagem do estado
            updateState(prev => ({
              ...prev,
              mensagens: prev.mensagens.filter(m => m.id !== deletedRow.id)
            }));
          }
        )
        .subscribe((status) => {
          console.log('📡 Status da subscription:', status);
          
          if (status === 'SUBSCRIBED') {
            console.log('✅ Subscription ativa para sessão:', sessionId);
          } else if (status === 'CLOSED') {
            console.log('⚠️ Subscription fechada para sessão:', sessionId);
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Erro na subscription para sessão:', sessionId);
            toast.error('Erro na conexão em tempo real');
          }
        });

      subscriptionRef.current = subscription;
      
    } catch (error) {
      console.error('❌ Erro ao configurar subscription:', error);
      toast.error('Erro ao configurar atualizações em tempo real');
    }
  }, [updateState, cleanupSubscriptions]);

  // 1. Carregar instâncias/corretores
  const loadInstancias = useCallback(async () => {
    if (!profile) {
      console.warn('🚫 Usuário não autenticado para carregar instâncias');
      return;
    }

    console.log('🔄 Carregando instâncias...');
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

      console.log('✅ Instâncias carregadas:', instancias.length);

    } catch (error) {
      console.error('❌ Erro ao carregar instâncias:', error);
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

  // 2. Carregar conversas de uma instância
  const loadConversas = useCallback(async (instancia: string) => {
    if (!instancia) {
      console.warn('🚫 Instância não fornecida para carregar conversas');
      return;
    }

    console.log('💬 Carregando conversas para instância:', instancia);
    updateState({ conversasLoading: true, error: null });

    try {
      cancelPendingRequests();

      // Buscar conversas da instância (sempre buscar conversas reais primeiro)
      let conversas = await buscarConversasPorInstancia({
        instancia,
        searchTerm: state.searchTerm || undefined,
        limit: 50 // Limite padrão
      });

      console.log('📊 Conversas reais encontradas:', conversas.length);

      // Se não há conversas reais, tentar buscar leads como fallback
      if (conversas.length === 0) {
        console.log('🔄 Nenhuma conversa real encontrada, buscando leads como fallback...');
        try {
          conversas = await buscarLeadsPorInstancia({
            instancia,
            searchTerm: state.searchTerm || undefined,
            limit: 50
          });
          console.log('👥 Leads encontrados como fallback:', conversas.length);
        } catch (leadError) {
          console.warn('⚠️ Não foi possível carregar leads também:', leadError);
        }
      }

      updateState({
        conversas,
        conversasLoading: false,
        error: null,
        // Limpar seleção de sessão se não existe mais
        selectedSession: conversas.find(c => c.session_id === state.selectedSession)?.session_id || null
      });

      console.log('✅ Total de conversas/leads carregados:', conversas.length);

    } catch (error) {
      console.error('❌ Erro ao carregar conversas:', error);
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      
      updateState({
        conversasLoading: false,
        error: `Erro ao carregar conversas: ${errorMsg}`
      });

      toast.error('Erro ao carregar conversas', {
        description: errorMsg
      });
    }
  }, [state.searchTerm, state.selectedSession, updateState, cancelPendingRequests]);

  // 3. Carregar mensagens de uma sessão
  const loadMensagens = useCallback(async (sessionId: string) => {
    if (!sessionId) {
      console.warn('🚫 Session ID não fornecido para carregar mensagens');
      return;
    }

    console.log('📝 Carregando mensagens para sessão:', sessionId);
    updateState({ mensagensLoading: true, error: null });

    try {
      cancelPendingRequests();

      const mensagens = await buscarMensagensDaSessao({
        sessionId,
        limit: 100 // Limite padrão para mensagens
      });

      updateState({
        mensagens,
        mensagensLoading: false,
        error: null
      });

      console.log('✅ Mensagens carregadas:', mensagens.length);

    } catch (error) {
      console.error('❌ Erro ao carregar mensagens:', error);
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      
      updateState({
        mensagensLoading: false,
        error: `Erro ao carregar mensagens: ${errorMsg}`
      });

      toast.error('Erro ao carregar mensagens', {
        description: errorMsg
      });
    }
  }, [updateState, cancelPendingRequests]);

  // 4. Enviar mensagem (adaptado para leads)
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

    // Verificar se é um lead (formato: lead_${id})
    if (sessionId.startsWith('lead_')) {
      console.log('📤 Enviando mensagem para lead...');
      
      try {
        // Para leads, criar uma nova sessão de conversa real
        const realSessionId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const novaMensagem = await enviarMensagem({
          sessionId: realSessionId,
          content: content.trim(),
          instancia: state.selectedInstancia,
          userId: profile.id,
          type: 'ai' // Sempre 'ai' quando enviado pelo corretor
        });

        console.log('✅ Mensagem para lead enviada com sucesso');
        toast.success('Mensagem enviada para o lead');

        // Recarregar mensagens para mostrar a nova mensagem
        await loadMensagens(sessionId);
        
        return true;

      } catch (error) {
        console.error('❌ Erro ao enviar mensagem para lead:', error);
        const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
        
        toast.error('Erro ao enviar mensagem para lead', {
          description: errorMsg
        });

        return false;
      }
    }

    // Código original para sessões normais
    console.log('📤 Enviando mensagem...');

    try {
      const novaMensagem = await enviarMensagem({
        sessionId,
        content: content.trim(),
        instancia: state.selectedInstancia,
        userId: profile.id,
        type: 'ai' // Sempre 'ai' quando enviado pelo corretor
      });

      console.log('✅ Mensagem enviada com sucesso');
      toast.success('Mensagem enviada');

      // Nota: A mensagem será adicionada automaticamente via subscription real-time
      return true;

    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error);
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      
      toast.error('Erro ao enviar mensagem', {
        description: errorMsg
      });

      return false;
    }
  }, [profile, state.selectedInstancia, loadMensagens]);

  // 5. Seleções
  const setSelectedInstancia = useCallback((instancia: string | null) => {
    updateState({
      selectedInstancia: instancia,
      selectedSession: null, // Limpar sessão selecionada
      conversas: [], // Limpar conversas
      mensagens: [] // Limpar mensagens
    });

    // Carregar conversas automaticamente se instância selecionada
    if (instancia) {
      loadConversas(instancia);
    }
  }, [updateState, loadConversas]);

  const setSelectedSession = useCallback((sessionId: string | null) => {
    updateState({
      selectedSession: sessionId,
      mensagens: [] // Limpar mensagens
    });

    // Carregar mensagens automaticamente se sessão selecionada
    if (sessionId) {
      loadMensagens(sessionId);
      // Configurar subscription em tempo real
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
      loadConversas(state.selectedInstancia);
    }
  }, [updateState, state.selectedInstancia, loadConversas]);

  // 6. Refresh completo
  const refreshData = useCallback(async () => {
    console.log('🔄 Atualizando dados...');
    updateState({ loading: true });

    try {
      // Sempre recarregar instâncias
      await loadInstancias();

      // Recarregar conversas se instância selecionada
      if (state.selectedInstancia) {
        await loadConversas(state.selectedInstancia);
      }

      // Recarregar mensagens se sessão selecionada
      if (state.selectedSession) {
        await loadMensagens(state.selectedSession);
      }

      console.log('✅ Dados atualizados');

    } finally {
      updateState({ loading: false });
    }
  }, [
    updateState,
    loadInstancias,
    loadConversas,
    loadMensagens,
    state.selectedInstancia,
    state.selectedSession
  ]);

  // 7. Cleanup
  const cleanup = useCallback(() => {
    console.log('🧹 Limpando dados do hook...');
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
      searchTerm: ''
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
    sendMessage,
    refreshData,
    cleanup
  };
}