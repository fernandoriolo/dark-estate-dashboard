-- Migration: Corrigir heatmap para considerar apenas conversas com leads próprios do corretor
-- Data: 2025-01-16 14:00
-- Objetivo: Conversas dos corretores apenas com seus próprios leads

-- 1. Remover views antigas
DROP VIEW IF EXISTS public.vw_segura_heatmap_conversas_corretores;
DROP VIEW IF EXISTS public.vw_metricas_heatmap_conversas_corretores;

-- 2. Nova view considerando apenas conversas com leads próprios
CREATE OR REPLACE VIEW public.vw_metricas_heatmap_conversas_corretores AS
SELECT
  wi.user_id,
  wi.company_id,
  EXTRACT(dow FROM wm.timestamp)::int AS dia_semana,  -- 0=Dom, 1=Seg...6=Sáb
  EXTRACT(hour FROM wm.timestamp)::int AS hora,       -- 0-23
  COUNT(*) AS total_mensagens
FROM public.whatsapp_messages wm
JOIN public.whatsapp_instances wi ON wm.instance_id = wi.id
JOIN public.whatsapp_chats wc ON wm.chat_id = wc.id
JOIN public.leads l ON wc.lead_id = l.id
WHERE wm.from_me = true                           -- Apenas mensagens enviadas pelo corretor
  AND wm.timestamp IS NOT NULL                   -- Garantir que tem timestamp válido
  AND wm.timestamp >= NOW() - INTERVAL '90 days' -- Últimos 90 dias para performance
  AND wi.is_active = true                        -- Apenas instâncias ativas
  AND wc.lead_id IS NOT NULL                     -- Apenas conversas com leads
  AND l.user_id = wi.user_id                     -- IMPORTANTE: Lead deve pertencer ao mesmo corretor
GROUP BY wi.user_id, wi.company_id, dia_semana, hora
ORDER BY dia_semana, hora;

COMMENT ON VIEW public.vw_metricas_heatmap_conversas_corretores IS 
  'Heatmap de conversas dos corretores com seus próprios leads por dia da semana e hora.';

-- 3. View segura com RLS aplicado usando JWT claims
CREATE OR REPLACE VIEW public.vw_segura_heatmap_conversas_corretores AS
WITH claim AS (
  SELECT (current_setting('request.jwt.claims', true)::json->>'company_id')::uuid as cid
)
SELECT 
  dia_semana, 
  hora, 
  SUM(total_mensagens) AS total
FROM public.vw_metricas_heatmap_conversas_corretores, claim
WHERE company_id = claim.cid
GROUP BY dia_semana, hora
ORDER BY dia_semana, hora;

COMMENT ON VIEW public.vw_segura_heatmap_conversas_corretores IS 
  'View segura do heatmap de conversas dos corretores com leads próprios, filtrada por empresa.';

-- 4. Configurar security invoker para ambas as views
ALTER VIEW public.vw_metricas_heatmap_conversas_corretores SET (security_invoker = on);
ALTER VIEW public.vw_segura_heatmap_conversas_corretores SET (security_invoker = on);

-- 5. Índices otimizados para consultas com relacionamento de leads
-- Índice para relacionamento chat -> lead
CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_lead_id_not_null 
ON public.whatsapp_chats (lead_id, instance_id)
WHERE lead_id IS NOT NULL;

-- Índice para relacionamento lead -> user
CREATE INDEX IF NOT EXISTS idx_leads_user_id 
ON public.leads (user_id, id);

-- Índice composto para otimizar JOIN das mensagens
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_chat_from_me_timestamp
ON public.whatsapp_messages (chat_id, from_me, timestamp DESC)
WHERE from_me = true AND timestamp IS NOT NULL;

-- 6. Conceder permissões necessárias
GRANT SELECT ON public.vw_metricas_heatmap_conversas_corretores TO authenticated;
GRANT SELECT ON public.vw_segura_heatmap_conversas_corretores TO authenticated;
