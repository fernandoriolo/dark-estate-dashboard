-- Reverter alterações do módulo de Usuários (RPCs e colunas recentes)
BEGIN;

-- Remover RPCs criadas para gestores
DROP FUNCTION IF EXISTS public.update_user_role_in_company(uuid, text);
DROP FUNCTION IF EXISTS public.deactivate_user_in_company(uuid);

-- Remover colunas adicionadas para troca de senha no primeiro acesso
ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS require_password_change;
ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS password_changed_at;

COMMIT;


