-- Corrige erro de recursão infinita nas políticas da tabela user_profiles
-- Causa: política "Gestores can view all profiles in company" consultava a própria tabela user_profiles
-- Solução: remover a política recursiva e manter regras seguras (usuário só vê/edita o próprio perfil)

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Remover política problemática
DROP POLICY IF EXISTS "Gestores can view all profiles in company" ON public.user_profiles;

-- Garantir políticas seguras e não-recursivas
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile" ON public.user_profiles
FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" ON public.user_profiles
FOR UPDATE USING (auth.uid() = id);

-- Observação: Se for necessário que gestores/admins vejam todos os perfis,
-- o ideal é usar claims no JWT (via auth) com company_id/role e políticas baseadas em auth.jwt(),
-- sem consultas à própria tabela user_profiles para evitar recursão.


