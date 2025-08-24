-- Ajuste de segurança/escopo: corretores veem apenas sua própria chat_instance
-- Assumimos que user_profiles.chat_instance armazena a key da instância (lowercase)

create or replace function public.get_instances_with_conversation_count(user_id uuid)
returns table (
  instancia text,
  conversation_count bigint
) language sql stable security definer set search_path = public as $$
  with me as (
    select role, coalesce(nullif(trim(lower(chat_instance)), ''), null) as chat_instance
    from public.user_profiles
    where id = user_id or user_id = user_id
    limit 1
  ), base as (
    select instancia, session_id
    from public.imobipro_messages m
    where instancia is not null and instancia <> ''
      and (
        (select role from me) in ('gestor','admin')
        or lower(m.instancia) = coalesce((select chat_instance from me), lower(m.instancia))
      )
  )
  select b.instancia, count(distinct b.session_id) as conversation_count
  from base b
  group by b.instancia
  order by conversation_count desc;
$$;

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
  with me as (
    select role, coalesce(nullif(trim(lower(chat_instance)), ''), null) as chat_instance
    from public.user_profiles
    where id = user_id or user_id = user_id
    limit 1
  ), base as (
    select 
      m.session_id,
      m.instancia,
      m.data as msg_date,
      m.message
    from public.imobipro_messages m
    where (selected_instance is null or lower(m.instancia) = lower(selected_instance))
      and (
        (select role from me) in ('gestor','admin')
        or lower(m.instancia) = coalesce((select chat_instance from me), lower(m.instancia))
      )
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
    from base m
    order by m.session_id, m.msg_date desc
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
    select session_id, min(null::text) as phone, min(null::text) as stage, min(null::text) as full_name
    from (
      select session_id from base group by session_id
    ) x
    group by session_id
  ) lp on lp.session_id = a.session_id
  order by a.last_message_date desc;
$$;


