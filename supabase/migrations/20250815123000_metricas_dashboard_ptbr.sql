--
-- Migration: Métricas do Dashboard (nomes e índices em pt-BR)
-- Objetivo: criar índices didáticos e views (e views "seguras") para alimentar gráficos do módulo PAINEL
-- Observação: manter RLS nas tabelas-fonte; conceder acesso apenas às views seguras
--

-- =============================
-- 1) ÍNDICES DIDÁTICOS (pt-BR)
-- =============================

-- contratos (VGV mensal)
create index if not exists idx_contratos_empresa_data_assinatura
  on public.contracts (company_id, data_assinatura);
comment on index public.idx_contratos_empresa_data_assinatura is
  'Acelera consultas por empresa e mês/ano de assinatura para VGV mensal.';

-- leads (canal, funil, heatmap)
create index if not exists idx_leads_empresa_criado_em
  on public.leads (company_id, created_at);
comment on index public.idx_leads_empresa_criado_em is
  'Acelera contagens por dia/hora (heatmap) e janelas de tempo por empresa.';

create index if not exists idx_leads_empresa_canal_origem
  on public.leads (company_id, source);
comment on index public.idx_leads_empresa_canal_origem is
  'Acelera agregações por canal de origem (source) por empresa.';

create index if not exists idx_leads_empresa_estagio
  on public.leads (company_id, stage);
comment on index public.idx_leads_empresa_estagio is
  'Acelera contagens por estágio do funil (stage) por empresa.';

-- imóveis (ocupação)
create index if not exists idx_imoveis_empresa_disponibilidade
  on public.imoveisvivareal (company_id, disponibilidade);
comment on index public.idx_imoveis_empresa_disponibilidade is
  'Acelera cálculo de taxa de ocupação por empresa usando a coluna de disponibilidade do imóvel.';


-- ============================================
-- 2) VIEWS BASE DE MÉTRICAS (sem filtro de RLS)
--    (usar sempre as views seguras para consumo)
-- ============================================

-- 2.1) VGV mensal (12m) + contagem de contratos
create or replace view public.vw_metricas_vgv_mensal as
select
  company_id,
  date_trunc('month', data_assinatura)::date as mes,
  sum(valor) as soma_vgv,
  count(*) as total_contratos
from public.contracts
where tipo = 'Venda'
group by 1,2;
comment on view public.vw_metricas_vgv_mensal is
  'VGV mensal (soma de "valor") e contagem de contratos de venda por empresa e mês.';

-- 2.2) Leads por canal (top 8 + "Outros")
create or replace view public.vw_metricas_leads_por_canal as
with base as (
  select company_id,
         coalesce(nullif(trim(source), ''), 'Desconhecido') as canal,
         count(*) as total
  from public.leads
  group by 1,2
), ranqueado as (
  select *, dense_rank() over (partition by company_id order by total desc) as posicao
  from base
)
select
  company_id,
  case when posicao <= 8 then canal else 'Outros' end as canal_bucket,
  sum(total) as total
from ranqueado
group by 1,2;
comment on view public.vw_metricas_leads_por_canal is
  'Distribuição de leads por canal de origem (top 8 por empresa; restante agrupado em "Outros").';

-- 2.3) Distribuição por tipo de imóvel
create or replace view public.vw_metricas_distribuicao_tipo_imovel as
select company_id,
       tipo_imovel as tipo_imovel,
       count(*) as total
from public.imoveisvivareal
group by 1,2;
comment on view public.vw_metricas_distribuicao_tipo_imovel is
  'Contagem de imóveis por tipo (tipo_imovel) por empresa.';

-- 2.4) Funil por estágio dos leads
create or replace view public.vw_metricas_funil_leads as
select company_id,
       stage as estagio,
       count(*) as total
from public.leads
group by 1,2;
comment on view public.vw_metricas_funil_leads is
  'Contagem de leads por estágio (stage) do funil por empresa.';

