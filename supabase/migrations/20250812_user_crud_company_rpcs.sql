-- ==================================================
-- RPCs seguros para gestão de usuários por empresa
-- - Habilita Gestor a alterar HIERARQUIA apenas de corretores
-- - Habilita Gestor a desativar usuários da própria empresa
-- - Admin pode operar globalmente
-- ==================================================

-- Garantir helpers (seguras) para ler papel e empresa do solicitante
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_role text;
BEGIN
  SELECT role INTO v_role FROM public.user_profiles WHERE id = auth.uid();
  RETURN COALESCE(v_role, 'corretor');
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_company uuid;
BEGIN
  SELECT company_id INTO v_company FROM public.user_profiles WHERE id = auth.uid();
  RETURN v_company;
END;
$$;

-- Atualizar hierarquia de usuário dentro do escopo da empresa
CREATE OR REPLACE FUNCTION public.update_user_role_in_company(
  target_user_id uuid,
  new_role text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requester_role text;
  requester_company uuid;
  target_company uuid;
BEGIN
  requester_role := public.get_user_role();
  requester_company := public.get_user_company_id();

  IF requester_role NOT IN ('gestor','admin') THEN
    RAISE EXCEPTION 'forbidden: role insufficient';
  END IF;

  SELECT company_id INTO target_company FROM public.user_profiles WHERE id = target_user_id;

  IF requester_role = 'gestor' THEN
    IF target_company IS DISTINCT FROM requester_company THEN
      RAISE EXCEPTION 'forbidden: different company';
    END IF;
    IF new_role <> 'corretor' THEN
      RAISE EXCEPTION 'forbidden: gestor can only set role to corretor';
    END IF;
  END IF;

  IF new_role NOT IN ('corretor','gestor','admin') THEN
    RAISE EXCEPTION 'invalid role';
  END IF;

  UPDATE public.user_profiles SET role = new_role WHERE id = target_user_id;
END;
$$;

-- Desativar usuário dentro do escopo da empresa
CREATE OR REPLACE FUNCTION public.deactivate_user_in_company(
  target_user_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requester_role text;
  requester_company uuid;
  target_company uuid;
BEGIN
  requester_role := public.get_user_role();
  requester_company := public.get_user_company_id();

  IF requester_role NOT IN ('gestor','admin') THEN
    RAISE EXCEPTION 'forbidden: role insufficient';
  END IF;

  SELECT company_id INTO target_company FROM public.user_profiles WHERE id = target_user_id;

  IF requester_role = 'gestor' THEN
    IF target_company IS DISTINCT FROM requester_company THEN
      RAISE EXCEPTION 'forbidden: different company';
    END IF;
  END IF;

  UPDATE public.user_profiles SET is_active = false WHERE id = target_user_id;
END;
$$;

COMMENT ON FUNCTION public.update_user_role_in_company(uuid, text) IS 'Atualiza role de um usuário: admin global; gestor somente corretores da mesma empresa';
COMMENT ON FUNCTION public.deactivate_user_in_company(uuid) IS 'Desativa usuário: admin global; gestor apenas usuários da mesma empresa';


