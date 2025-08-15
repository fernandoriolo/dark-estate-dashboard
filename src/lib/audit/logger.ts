import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile';

export type AuditAction =
  | 'lead.created'
  | 'lead.updated'
  | 'lead.deleted'
  | 'lead.stage_changed'
  | 'property.created'
  | 'property.updated'
  | 'property.deleted'
  | 'contract.created'
  | 'contract.updated'
  | 'contract.deleted'
  | 'whatsapp.message_sent'
  | 'whatsapp.chat_created'
  | 'whatsapp.instance_created'
  | 'whatsapp.instance_status_updated'
  | 'whatsapp.instance_connected'
  | 'whatsapp.instance_disconnected'
  | 'whatsapp.instance_qr_generated'
  | 'user.login'
  | 'user.logout'
  | 'user.created'
  | 'user.profile_updated'
  | 'user.deactivated'
  | 'permissions.updated'
  | 'bulk_whatsapp.started'
  | 'bulk_whatsapp.finished'
  | 'agenda.event_created'
  | 'system.test';

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


