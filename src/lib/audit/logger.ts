import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile';

export type AuditAction =
  | 'lead.created'
  | 'lead.updated'
  | 'lead.deleted'
  | 'property.created'
  | 'property.updated'
  | 'property.deleted'
  | 'whatsapp.message_sent'
  | 'whatsapp.chat_created'
  | 'user.login'
  | 'user.logout';

export interface AuditMeta {
  [key: string]: any;
}

export async function logAudit(
  params: { action: AuditAction; resource: string; resourceId?: string | null; meta?: AuditMeta }
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const claims = (supabase as any)?.auth?.session()?.user?.app_metadata || {};
    const actorId = user?.id || null;
    const companyId = (claims?.company_id as string | undefined) || null;

    const { error } = await supabase.from('audit_logs').insert({
      actor_id: actorId,
      company_id: companyId ? companyId : null,
      action: params.action,
      resource: params.resource,
      resource_id: params.resourceId || null,
      meta: params.meta || null,
    });
    if (error) console.warn('Falha ao registrar audit log:', error.message);
  } catch (e) {
    console.warn('Erro inesperado ao registrar audit log:', (e as any)?.message || e);
  }
}


