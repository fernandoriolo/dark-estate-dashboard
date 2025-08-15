import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logAudit } from '@/lib/audit/logger';

export function useAuthAudit() {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          try {
            await logAudit({
              action: 'user.login',
              resource: 'user_profile',
              resourceId: session.user.id,
              meta: {
                email: session.user.email,
                provider: session.user.app_metadata?.provider || 'email',
                login_time: new Date().toISOString()
              }
            });
          } catch (error) {
            console.warn('Erro ao registrar login:', error);
          }
        }
        
        if (event === 'SIGNED_OUT') {
          try {
            // Como o usuário já foi deslogado, usar o ID do session anterior se disponível
            const userId = session?.user?.id || 'unknown';
            await logAudit({
              action: 'user.logout',
              resource: 'user_profile',
              resourceId: userId,
              meta: {
                logout_time: new Date().toISOString()
              }
            });
          } catch (error) {
            console.warn('Erro ao registrar logout:', error);
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);
}
