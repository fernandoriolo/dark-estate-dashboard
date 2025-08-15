--
-- Migration: Corrige vw_segura_metricas_vgv_mensal preservando colunas e incluindo linhas sem company_id
-- Mantém colunas: (company_id, mes, soma_vgv, total_contratos)
-- company_id passa a ser o claim do JWT na saída
-- Critérios de venda: modalidade IN ('For Sale','Sale/Rent','Venda','Sale')

create or replace view public.vw_segura_metricas_vgv_mensal as
with claim as (
  select (current_setting('request.jwt.claims', true)::json->>'company_id')::uuid as cid
)
select
  (select cid from claim) as company_id,
  date_trunc('month', i.created_at)::date as mes,
  sum(i.preco) as soma_vgv,
  count(*) as total_contratos
from public.imoveisvivareal i, claim
where (
  i.company_id = claim.cid
  or i.company_id is null
)
and coalesce(i.modalidade,'') ilike any (array['For Sale','Sale/Rent','Venda','Sale'])
group by 1,2
order by 2;

alter view if exists public.vw_segura_metricas_vgv_mensal set (security_invoker = on);

-- Índices para performance
create index if not exists idx_imoveis_empresa_modalidade_created
  on public.imoveisvivareal (company_id, modalidade, created_at);

create index if not exists idx_imoveis_modalidade_disponibilidade
  on public.imoveisvivareal (modalidade, disponibilidade);


