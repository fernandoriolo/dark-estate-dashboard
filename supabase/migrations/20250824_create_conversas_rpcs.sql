-- Criação de RPCs para módulo Conversas
-- 1) get_instances_with_conversation_count
-- 2) get_conversations_for_corretor

-- RPC 1: retorna instâncias com contagem de conversas distintas
create or replace function public.get_instances_with_conversation_count(user_id uuid)
returns table (
  instancia text,
  conversation_count bigint
) language sql stable security definer set search_path = public as $$
  with base as (
    select instancia, session_id
    from public.imobipro_messages
    where instancia is not null and instancia <> ''
  )
  select b.instancia, count(distinct b.session_id) as conversation_count
  from base b
  group by b.instancia
  order by conversation_count desc;
$$;

revoke all on function public.get_instances_with_conversation_count(uuid) from public;
grant execute on function public.get_instances_with_conversation_count(uuid) to authenticated, anon;

-- RPC 2: retorna conversas do corretor (ou por instância)
create or replace function public.get_conversations_for_corretor(
  user_id uuid,
  selected_instance text default null
) returns table (
  session_id text,
  instancia text,
  display_name text,
  lead_phone text,
  lead_stage text,
  last_message_date timestamp with time zone,
  message_count bigint,
  last_message_content text,
  last_message_type text
) language sql stable security definer set search_path = public as $$
  with base as (
    select 
      m.session_id,
      m.instancia,
      m.data as msg_date,
      m.message
    from public.imobipro_messages m
    where (selected_instance is null or lower(m.instancia) = lower(selected_instance))
  ), agg as (
    select 
      b.session_id,
      b.instancia,
      max(b.msg_date) as last_message_date,
      count(*) as message_count
    from base b
    group by b.session_id, b.instancia
  ), last_msg as (
    select distinct on (m.session_id)
      m.session_id,
      m.instancia,
      m.data as last_message_date,
      m.message
    from public.imobipro_messages m
    where (selected_instance is null or lower(m.instancia) = lower(selected_instance))
    order by m.session_id, m.data desc, m.id desc
  )
  select 
    a.session_id,
    a.instancia,
    coalesce(lp.full_name, a.session_id) as display_name,
    lp.phone as lead_phone,
    lp.stage as lead_stage,
    a.last_message_date,
    a.message_count,
    coalesce( (last_msg.message->>'content'), (last_msg.message)::text ) as last_message_content,
    coalesce( (last_msg.message->>'type'), 'unknown') as last_message_type
  from agg a
  left join last_msg on last_msg.session_id = a.session_id
  left join (
    -- Placeholder: ajuste se houver tabela de leads associada às sessões
    select session_id, min(null::text) as phone, min(null::text) as stage, min(null::text) as full_name
    from (
      select m.session_id
      from public.imobipro_messages m
      group by m.session_id
    ) x
    group by session_id
  ) lp on lp.session_id = a.session_id
  order by a.last_message_date desc;
$$;

revoke all on function public.get_conversations_for_corretor(uuid, text) from public;
grant execute on function public.get_conversations_for_corretor(uuid, text) to authenticated, anon;


