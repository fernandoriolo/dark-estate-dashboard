import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from './useUserProfile';

interface RealtimeCallbacks {
  onInstanceUpdate: () => void;
  onConversationUpdate: (sessionId: string) => void;
  onMessageUpdate: (sessionId: string, message: any) => void;
}

export function useConversasRealtime(callbacks: RealtimeCallbacks) {
  const { profile } = useUserProfile();

  const handleNewMessage = useCallback((payload: any) => {
    const newMessage = payload.new;
    
    if (!newMessage || !profile) return;

    // Aplicar filtro por role
    if (profile.role === 'corretor') {
      const userInstance = profile.chat_instance?.toLowerCase().trim();
      const messageInstance = newMessage.instancia?.toLowerCase().trim();
      
      if (userInstance !== messageInstance) {
        return; // Ignorar mensagem que não é da instância do corretor
      }
    }

    // Notificar callbacks
    callbacks.onInstanceUpdate();
    callbacks.onConversationUpdate(newMessage.session_id);
    callbacks.onMessageUpdate(newMessage.session_id, newMessage);
  }, [profile, callbacks]);

  useEffect(() => {
    if (!profile) return;

    // Subscrever inserções na tabela imobipro_messages
    const subscription = supabase
      .channel('imobipro_messages_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'imobipro_messages'
        },
        handleNewMessage
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [profile, handleNewMessage]);
}
