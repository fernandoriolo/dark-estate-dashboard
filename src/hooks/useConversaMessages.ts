import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ConversaMessage {
  id: string;
  sessionId: string;
  instancia: string;
  message: {
    type: 'human' | 'ai';
    content: string;
    additional_kwargs?: any;
    response_metadata?: any;
    tool_calls?: any[];
    invalid_tool_calls?: any[];
  };
  data: string;
  media?: string | null;
}

export function useConversaMessages(sessionId?: string | null) {
  const [messages, setMessages] = useState<ConversaMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    fetchMessages();
  }, [sessionId]);

  const fetchMessages = async () => {
    if (!sessionId) return;

    try {
      setLoading(true);
      setError(null);

      // Buscar mensagens diretamente incluindo a coluna media explicitamente
      const { data, error: fetchError } = await supabase
        .from('imobipro_messages')
        .select('id, session_id, message, data, instancia, media')
        .eq('session_id', sessionId)
        .order('data', { ascending: true })
        .order('id', { ascending: true });

      if (fetchError) {
        console.error('Erro ao buscar mensagens:', fetchError);
        setError(fetchError.message);
        return;
      }

      // Mapear dados para o formato esperado com parsing correto do JSONB
      const messagesArray: ConversaMessage[] = (data || []).map((row: any) => {
        let parsedMessage;
        
        // Verificar se message é string JSON ou já é objeto
        if (typeof row.message === 'string') {
          try {
            parsedMessage = JSON.parse(row.message);
          } catch (parseError) {
            console.warn('Erro ao fazer parse do message JSON:', parseError);
            parsedMessage = { type: 'human', content: row.message };
          }
        } else {
          parsedMessage = row.message;
        }

        return {
          id: row.id,
          sessionId: row.session_id,
          instancia: row.instancia || '(sem instância)',
          message: {
            type: parsedMessage.type || 'human',
            content: parsedMessage.content || '',
            additional_kwargs: parsedMessage.additional_kwargs,
            response_metadata: parsedMessage.response_metadata,
            tool_calls: parsedMessage.tool_calls,
            invalid_tool_calls: parsedMessage.invalid_tool_calls
          },
          data: row.data,
          media: row.media
        };
      });

      setMessages(messagesArray);
    } catch (err) {
      console.error('Erro ao buscar mensagens:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const addMessage = (newMessage: any) => {
    const parsedMessage = {
      id: newMessage.id,
      sessionId: newMessage.session_id,
      instancia: newMessage.instancia || '(sem instância)',
      message: {
        type: newMessage.message?.type || 'human',
        content: newMessage.message?.content || '',
        additional_kwargs: newMessage.message?.additional_kwargs,
        response_metadata: newMessage.message?.response_metadata,
        tool_calls: newMessage.message?.tool_calls,
        invalid_tool_calls: newMessage.message?.invalid_tool_calls
      },
      data: newMessage.data
    };

    setMessages(prev => [...prev, parsedMessage].sort((a, b) => 
      new Date(a.data).getTime() - new Date(b.data).getTime()
    ));
  };

  return {
    messages,
    loading,
    error,
    refetch: fetchMessages,
    addMessage
  };
}
