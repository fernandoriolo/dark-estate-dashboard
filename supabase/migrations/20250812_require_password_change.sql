-- ==================================================
-- Requerer troca de senha no primeiro acesso para usuários criados por Admin/Gestor
-- Adiciona colunas no user_profiles e não afeta RLS existentes
-- ==================================================

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS require_password_change boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS password_changed_at timestamptz;

COMMENT ON COLUMN public.user_profiles.require_password_change IS 'Se true, força o usuário a trocar a senha no próximo login';
COMMENT ON COLUMN public.user_profiles.password_changed_at IS 'Timestamp da última troca de senha bem sucedida';


