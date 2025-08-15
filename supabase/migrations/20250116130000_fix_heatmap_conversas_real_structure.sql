-- Migration: Corrigir heatmap conversas para usar estrutura real das tabelas WhatsApp
-- Data: 2025-01-16 13:00
-- Análise: Usar timestamp (não created_at) e relacionamento direto messages->instances

-- 1. Remover views antigas
DROP VIEW IF EXISTS public.vw_segura_heatmap_conversas_corretores;
DROP VIEW IF EXISTS public.vw_metricas_heatmap_conversas_corretores;

-- 2. Nova view baseada na estrutura real
CREATE OR REPLACE VIEW public.vw_metricas_heatmap_conversas_corretores AS
SELECT
  wi.user_id,
  wi.company_id,
  EXTRACT(dow FROM wm.timestamp)::int AS dia_semana,  -- 0=Dom, 1=Seg...6=Sáb
  EXTRACT(hour FROM wm.timestamp)::int AS hora,       -- 0-23
  COUNT(*) AS total_mensagens
FROM public.whatsapp_messages wm
JOIN public.whatsapp_instances wi ON wm.instance_id = wi.id
WHERE wm.from_me = true                           -- Apenas mensagens enviadas pelo corretor
  AND wm.timestamp IS NOT NULL                   -- Garantir que tem timestamp válido
  AND wm.timestamp >= NOW() - INTERVAL '90 days' -- Últimos 90 dias para performance
  AND wi.is_active = true                        -- Apenas instâncias ativas
GROUP BY wi.user_id, wi.company_id, dia_semana, hora
ORDER BY dia_semana, hora;

COMMENT ON VIEW public.vw_metricas_heatmap_conversas_corretores IS 
  'Heatmap de conversas dos corretores por dia da semana (0=Dom) e hora, baseado em timestamp real das mensagens.';

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
  'View segura do heatmap de conversas filtrada por empresa do usuário logado, usando timestamp real.';

-- 4. Configurar security invoker para ambas as views
ALTER VIEW public.vw_metricas_heatmap_conversas_corretores SET (security_invoker = on);
ALTER VIEW public.vw_segura_heatmap_conversas_corretores SET (security_invoker = on);

-- 5. Índices otimizados para a estrutura real
-- Índice para consultas de heatmap baseadas em timestamp
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_heatmap_lookup 
ON public.whatsapp_messages (instance_id, from_me, timestamp DESC)
WHERE from_me = true AND timestamp IS NOT NULL;

-- Índice para relacionamento instances -> messages
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_user_company_active 
ON public.whatsapp_instances (user_id, company_id, is_active)
WHERE is_active = true;

-- Índice simples para timestamp (sem EXTRACT que não é IMMUTABLE)
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_timestamp_simple
ON public.whatsapp_messages (timestamp DESC, from_me)
WHERE from_me = true AND timestamp IS NOT NULL;

-- 6. Conceder permissões necessárias
GRANT SELECT ON public.vw_metricas_heatmap_conversas_corretores TO authenticated;
GRANT SELECT ON public.vw_segura_heatmap_conversas_corretores TO authenticated;
