-- Sincronização bidirecional entre auth.users e public.user_profiles
-- Para manter consistência em todas as operações CRUD

-- 1. Função para sincronizar auth.users -> user_profiles
CREATE OR REPLACE FUNCTION public.sync_auth_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Para INSERT/UPDATE em auth.users, sincronizar user_profiles
  INSERT INTO public.user_profiles (
    id, 
    email, 
    full_name, 
    phone, 
    role, 
    is_active, 
    company_id,
    created_at, 
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.phone,
    COALESCE(NEW.raw_user_meta_data->>'role', 'corretor'),
    true,
    CASE 
      WHEN NEW.raw_user_meta_data->>'company_id' IS NOT NULL 
      THEN (NEW.raw_user_meta_data->>'company_id')::uuid 
      ELSE NULL 
    END,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = NEW.email,
    full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', user_profiles.full_name, NEW.email),
    phone = COALESCE(NEW.phone, user_profiles.phone),
    updated_at = NOW();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Triggers para sincronização automática
DROP TRIGGER IF EXISTS sync_auth_insert ON auth.users;
DROP TRIGGER IF EXISTS sync_auth_update ON auth.users;

-- Trigger auth.users -> user_profiles
CREATE TRIGGER sync_auth_insert
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_auth_to_profile();

CREATE TRIGGER sync_auth_update
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (
    OLD.email IS DISTINCT FROM NEW.email OR
    OLD.phone IS DISTINCT FROM NEW.phone OR
    OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data
  )
  EXECUTE FUNCTION public.sync_auth_to_profile();

-- 3. Função para sincronização manual completa
CREATE OR REPLACE FUNCTION public.sync_all_users()
RETURNS TEXT AS $$
DECLARE
  sync_count INTEGER := 0;
  user_record RECORD;
BEGIN
  -- Sincronizar todos os usuários de auth.users para user_profiles
  FOR user_record IN 
    SELECT id, email, phone, raw_user_meta_data
    FROM auth.users
  LOOP
    INSERT INTO public.user_profiles (
      id, 
      email, 
      full_name, 
      phone, 
      role, 
      is_active, 
      company_id,
      created_at, 
      updated_at
    )
    VALUES (
      user_record.id,
      user_record.email,
      COALESCE(user_record.raw_user_meta_data->>'full_name', user_record.email),
      user_record.phone,
      COALESCE(user_record.raw_user_meta_data->>'role', 'corretor'),
      true,
      CASE 
        WHEN user_record.raw_user_meta_data->>'company_id' IS NOT NULL 
        THEN (user_record.raw_user_meta_data->>'company_id')::uuid 
        ELSE NULL 
      END,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = user_record.email,
      full_name = COALESCE(user_record.raw_user_meta_data->>'full_name', user_profiles.full_name, user_record.email),
      phone = COALESCE(user_record.phone, user_profiles.phone),
      updated_at = NOW();
      
    sync_count := sync_count + 1;
  END LOOP;
  
  RETURN 'Sincronizados ' || sync_count || ' usuários de auth.users para user_profiles';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Limpar telefones vazios e executar sincronização inicial
UPDATE public.user_profiles SET phone = NULL WHERE phone = '' OR phone = 'null';
UPDATE auth.users SET phone = NULL WHERE phone = '' OR phone = 'null';

-- Sincronizar de user_profiles para auth.users
UPDATE auth.users SET 
  phone = CASE WHEN up.phone IS NOT NULL AND up.phone != '' THEN up.phone ELSE NULL END,
  raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
      'full_name', up.full_name,
      'role', up.role
    )
FROM public.user_profiles up 
WHERE auth.users.id = up.id;

-- 5. Executar sincronização de auth.users para user_profiles
SELECT public.sync_all_users();

COMMENT ON FUNCTION public.sync_auth_to_profile() IS 'Sincroniza mudanças de auth.users para user_profiles automaticamente';
COMMENT ON FUNCTION public.sync_all_users() IS 'Sincronização manual de todos os usuários de auth.users para user_profiles';
