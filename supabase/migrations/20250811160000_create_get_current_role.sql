-- Função para obter a role efetiva a partir do perfil; padrão seguro = corretor
CREATE OR REPLACE FUNCTION public.get_current_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT up.role::text FROM public.user_profiles up WHERE up.id = auth.uid()),
    (current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'role'),
    'corretor'
  );
$$;

REVOKE ALL ON FUNCTION public.get_current_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_current_role() TO authenticated;
