--
-- Migration: Ajuste de segurança das views (SECURITY INVOKER)
-- Evita execução com permissões do criador e segue RLS das tabelas-fonte
--

alter view if exists public.vw_metricas_vgv_mensal               set (security_invoker = on);
alter view if exists public.vw_metricas_leads_por_canal          set (security_invoker = on);
alter view if exists public.vw_metricas_distribuicao_tipo_imovel set (security_invoker = on);
alter view if exists public.vw_metricas_funil_leads              set (security_invoker = on);
alter view if exists public.vw_metricas_mapa_calor_atividade     set (security_invoker = on);
alter view if exists public.vw_metricas_taxa_ocupacao            set (security_invoker = on);

alter view if exists public.vw_segura_metricas_vgv_mensal               set (security_invoker = on);
alter view if exists public.vw_segura_metricas_leads_por_canal          set (security_invoker = on);
alter view if exists public.vw_segura_metricas_distribuicao_tipo_imovel set (security_invoker = on);
alter view if exists public.vw_segura_metricas_funil_leads              set (security_invoker = on);
alter view if exists public.vw_segura_metricas_mapa_calor_atividade     set (security_invoker = on);
alter view if exists public.vw_segura_metricas_taxa_ocupacao            set (security_invoker = on);


