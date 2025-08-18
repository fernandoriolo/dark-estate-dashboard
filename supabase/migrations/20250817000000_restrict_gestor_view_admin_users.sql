-- ==================================================
-- RPC: list_company_users (adicionar restrição para Gestores)
-- Objetivo: Gestores não podem visualizar usuários com role 'admin'
-- Data: 2025-08-17
-- ==================================================

-- Recriar função de verificação de role do usuário
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

-- Remover função existente para recriar com nova implementação
DROP FUNCTION IF EXISTS public.list_company_users(uuid, text, text[], integer, integer);

-- Atualizar list_company_users para implementar restrição de visualização
CREATE OR REPLACE FUNCTION public.list_company_users(
  target_company_id uuid DEFAULT NULL, -- ignorado no modo single-tenant
  search text DEFAULT NULL,
  roles text[] DEFAULT NULL,
  limit_count int DEFAULT 50,
  offset_count int DEFAULT 0
) RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  role text,
  company_id uuid,
  is_active boolean,
  created_at timestamptz
) AS $$
DECLARE
  requester_role text;
BEGIN
  -- Obter role do usuário solicitante
  requester_role := public.get_user_role();
  
  -- Aplicar filtro baseado no role do solicitante
  RETURN QUERY
    SELECT up.id,
           up.email,
           up.full_name,
           up.role,
           up.company_id,
           up.is_active,
           up.created_at
    FROM public.user_profiles up
    WHERE (search IS NULL OR (up.full_name ILIKE ('%'||search||'%') OR up.email ILIKE ('%'||search||'%')))
      AND (roles IS NULL OR up.role = ANY(roles))
      -- Restrição: Gestores não podem ver usuários Admin
      AND (requester_role = 'admin' OR up.role != 'admin')
    ORDER BY up.created_at DESC
    LIMIT limit_count OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.list_company_users(uuid, text, text[], int, int)
IS 'Lista usuários com restrição: Gestores não podem visualizar usuários Admin; Admin vê todos; suporta filtros opcionais por busca/roles e paginação.';