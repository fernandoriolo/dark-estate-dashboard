import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from './useUserProfile';

export interface ChatLead {
  chat_id: string;
  contact_phone: string;
  contact_name: string;
  last_message: string | null;
  last_message_time: string | null;
  unread_count: number;
  corretor_id: string;
  lead_id: string;
  lead_name: string;
  lead_phone: string;
  corretor_nome: string;
}

export interface ChatMessage {
  id: string;
  chat_id: string;
  content: string;
  from_me: boolean;
  timestamp: string;
  message_type: string;
  contact_phone: string;
  lead_id: string;
  lead_name: string;
}

export interface CorretorInfo {
  corretor_id: string;
  corretor_nome: string;
  total_conversas: number;
  ultima_atividade: string | null;
}

export function useChatsDataSimple() {
  const { profile } = useUserProfile();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para corretores (gestores)
  const [corretores, setCorretores] = useState<CorretorInfo[]>([]);
  const [selectedCorretor, setSelectedCorretor] = useState<string | null>(null);
  const [corretoresLoading, setCorretoresLoading] = useState(false);
  
  // Estados para conversas
  const [conversas, setConversas] = useState<ChatLead[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [conversasLoading, setConversasLoading] = useState(false);
  
  // Estados para mensagens
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // Carregar corretores com conversas (usando query direta)
  const loadCorretores = useCallback(async () => {
    console.log('🔍 loadCorretores SIMPLES chamado. Profile:', profile);
    if (!profile || profile.role === 'corretor') return;
    
    try {
      setCorretoresLoading(true);
      setError(null);
      
      // Query direta sem RLS - buscar corretores e contar chats separadamente
      const { data: profilesData, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .eq('role', 'corretor');

      if (profilesError) throw profilesError;

      // Para cada corretor, contar seus chats
      const corretoresWithChats = await Promise.all(
        (profilesData || []).map(async (corretor) => {
          const { count } = await supabase
            .from('whatsapp_chats')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', corretor.id);

          return {
            corretor_id: corretor.id,
            corretor_nome: corretor.full_name || 'Sem nome',
            total_conversas: count || 0,
            ultima_atividade: null
          };
        })
      );

      // Filtrar apenas corretores com conversas
      const corretoresComConversas = corretoresWithChats.filter(c => c.total_conversas > 0);

      // Para admins e gestores, adicionar categoria "Agente SDR" para leads sem corretor
      if (profile.role === 'admin' || profile.role === 'gestor') {
        const { count: sdrCount } = await supabase
          .from('whatsapp_chats')
          .select('*', { count: 'exact', head: true })
          .is('user_id', null);

        if (sdrCount && sdrCount > 0) {
          corretoresComConversas.unshift({
            corretor_id: 'sdr-agent',
            corretor_nome: 'Agente SDR',
            total_conversas: sdrCount,
            ultima_atividade: null
          });
        }
      }

      console.log('✅ Corretores carregados (simples):', corretoresComConversas.length);
      setCorretores(corretoresComConversas);
    } catch (err) {
      console.error('❌ Erro ao carregar corretores (simples):', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar corretores');
    } finally {
      setCorretoresLoading(false);
      setLoading(false);
    }
  }, [profile]);

  // Carregar conversas (usando query direta)
  const loadConversas = useCallback(async (corretorId?: string) => {
    console.log('💬 loadConversas SIMPLES chamado. Profile:', profile, 'corretorId:', corretorId);
    if (!profile) return;
    
    try {
      setConversasLoading(true);
      setError(null);
      
      // Query direta sem RLS
      let query = supabase
        .from('whatsapp_chats')
        .select(`
          id,
          contact_phone,
          contact_name,
          last_message,
          last_message_time,
          unread_count,
          user_id,
          lead_id
        `);
      
      // Filtrar por corretor
      if (profile.role === 'corretor') {
        console.log('🔒 Aplicando filtro para corretor:', profile.id);
        query = query.eq('user_id', profile.id);
      } else if (corretorId === 'sdr-agent') {
        // Conversas do agente SDR (sem user_id)
        console.log('🤖 Carregando conversas do Agente SDR');
        query = query.is('user_id', null);
      } else if (corretorId) {
        console.log('👥 Carregando conversas do corretor:', corretorId);
        query = query.eq('user_id', corretorId);
      } else {
        console.log('🌍 Carregando todas as conversas (admin/gestor)');
        // Para gestores/admins sem corretor selecionado, não mostrar conversas ainda
        if (profile.role !== 'admin' && profile.role !== 'gestor') {
          console.log('❌ Acesso negado para role:', profile.role);
          throw new Error('Acesso não autorizado');
        }
      }
      
      const { data: chatsData, error } = await query.order('last_message_time', { ascending: false, nullsLast: true });
      
      if (error) {
        console.error('❌ Erro na query de conversas:', error);
        throw error;
      }

      console.log('📋 Conversas encontradas:', chatsData?.length || 0);
      
      // Buscar dados complementares para cada chat
      const conversasData = await Promise.all(
        (chatsData || []).map(async (chat) => {
          // Buscar dados do lead
          const { data: leadData } = await supabase
            .from('leads')
            .select('name, phone')
            .eq('id', chat.lead_id)
            .single();

          // Buscar dados do corretor (se existir)
          let corretorNome = 'Agente SDR';
          if (chat.user_id) {
            const { data: corretorData } = await supabase
              .from('user_profiles')
              .select('full_name')
              .eq('id', chat.user_id)
              .single();
            corretorNome = corretorData?.full_name || 'Corretor desconhecido';
          }

          return {
            chat_id: chat.id,
            contact_phone: chat.contact_phone || '',
            contact_name: chat.contact_name || 'Sem nome',
            last_message: chat.last_message,
            last_message_time: chat.last_message_time,
            unread_count: chat.unread_count || 0,
            corretor_id: chat.user_id || 'sdr-agent',
            lead_id: chat.lead_id,
            lead_name: leadData?.name || 'Lead desconhecido',
            lead_phone: leadData?.phone || '',
            corretor_nome: corretorNome
          };
        })
      );

      console.log('✅ Conversas carregadas (simples):', conversasData.length);
      setConversas(conversasData);
    } catch (err) {
      console.error('❌ Erro ao carregar conversas (simples):', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar conversas');
      setConversas([]);
    } finally {
      setConversasLoading(false);
      setLoading(false); // Garantir que loading global seja desativado
    }
  }, [profile]);

  // Carregar mensagens (usando query direta)
  const loadMessages = useCallback(async (chatId: string) => {
    if (!chatId) return;
    
    try {
      setMessagesLoading(true);
      setError(null);
      
      // Query direta sem RLS
      const { data: messagesData, error } = await supabase
        .from('whatsapp_messages')
        .select(`
          id,
          chat_id,
          content,
          from_me,
          timestamp,
          message_type,
          contact_phone
        `)
        .eq('chat_id', chatId)
        .order('timestamp', { ascending: true });
      
      if (error) throw error;
      
      // Buscar dados do chat para pegar lead_id
      const { data: chatData } = await supabase
        .from('whatsapp_chats')
        .select('lead_id')
        .eq('id', chatId)
        .single();
        
      // Buscar nome do lead
      const { data: leadData } = await supabase
        .from('leads')
        .select('name')
        .eq('id', chatData?.lead_id)
        .single();
      
      // Processar dados
      const processedMessages = (messagesData || []).map(msg => ({
        id: msg.id,
        chat_id: msg.chat_id,
        content: msg.content || '',
        from_me: msg.from_me || false,
        timestamp: msg.timestamp,
        message_type: msg.message_type || 'text',
        contact_phone: msg.contact_phone || '',
        lead_id: chatData?.lead_id || '',
        lead_name: leadData?.name || 'Lead desconhecido'
      }));

      console.log('✅ Mensagens carregadas (simples):', processedMessages.length);
      setMessages(processedMessages);
    } catch (err) {
      console.error('❌ Erro ao carregar mensagens (simples):', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar mensagens');
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  // Mock do envio de mensagem
  const sendMessage = useCallback(async (chatId: string, content: string) => {
    console.log('📤 Mock: Enviando mensagem para chat', chatId, ':', content);
    
    // Simular envio
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Adicionar mensagem mock
    const newMessage: ChatMessage = {
      id: `mock-${Date.now()}`,
      chat_id: chatId,
      content: content.trim(),
      from_me: true,
      timestamp: new Date().toISOString(),
      message_type: 'text',
      contact_phone: '',
      lead_id: '',
      lead_name: 'Mock Lead'
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    return true;
  }, []);

  // Efeito para carregar dados iniciais - otimizado
  useEffect(() => {
    console.log('🚀 useEffect SIMPLES inicial. Profile:', profile);
    
    // Se não tem perfil ainda, manter loading ativo
    if (!profile) {
      console.log('⏳ Aguardando profile...');
      return;
    }
    
    // Se perfil está incompleto, mostrar erro
    if (!profile.id || !profile.role) {
      console.log('❌ Profile incompleto:', profile);
      setError('Dados do usuário estão incompletos');
      setLoading(false);
      return;
    }
    
    if (profile.role === 'corretor') {
      console.log('👤 Usuário é corretor - carregando conversas diretas (simples)');
      loadConversas(); // Para corretores, carregar diretamente suas conversas
    } else if (profile.role === 'admin' || profile.role === 'gestor') {
      console.log('👑 Usuário é gestor/admin - carregando corretores (simples)');
      loadCorretores();
    } else {
      console.log('❌ Role não reconhecido:', profile.role);
      setError(`Acesso não autorizado para role: ${profile.role}`);
      setLoading(false);
    }
  }, [profile?.id, profile?.role, loadConversas, loadCorretores]);

  // Efeito para carregar conversas quando corretor é selecionado - otimizado
  useEffect(() => {
    if (profile?.role !== 'corretor' && selectedCorretor) {
      console.log('🔄 Carregando conversas do corretor selecionado:', selectedCorretor);
      loadConversas(selectedCorretor);
    }
  }, [selectedCorretor, profile?.role]); // Dependências reduzidas

  // Efeito para carregar mensagens quando chat é selecionado - otimizado
  useEffect(() => {
    if (selectedChat) {
      console.log('💬 Carregando mensagens do chat:', selectedChat);
      loadMessages(selectedChat);
    } else {
      setMessages([]);
    }
  }, [selectedChat]); // Dependência única

  return {
    // Estados
    loading,
    error,
    messagesLoading,
    corretoresLoading,
    conversasLoading,
    
    // Dados para gestores
    corretores,
    selectedCorretor,
    setSelectedCorretor,
    
    // Dados de conversas
    conversas,
    selectedChat,
    setSelectedChat,
    
    // Dados de mensagens
    messages,
    
    // Ações
    loadConversas,
    loadMessages,
    sendMessage,
    refreshData: () => {
      if (profile?.role === 'corretor') {
        loadConversas();
      } else {
        loadCorretores();
        if (selectedCorretor) {
          loadConversas(selectedCorretor);
        }
      }
    }
  };
}