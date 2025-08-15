--
-- Migration: Redefine views seguras de VGV para não depender de company_id nulo nos dados
-- As views seguras passam a calcular diretamente a partir de imoveisvivareal
-- usando o company_id do JWT e incluindo linhas com company_id nulo.
-- Critérios de venda: modalidade IN ('For Sale','Sale/Rent','Venda','Sale')

create or replace view public.vw_segura_metricas_vgv_mensal as
select
  date_trunc('month', created_at)::date as mes,
  sum(preco) as soma_vgv,
  count(*) as total_contratos
from public.imoveisvivareal
where (
  company_id = (current_setting('request.jwt.claims', true)::json->>'company_id')::uuid
  or company_id is null
)
and coalesce(modalidade,'') ilike any (array['For Sale','Sale/Rent','Venda','Sale'])
group by 1
order by 1;
comment on view public.vw_segura_metricas_vgv_mensal is
  'VGV mensal seguro por empresa (JWT). Soma(preco) de imoveis à venda; inclui linhas sem company_id.';

create or replace view public.vw_segura_metricas_vgv_atual as
select
  coalesce(sum(preco),0)::numeric as soma_vgv
from public.imoveisvivareal
where (
  company_id = (current_setting('request.jwt.claims', true)::json->>'company_id')::uuid
  or company_id is null
)
and coalesce(modalidade,'') ilike any (array['For Sale','Sale/Rent','Venda','Sale'])
and disponibilidade = 'disponivel';
comment on view public.vw_segura_metricas_vgv_atual is
  'VGV atual seguro por empresa (JWT). Soma(preco) de imoveis à venda e disponíveis; inclui linhas sem company_id.';

alter view if exists public.vw_segura_metricas_vgv_mensal set (security_invoker = on);
alter view if exists public.vw_segura_metricas_vgv_atual set (security_invoker = on);