-- 2.5) Mapa de calor – horário x dia (0=Dom, 1=Seg, ... 6=Sáb)
create or replace view public.vw_metricas_mapa_calor_atividade as
select
  company_id,
  extract(dow  from created_at)::int as dia_semana,
  extract(hour from created_at)::int as hora,
  count(*) as total
from public.leads
group by 1,2,3;
comment on view public.vw_metricas_mapa_calor_atividade is
  'Heatmap de atividade de leads por dia da semana (0=Dom) e hora, por empresa.';

-- 2.6) Taxa de ocupação (% de indisponíveis)
create or replace view public.vw_metricas_taxa_ocupacao as
select
  company_id,
  case when count(*) = 0 then 0::numeric
       else (1 - (sum(case when disponibilidade = 'disponivel' then 1 else 0 end)::numeric
                  / count(*)::numeric)) end as taxa_ocupacao
from public.imoveisvivareal
group by 1;
comment on view public.vw_metricas_taxa_ocupacao is
  'Taxa de ocupação da carteira: proporção de imóveis não disponíveis por empresa.';


-- ======================================
-- 3) VIEWS SEGURAS (filtram por company_id)
--    Usar estas views no frontend/app
-- ======================================

-- Helper: extrai company_id do JWT (texto → uuid)
-- Observação: sem criar função aqui para evitar permissões; fazemos casting direto nas views.

create or replace view public.vw_segura_metricas_vgv_mensal as
select *
from public.vw_metricas_vgv_mensal
where company_id = (current_setting('request.jwt.claims', true)::json->>'company_id')::uuid;
comment on view public.vw_segura_metricas_vgv_mensal is
  'View segura (filtro por company_id do JWT) para VGV mensal.';

create or replace view public.vw_segura_metricas_leads_por_canal as
select *
from public.vw_metricas_leads_por_canal
where company_id = (current_setting('request.jwt.claims', true)::json->>'company_id')::uuid;
comment on view public.vw_segura_metricas_leads_por_canal is
  'View segura (filtro por company_id do JWT) para leads por canal (top 8 + Outros).';

create or replace view public.vw_segura_metricas_distribuicao_tipo_imovel as
select *
from public.vw_metricas_distribuicao_tipo_imovel
where company_id = (current_setting('request.jwt.claims', true)::json->>'company_id')::uuid;
comment on view public.vw_segura_metricas_distribuicao_tipo_imovel is
  'View segura (filtro por company_id do JWT) para distribuição por tipo de imóvel.';

create or replace view public.vw_segura_metricas_funil_leads as
select *
from public.vw_metricas_funil_leads
where company_id = (current_setting('request.jwt.claims', true)::json->>'company_id')::uuid;
comment on view public.vw_segura_metricas_funil_leads is
  'View segura (filtro por company_id do JWT) para funil por estágio de leads.';

create or replace view public.vw_segura_metricas_mapa_calor_atividade as
select *
from public.vw_metricas_mapa_calor_atividade
where company_id = (current_setting('request.jwt.claims', true)::json->>'company_id')::uuid;
comment on view public.vw_segura_metricas_mapa_calor_atividade is
  'View segura (filtro por company_id do JWT) para heatmap de atividade (dia x hora).';

create or replace view public.vw_segura_metricas_taxa_ocupacao as
select *
from public.vw_metricas_taxa_ocupacao
where company_id = (current_setting('request.jwt.claims', true)::json->>'company_id')::uuid;
comment on view public.vw_segura_metricas_taxa_ocupacao is
  'View segura (filtro por company_id do JWT) para taxa de ocupação dos imóveis.';


-- ======================
-- 4) PERMISSÕES (GRANTS)
-- ======================

grant select on
  public.vw_segura_metricas_vgv_mensal,
  public.vw_segura_metricas_leads_por_canal,
  public.vw_segura_metricas_distribuicao_tipo_imovel,
  public.vw_segura_metricas_funil_leads,
  public.vw_segura_metricas_mapa_calor_atividade,
  public.vw_segura_metricas_taxa_ocupacao
to authenticated;

-- Não conceder acesso às views base não filtradas


