-- Criar tabela oncall_events para armazenar eventos da agenda criados localmente
-- Complementa a tabela oncall_schedules que define horários de plantão

create table if not exists public.oncall_events (
  id text primary key default gen_random_uuid()::text,
  
  -- Informações básicas do evento
  title text not null,
  description text,
  
  -- Data e horário
  starts_at timestamp with time zone not null,
  ends_at timestamp with time zone,
  
  -- Participantes
  client_name text,
  client_phone text,
  client_email text,
  
  -- Propriedade relacionada
  property_id text references public.properties(id) on delete set null,
  property_title text,
  address text,
  
  -- Tipo e status
  type text default 'Visita' check (type in ('Visita', 'Avaliação', 'Apresentação', 'Vistoria', 'Reunião', 'Ligação', 'Outro')),
  status text default 'Aguardando confirmação' check (status in ('Confirmado', 'Aguardando confirmação', 'Cancelado', 'Talvez')),
  
  -- Integração externa
  google_event_id text unique, -- ID do evento no Google Calendar quando sincronizado
  webhook_source text, -- Origem: 'local' para eventos criados aqui, 'google' para sincronizados
  
  -- Auditoria e controle
  company_id text not null references public.companies(id) on delete cascade,
  user_id text not null references auth.users(id) on delete cascade,
  assigned_user_id text references public.user_profiles(id) on delete set null, -- Corretor responsável
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Índices para performance
create index if not exists idx_oncall_events_starts_at on public.oncall_events(starts_at);
create index if not exists idx_oncall_events_company_id on public.oncall_events(company_id);
create index if not exists idx_oncall_events_user_id on public.oncall_events(user_id);
create index if not exists idx_oncall_events_assigned_user_id on public.oncall_events(assigned_user_id);
create index if not exists idx_oncall_events_property_id on public.oncall_events(property_id);
create index if not exists idx_oncall_events_google_event_id on public.oncall_events(google_event_id);
create index if not exists idx_oncall_events_status on public.oncall_events(status);
create index if not exists idx_oncall_events_type on public.oncall_events(type);

-- Trigger para updated_at
create or replace function public.update_oncall_events_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_update_oncall_events_updated_at on public.oncall_events;
create trigger trg_update_oncall_events_updated_at
  before update on public.oncall_events
  for each row execute function public.update_oncall_events_updated_at();

-- RLS (Row Level Security)
alter table public.oncall_events enable row level security;

-- Policy para SELECT: usuário da mesma empresa pode ver eventos da empresa
drop policy if exists oncall_events_select on public.oncall_events;
create policy oncall_events_select on public.oncall_events
  for select using (
    exists (
      select 1 from public.user_profiles up 
      where up.id = auth.uid()::text
      and up.company_id = oncall_events.company_id
    )
  );

-- Policy para INSERT/UPDATE/DELETE: gestor/admin da empresa ou próprio usuário responsável
drop policy if exists oncall_events_modify on public.oncall_events;
create policy oncall_events_modify on public.oncall_events
  for all using (
    exists (
      select 1 from public.user_profiles up 
      where up.id = auth.uid()::text
      and up.company_id = oncall_events.company_id
      and (
        up.role in ('admin', 'gestor') 
        or up.id = oncall_events.user_id
        or up.id = oncall_events.assigned_user_id
      )
    )
  )
  with check (
    exists (
      select 1 from public.user_profiles up 
      where up.id = auth.uid()::text
      and up.company_id = oncall_events.company_id
    )
  );

select 'oncall_events criada com RLS e índices' as status, now() as at;