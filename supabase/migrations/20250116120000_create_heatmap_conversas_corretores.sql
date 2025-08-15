-- Migration: Criar view para heatmap de conversas dos corretores com leads
-- Data: 2025-01-16
-- Descrição: Substitui o mapa de calor de atividades por conversas reais dos corretores

-- 1. View principal para métricas de conversas por hora/dia
CREATE OR REPLACE VIEW public.vw_metricas_heatmap_conversas_corretores AS
SELECT
  wc.user_id,
  up.company_id,
  EXTRACT(dow FROM wm.timestamp)::int AS dia_semana,  -- 0=Dom, 1=Seg...6=Sáb
  EXTRACT(hour FROM wm.timestamp)::int AS hora,       -- 0-23
  COUNT(*) AS total_mensagens
FROM public.whatsapp_messages wm
JOIN public.whatsapp_chats wc ON wm.chat_id = wc.id
JOIN public.user_profiles up ON wc.user_id = up.id
WHERE wc.lead_id IS NOT NULL        -- Apenas conversas com leads
  AND wm.from_me = true             -- Apenas mensagens enviadas pelo corretor
  AND wm.timestamp >= NOW() - INTERVAL '90 days'  -- Últimos 90 dias para performance
GROUP BY wc.user_id, up.company_id, dia_semana, hora
ORDER BY dia_semana, hora;

COMMENT ON VIEW public.vw_metricas_heatmap_conversas_corretores IS 
  'Heatmap de conversas dos corretores com leads por dia da semana (0=Dom) e hora, por empresa.';

-- 2. View segura com RLS aplicado
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
  'View segura do heatmap de conversas filtrada por empresa do usuário logado.';

-- 3. Configurar security invoker para ambas as views
ALTER VIEW public.vw_metricas_heatmap_conversas_corretores SET (security_invoker = on);
ALTER VIEW public.vw_segura_heatmap_conversas_corretores SET (security_invoker = on);

-- 4. Índices para otimizar performance das consultas de heatmap
-- Índice principal para timestamp (sem EXTRACT que não é IMMUTABLE)
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_timestamp_from_me 
ON public.whatsapp_messages (timestamp DESC, from_me)
WHERE from_me = true;

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_chat_timestamp_recent 
ON public.whatsapp_messages (chat_id, timestamp DESC)
WHERE from_me = true;

CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_lead_user 
ON public.whatsapp_chats (lead_id, user_id)
WHERE lead_id IS NOT NULL;

-- 5. Conceder permissões necessárias
GRANT SELECT ON public.vw_metricas_heatmap_conversas_corretores TO authenticated;
GRANT SELECT ON public.vw_segura_heatmap_conversas_corretores TO authenticated;
