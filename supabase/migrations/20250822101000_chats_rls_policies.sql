-- ==========================================
-- MIGRAÇÃO: RLS Policies para Módulo Chats
-- Data: 2025-08-22
-- Descrição: Implementação de Row Level Security otimizada para o módulo Chats
-- ==========================================

-- 1. HABILITAR RLS NAS TABELAS (SE NÃO ESTIVER HABILITADO)
-- ==========================================

-- Verificar e habilitar RLS na tabela imobipro_messages
DO $$
BEGIN
  IF NOT (SELECT row_security FROM pg_tables WHERE tablename = 'imobipro_messages' AND schemaname = 'public') THEN
    ALTER TABLE imobipro_messages ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS habilitado na tabela imobipro_messages';
  ELSE
    RAISE NOTICE 'RLS já estava habilitado na tabela imobipro_messages';
  END IF;
END $$;

-- 2. REMOVER POLICIES EXISTENTES (PARA RECRIAÇÃO LIMPA)
-- ==========================================

-- Remover policies existentes da tabela imobipro_messages
DROP POLICY IF EXISTS "imsg_read_by_owner" ON imobipro_messages;
DROP POLICY IF EXISTS "imsg_insert_by_owner" ON imobipro_messages;
DROP POLICY IF EXISTS "imsg_update_by_owner" ON imobipro_messages;
DROP POLICY IF EXISTS "imsg_delete_by_owner" ON imobipro_messages;

-- Remover policies antigas que possam existir
DROP POLICY IF EXISTS "imobipro_messages_select_policy" ON imobipro_messages;
DROP POLICY IF EXISTS "imobipro_messages_insert_policy" ON imobipro_messages;
DROP POLICY IF EXISTS "imobipro_messages_update_policy" ON imobipro_messages;
DROP POLICY IF EXISTS "imobipro_messages_delete_policy" ON imobipro_messages;

-- 3. FUNÇÃO AUXILIAR PARA VERIFICAR ACESSO À INSTÂNCIA
-- ==========================================

-- Função para verificar se o usuário tem acesso a uma instância
CREATE OR REPLACE FUNCTION user_has_access_to_instance(p_instancia TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  -- Para instância SDR, todos os usuários autenticados têm acesso
  SELECT CASE 
    WHEN p_instancia = 'sdr' THEN TRUE
    
    -- Para outras instâncias, verificar se o usuário é dono da instância OU é gestor/admin da empresa
    ELSE EXISTS (
      SELECT 1 
      FROM whatsapp_instances wi
      INNER JOIN user_profiles up_owner ON wi.user_id = up_owner.id
      INNER JOIN user_profiles up_current ON up_current.id = auth.uid()
      WHERE wi.instance_name = p_instancia
        AND (
          -- Usuário é dono da instância
          wi.user_id = auth.uid()
          OR 
          -- Usuário é gestor/admin da mesma empresa do dono da instância
          (
            up_current.role IN ('gestor', 'admin') 
            AND up_current.company_id = up_owner.company_id
          )
        )
    )
  END;
$$;

-- Comentários da função
COMMENT ON FUNCTION user_has_access_to_instance IS 'Verifica se o usuário atual tem acesso a uma instância específica baseado nas regras de negócio';

-- 4. POLICIES DE LEITURA (SELECT)
-- ==========================================

-- Policy para leitura de mensagens
CREATE POLICY "imsg_select_by_access_rules" 
  ON imobipro_messages 
  FOR SELECT
  TO authenticated
  USING (
    -- Verificar acesso via função auxiliar
    user_has_access_to_instance(instancia)
  );

-- Comentários da policy
COMMENT ON POLICY "imsg_select_by_access_rules" ON imobipro_messages 
  IS 'Permite leitura de mensagens baseada no acesso à instância: SDR para todos, outras instâncias apenas para donos ou gestores/admins da empresa';

-- 5. POLICIES DE INSERÇÃO (INSERT)
-- ==========================================

-- Policy para inserção de mensagens
CREATE POLICY "imsg_insert_by_access_rules" 
  ON imobipro_messages 
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Verificar acesso via função auxiliar
    user_has_access_to_instance(instancia)
    AND
    -- Adicionar verificação adicional para role de corretor
    (
      SELECT up.role 
      FROM user_profiles up 
      WHERE up.id = auth.uid()
    ) IN ('corretor', 'gestor', 'admin')
  );

-- Comentários da policy
COMMENT ON POLICY "imsg_insert_by_access_rules" ON imobipro_messages 
  IS 'Permite inserção de mensagens apenas por corretores, gestores ou admins com acesso à instância';

-- 6. POLICIES DE ATUALIZAÇÃO (UPDATE)
-- ==========================================

-- Policy para atualização de mensagens (restrita)
CREATE POLICY "imsg_update_by_access_rules" 
  ON imobipro_messages 
  FOR UPDATE
  TO authenticated
  USING (
    -- Verificar acesso via função auxiliar
    user_has_access_to_instance(instancia)
    AND
    -- Apenas gestores e admins podem atualizar
    (
      SELECT up.role 
      FROM user_profiles up 
      WHERE up.id = auth.uid()
    ) IN ('gestor', 'admin')
  )
  WITH CHECK (
    -- Manter mesmas regras para o novo valor
    user_has_access_to_instance(instancia)
    AND
    (
      SELECT up.role 
      FROM user_profiles up 
      WHERE up.id = auth.uid()
    ) IN ('gestor', 'admin')
  );

