--
-- Migration: View segura com breakdown por disponibilidade (ocupação)
-- Fonte: public.imoveisvivareal.disponibilidade
-- Filtra por company_id do JWT, incluindo linhas sem company_id
-- Colunas: disponibilidade, total, percentual (0..1)

create or replace view public.vw_segura_metricas_ocupacao_disponibilidade as
with claim as (
  select (current_setting('request.jwt.claims', true)::json->>'company_id')::uuid as cid
), base as (
  select i.disponibilidade
  from public.imoveisvivareal i, claim
  where (i.company_id = claim.cid or i.company_id is null)
)
select
  disponibilidade,
  count(*) as total,
  (count(*)::numeric / nullif(sum(count(*)) over (), 0)) as percentual
from base
group by disponibilidade
order by disponibilidade;

alter view if exists public.vw_segura_metricas_ocupacao_disponibilidade set (security_invoker = on);

grant select on public.vw_segura_metricas_ocupacao_disponibilidade to authenticated;


