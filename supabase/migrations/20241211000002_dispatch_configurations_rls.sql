-- Migration: RLS Policies para dispatch_configurations
-- Define políticas de acesso baseadas em role e company_id

-- 1. Ativar RLS
ALTER TABLE public.dispatch_configurations ENABLE ROW LEVEL SECURITY;

-- 2. Admin/Gestor: CRUD completo na empresa
CREATE POLICY "admin_gestor_dispatch_configs_all" ON public.dispatch_configurations
FOR ALL TO authenticated
USING (
  company_id = (
    SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
  )
  AND (
    SELECT role FROM public.user_profiles WHERE id = auth.uid()
  ) IN ('admin', 'gestor')
)
WITH CHECK (
  company_id = (
    SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
  )
);

-- 3. Corretor: leitura das configurações que incluem ele
CREATE POLICY "corretor_dispatch_configs_read" ON public.dispatch_configurations  
FOR SELECT TO authenticated
USING (
  company_id = (
    SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
  )
  AND (
    (SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('admin', 'gestor')
    OR auth.uid()::text = ANY(
      SELECT jsonb_array_elements_text(assigned_brokers)
    )
  )
);

-- 4. Política adicional: apenas o criador pode editar suas próprias configurações (corretor)
CREATE POLICY "owner_dispatch_configs_update" ON public.dispatch_configurations
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  AND company_id = (
    SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
  )
)
WITH CHECK (
  user_id = auth.uid()
  AND company_id = (
    SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
  )
);

-- 5. Inserir configuração padrão para empresas existentes
DO $$
DECLARE
  company_record RECORD;
  admin_user_id UUID;
BEGIN
  -- Para cada empresa ativa, criar uma configuração padrão se não existir
  FOR company_record IN 
    SELECT id, name FROM public.companies WHERE is_active = true
  LOOP
    -- Buscar um admin ou gestor da empresa
    SELECT up.id INTO admin_user_id
    FROM public.user_profiles up
    WHERE up.company_id = company_record.id 
      AND up.role IN ('admin', 'gestor')
      AND up.is_active = true
    LIMIT 1;
    
    -- Se encontrou um admin/gestor, criar configuração padrão
    IF admin_user_id IS NOT NULL THEN
      INSERT INTO public.dispatch_configurations (
        name, 
        description, 
        user_id,
        company_id,
        assigned_brokers, 
        time_windows, 
        message_template,
        is_default
      ) VALUES (
        'Configuração Padrão',
        'Setup básico para novos leads da empresa ' || company_record.name,
        admin_user_id,
        company_record.id,
        '[]'::jsonb,
        '{
          "monday": {"start": "09:00", "end": "18:00", "enabled": true},
          "tuesday": {"start": "09:00", "end": "18:00", "enabled": true},
          "wednesday": {"start": "09:00", "end": "18:00", "enabled": true},
          "thursday": {"start": "09:00", "end": "18:00", "enabled": true},
          "friday": {"start": "09:00", "end": "18:00", "enabled": true},
          "saturday": {"start": "09:00", "end": "14:00", "enabled": true},
          "sunday": {"enabled": false}
        }'::jsonb,
        'Olá {nome}, tudo bem? Vi seu interesse no imóvel e gostaria de ajudar. Quando podemos conversar?',
        true
      ) ON CONFLICT (company_id, name) DO NOTHING;
    END IF;
  END LOOP;
END $$;