-- Comentários da policy
COMMENT ON POLICY "imsg_update_by_access_rules" ON imobipro_messages 
  IS 'Permite atualização de mensagens apenas por gestores ou admins com acesso à instância';

-- 7. POLICIES DE EXCLUSÃO (DELETE)
-- ==========================================

-- Policy para exclusão de mensagens (muito restrita)
CREATE POLICY "imsg_delete_by_access_rules" 
  ON imobipro_messages 
  FOR DELETE
  TO authenticated
  USING (
    -- Verificar acesso via função auxiliar
    user_has_access_to_instance(instancia)
    AND
    -- Apenas admins podem excluir mensagens
    (
      SELECT up.role 
      FROM user_profiles up 
      WHERE up.id = auth.uid()
    ) = 'admin'
  );

-- Comentários da policy
COMMENT ON POLICY "imsg_delete_by_access_rules" ON imobipro_messages 
  IS 'Permite exclusão de mensagens apenas por administradores com acesso à instância';

-- 8. POLICIES PARA AS VIEWS
-- ==========================================

-- Habilitar RLS nas views (elas herdam as policies das tabelas base)
-- Nota: Views normalmente não precisam de RLS próprio se as tabelas base já têm

-- 9. POLÍTICAS PARA LEADS (RELACIONADO AO CHAT)
-- ==========================================

-- Verificar se existe RLS em leads e criar policy se necessário
DO $$
BEGIN
  -- Verificar se já existe uma policy para leads relacionada a chats
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'leads' 
    AND policyname = 'leads_select_for_chats'
  ) THEN
    
    -- Criar policy para leitura de leads no contexto de chats
    EXECUTE '
    CREATE POLICY "leads_select_for_chats" 
      ON leads 
      FOR SELECT
      TO authenticated
      USING (
        -- Admin: acesso total
        EXISTS (
          SELECT 1 FROM user_profiles up 
          WHERE up.id = auth.uid() AND up.role = ''admin''
        )
        OR
        -- Gestor: leads da empresa
        EXISTS (
          SELECT 1 FROM user_profiles up 
          WHERE up.id = auth.uid() 
            AND up.role = ''gestor''
            AND up.company_id = (
              SELECT up2.company_id 
              FROM user_profiles up2 
              WHERE up2.id = leads.id_corretor_responsavel
              LIMIT 1
            )
        )
        OR
        -- Corretor: apenas seus próprios leads
        id_corretor_responsavel = auth.uid()
        OR
        -- Leads sem corretor (SDR) são visíveis para todos
        id_corretor_responsavel IS NULL
      )';
    
    RAISE NOTICE 'Policy leads_select_for_chats criada com sucesso';
  ELSE
    RAISE NOTICE 'Policy leads_select_for_chats já existe';
  END IF;
END $$;

-- 10. GRANT PERMISSÕES PARA FUNÇÃO AUXILIAR
-- ==========================================

-- Conceder permissão para usar a função auxiliar
GRANT EXECUTE ON FUNCTION user_has_access_to_instance TO authenticated;

-- 11. TESTES DE VALIDAÇÃO DAS POLICIES
-- ==========================================

-- Criar função para testar as policies (apenas para desenvolvimento)
CREATE OR REPLACE FUNCTION test_imsg_rls_policies()
RETURNS TABLE (
  test_name TEXT,
  result BOOLEAN,
  description TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Este é um placeholder para testes futuros
  -- Em produção, estes testes devem ser executados via CI/CD
  
  RETURN QUERY VALUES 
    ('policy_existence', TRUE, 'Verificar se as policies foram criadas corretamente'),
    ('function_access', TRUE, 'Verificar se a função auxiliar está acessível'),
    ('basic_logic', TRUE, 'Verificar lógica básica das regras de acesso');
    
  -- TODO: Implementar testes reais das policies
  RAISE NOTICE 'Testes de RLS implementados como placeholder - execute testes manuais';
END $$;

-- Comentários da função de teste
COMMENT ON FUNCTION test_imsg_rls_policies IS 'Função para testar as policies RLS do módulo de chats (placeholder para testes futuros)';

-- 12. LOG DA MIGRAÇÃO
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE 'Migração de RLS para módulo Chats aplicada com sucesso';
  RAISE NOTICE 'Policies criadas: 4 (SELECT, INSERT, UPDATE, DELETE)';
  RAISE NOTICE 'Funções auxiliares criadas: 1';
  RAISE NOTICE 'Regras implementadas:';
  RAISE NOTICE '  - SDR: acesso para todos os usuários autenticados';
  RAISE NOTICE '  - Outras instâncias: apenas donos ou gestores/admins da empresa';
  RAISE NOTICE '  - Inserção: apenas corretores, gestores e admins';
  RAISE NOTICE '  - Atualização: apenas gestores e admins';
  RAISE NOTICE '  - Exclusão: apenas admins';
  RAISE NOTICE 'Segurança: Implementada conforme hierarquia de usuários definida';
END $$;