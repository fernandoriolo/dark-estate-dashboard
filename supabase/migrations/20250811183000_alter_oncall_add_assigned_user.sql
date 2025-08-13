-- Adiciona coluna para vincular qual usuário é dono/plantonista da agenda

alter table public.oncall_schedules
  add column if not exists assigned_user_id uuid null references public.user_profiles(id) on delete set null;

create index if not exists idx_oncall_schedules_assigned_user on public.oncall_schedules(assigned_user_id);

-- Policies permanecem válidas (acesso por owner ou gestor/admin da mesma empresa)

select 'oncall_schedules: assigned_user_id adicionada' as status, now() as at;


