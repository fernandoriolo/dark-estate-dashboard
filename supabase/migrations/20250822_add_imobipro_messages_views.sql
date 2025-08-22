-- Normalização de instância (lower + trim)
create or replace function public.normalize_instance(t text)
returns text
language sql
immutable
as $$
  select lower(trim(t));
$$;

-- View: instâncias (corretores) com total de conversas
create or replace view public.vw_imobipro_instances as
select
  normalize_instance(instancia) as instancia_key,
  min(instancia) as instancia_label,
  count(distinct session_id) as total_conversas
from public.imobipro_messages
where coalesce(trim(instancia), '') <> ''
group by normalize_instance(instancia)
order by instancia_label;

-- View: conversas por instância (última mensagem de cada session_id)
create or replace view public.vw_imobipro_conversas as
with base as (
  select
    normalize_instance(instancia) as instancia_key,
    session_id,
    data,
    message
  from public.imobipro_messages
  where coalesce(trim(instancia), '') <> ''
), ranked as (
  select
    instancia_key,
    session_id,
    data,
    message,
    row_number() over (partition by instancia_key, session_id order by data desc) as rn
  from base
)
select
  instancia_key,
  session_id,
  data as last_data,
  message as last_message
from ranked
where rn = 1
order by last_data desc;

-- View: mensagens por sessão (normalizadas por instância)
create or replace view public.vw_imobipro_messages as
select
  normalize_instance(instancia) as instancia_key,
  session_id,
  data,
  message
from public.imobipro_messages
where coalesce(trim(instancia), '') <> ''
order by data asc;


