-- Tabela de escalas de plantão por calendário (segunda a domingo)
-- Convenções: snake_case, RLS habilitado, multi-tenant (user_id/company_id)

create table if not exists public.oncall_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  calendar_id text not null,
  calendar_name text not null,

  mon_works boolean not null default false,
  mon_start time,
  mon_end time,

  tue_works boolean not null default false,
  tue_start time,
  tue_end time,

  wed_works boolean not null default false,
  wed_start time,
  wed_end time,

  thu_works boolean not null default false,
  thu_start time,
  thu_end time,

  fri_works boolean not null default false,
  fri_start time,
  fri_end time,

  sat_works boolean not null default false,
  sat_start time,
  sat_end time,

  sun_works boolean not null default false,
  sun_start time,
  sun_end time,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, calendar_id)
);

-- Índices de performance
create index if not exists idx_oncall_schedules_user_id on public.oncall_schedules(user_id);
create index if not exists idx_oncall_schedules_company_id on public.oncall_schedules(company_id);
create index if not exists idx_oncall_schedules_calendar_id on public.oncall_schedules(calendar_id);

-- Trigger para updated_at
create or replace function public.update_oncall_schedules_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_update_oncall_schedules_updated_at on public.oncall_schedules;
create trigger trg_update_oncall_schedules_updated_at
  before update on public.oncall_schedules
  for each row execute function public.update_oncall_schedules_updated_at();

-- RLS
alter table public.oncall_schedules enable row level security;

-- SELECT: dono (user_id) ou gestores/admins da mesma empresa
drop policy if exists oncall_select on public.oncall_schedules;
create policy oncall_select on public.oncall_schedules
for select using (
  user_id = auth.uid()
  or exists (
    select 1 from public.user_profiles up
    where up.id = auth.uid()
      and up.company_id = oncall_schedules.company_id
      and up.role in ('gestor','admin')
  )
);

-- INSERT/UPDATE/DELETE: dono (user_id) ou gestores/admins da mesma empresa
drop policy if exists oncall_modify on public.oncall_schedules;
create policy oncall_modify on public.oncall_schedules
for all using (
  user_id = auth.uid()
  or exists (
    select 1 from public.user_profiles up
    where up.id = auth.uid()
      and up.company_id = oncall_schedules.company_id
      and up.role in ('gestor','admin')
  )
) with check (
  -- garantir que a linha pertença à mesma empresa do usuário que grava
  exists (
    select 1 from public.user_profiles up
    where up.id = auth.uid()
      and up.company_id = oncall_schedules.company_id
  )
);

-- Verificação básica
select 'oncall_schedules criada' as status, now() as at;


