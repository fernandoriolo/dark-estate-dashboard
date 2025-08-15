--
-- Migration: Atualiza definição de VGV para usar imoveisvivareal.preco (imóveis à venda)
-- - VGV mensal: soma de preco por mês de criação do imóvel (created_at) filtrando imóveis à venda
-- - VGV atual: soma de preco dos imóveis à venda e disponíveis (estoque atual)
-- Critérios de venda: modalidade IN ('For Sale','Sale/Rent','Venda','Sale')
-- Critérios de disponibilidade (VGV atual): disponibilidade = 'disponivel'

create or replace view public.vw_metricas_vgv_mensal as
select
  company_id,
  date_trunc('month', created_at)::date as mes,
  sum(preco) as soma_vgv,
  count(*) as total_itens
from public.imoveisvivareal
where coalesce(modalidade,'') ilike any (array['For Sale','Sale/Rent','Venda','Sale'])
group by 1,2;
comment on view public.vw_metricas_vgv_mensal is
  'VGV mensal: soma(preco) de imoveis à venda criados no mês (por empresa).';

create or replace view public.vw_segura_metricas_vgv_mensal as
select * from public.vw_metricas_vgv_mensal
where company_id = (current_setting('request.jwt.claims', true)::json->>'company_id')::uuid;

-- VGV atual (estoque disponível de venda)
create or replace view public.vw_metricas_vgv_atual as
select
  company_id,
  coalesce(sum(preco),0)::numeric as soma_vgv
from public.imoveisvivareal
where coalesce(modalidade,'') ilike any (array['For Sale','Sale/Rent','Venda','Sale'])
  and disponibilidade = 'disponivel'
group by 1;
comment on view public.vw_metricas_vgv_atual is
  'VGV atual: soma(preco) de imoveis à venda e disponíveis por empresa.';

create or replace view public.vw_segura_metricas_vgv_atual as
select * from public.vw_metricas_vgv_atual
where company_id = (current_setting('request.jwt.claims', true)::json->>'company_id')::uuid;

-- Segurança: SECURITY INVOKER
alter view if exists public.vw_metricas_vgv_mensal set (security_invoker = on);
alter view if exists public.vw_segura_metricas_vgv_mensal set (security_invoker = on);
alter view if exists public.vw_metricas_vgv_atual set (security_invoker = on);
alter view if exists public.vw_segura_metricas_vgv_atual set (security_invoker = on);

-- Grant somente nas views seguras
grant select on public.vw_segura_metricas_vgv_atual to authenticated;

