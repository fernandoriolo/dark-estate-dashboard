-- Corrigir RLS da tabela oncall_schedules para incluir assigned_user_id
-- Problema: assigned_user não conseguia ver sua própria escala

-- SELECT: dono (user_id), assigned_user, ou gestores/admins da mesma empresa
drop policy if exists oncall_select on public.oncall_schedules;
create policy oncall_select on public.oncall_schedules
for select using (
  user_id = auth.uid()
  or assigned_user_id = auth.uid()
  or exists (
    select 1 from public.user_profiles up
    where up.id = auth.uid()
      and up.company_id = oncall_schedules.company_id
      and up.role in ('gestor','admin')
  )
);

-- INSERT/UPDATE/DELETE: dono (user_id), assigned_user, ou gestores/admins da mesma empresa
drop policy if exists oncall_modify on public.oncall_schedules;
create policy oncall_modify on public.oncall_schedules
for all using (
  user_id = auth.uid()
  or assigned_user_id = auth.uid()
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

select 'oncall_schedules RLS corrigida para assigned_user_id' as status, now() as at;