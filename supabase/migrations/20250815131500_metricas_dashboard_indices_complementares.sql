--
-- Migration: Índices complementares para métricas do dashboard (pt-BR)
-- Objetivo: otimizar consultas das views de métricas por empresa
--

-- contratos: VGV por mês (usa data_assinatura)
create index if not exists idx_contratos_empresa_data_assinatura
  on public.contracts (company_id, data_assinatura);
comment on index public.idx_contratos_empresa_data_assinatura is
  'Suporta agregações mensais (date_trunc) por empresa usando data_assinatura.';

-- leads: por canal (source) e por estágio (stage)
create index if not exists idx_leads_empresa_canal
  on public.leads (company_id, source);
comment on index public.idx_leads_empresa_canal is
  'Suporta agrupamento por canal de origem (source) por empresa.';

create index if not exists idx_leads_empresa_estagio
  on public.leads (company_id, stage);
comment on index public.idx_leads_empresa_estagio is
  'Suporta agrupamento por estágio (stage) por empresa.';

-- imoveisvivareal: distribuição por tipo de imóvel
create index if not exists idx_imoveis_empresa_tipo_imovel
  on public.imoveisvivareal (company_id, tipo_imovel);
comment on index public.idx_imoveis_empresa_tipo_imovel is
  'Suporta contagens por tipo_imovel por empresa.';


