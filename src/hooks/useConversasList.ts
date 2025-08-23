import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Conversa {
  sessionId: string;
  instancia: string;
  displayName: string;
  leadPhone?: string | null;
  leadStage?: string | null;
  lastMessageDate: string;
  messageCount: number;
  lastMessageContent: string;
  lastMessageType: 'human' | 'ai';
}

export function useConversasList(selectedInstance?: string | null) {
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConversas();
  }, [selectedInstance]);

  const fetchConversas = async () => {
    try {
      setLoading(true);
      setError(null);

      // Obter o usuário atual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('Erro ao obter usuário:', userError);
        setError('Usuário não autenticado');
        return;
      }

      // Usar RPC para buscar conversas com filtro por role/chat_instance
      const { data, error: fetchError } = await supabase.rpc('get_conversations_for_corretor', {
        user_id: user.id,
        selected_instance: selectedInstance
      });

      if (fetchError) {
        console.error('Erro ao buscar conversas:', fetchError);
        setError(fetchError.message);
        return;
      }

      // Converter para o formato esperado - dados já vêm enriquecidos da RPC
      const conversasArray: Conversa[] = (data || []).map((row: any) => ({
        sessionId: row.session_id,
        instancia: row.instancia,
        displayName: row.display_name,
        leadPhone: row.lead_phone || null,
        leadStage: row.lead_stage || null,
        lastMessageDate: row.last_message_date,
        messageCount: row.message_count,
        lastMessageContent: row.last_message_content || '',
        lastMessageType: row.last_message_type || 'unknown'
      }));

      setConversas(conversasArray);
    } catch (err) {
      console.error('Erro ao buscar conversas:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const updateConversation = (sessionId: string) => {
    // Mover conversa para o topo e atualizar dados
    setConversas(prev => {
      const updated = [...prev];
      const index = updated.findIndex(c => c.sessionId === sessionId);
      
      if (index > 0) {
        // Mover para o topo
        const conversation = updated.splice(index, 1)[0];
        updated.unshift(conversation);
      }
      
      return updated;
    });
    
    // Refetch para obter dados atualizados
    fetchConversas();
  };

  return {
    conversas,
    loading,
    error,
    refetch: fetchConversas,
    updateConversation
  };
}
