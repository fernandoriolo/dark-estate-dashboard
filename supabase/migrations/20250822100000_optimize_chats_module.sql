-- ==========================================
-- MIGRAÇÃO: Otimização do Módulo Chats
-- Data: 2025-08-22
-- Descrição: Criação de índices e views otimizadas para carregamento seletivo do módulo Chats
-- ==========================================

-- 1. ÍNDICES PARA PERFORMANCE
-- ==========================================

-- Índice composto para busca de instância + session + data (Keyset pagination)
CREATE INDEX IF NOT EXISTS idx_imsg_instancia_session_data 
  ON imobipro_messages(instancia, session_id, data);

-- Índice para busca apenas por sessão + data (3ª coluna - mensagens)
CREATE INDEX IF NOT EXISTS idx_imsg_session_data 
  ON imobipro_messages(session_id, data);

-- Índice GIN para busca por conteúdo das mensagens (busca textual)
CREATE INDEX IF NOT EXISTS idx_imsg_content_gin 
  ON imobipro_messages USING gin ((message->>'content'));

-- Índice para corretor responsável (2ª coluna - conversas por corretor)
CREATE INDEX IF NOT EXISTS idx_leads_corretor 
  ON leads(id_corretor_responsavel);

-- Índice para ordenação temporal de leads
CREATE INDEX IF NOT EXISTS idx_leads_created_at 
  ON leads(created_at DESC);

-- 2. VIEW OTIMIZADA PARA CONVERSAS POR INSTÂNCIA
-- ==========================================

-- View que agrupa conversas por instância com informações de prévia
CREATE OR REPLACE VIEW v_conversas_por_instancia AS
SELECT 
  instancia,
  session_id,
  MAX(data) AS last_time,
  (ARRAY_AGG(message ORDER BY data DESC))[1] AS last_message,
  COUNT(*)::int AS total_mensagens,
  MIN(data) AS first_time
FROM imobipro_messages
WHERE session_id IS NOT NULL 
  AND instancia IS NOT NULL
GROUP BY instancia, session_id;

-- Comentários da view
COMMENT ON VIEW v_conversas_por_instancia IS 'View otimizada para listar conversas por instância com preview da última mensagem';

-- 3. VIEW PARA INSTÂNCIAS COM CONTAGEM DE CONVERSAS
-- ==========================================

-- View que lista instâncias com contagem total de conversas
CREATE OR REPLACE VIEW v_instancias_com_conversas AS
SELECT 
  instancia,
  COUNT(DISTINCT session_id) AS total_conversas,
  MAX(data) AS last_activity_time,
  MIN(data) AS first_activity_time
FROM imobipro_messages
WHERE instancia IS NOT NULL 
  AND session_id IS NOT NULL
GROUP BY instancia
ORDER BY total_conversas DESC, instancia;

-- Comentários da view
COMMENT ON VIEW v_instancias_com_conversas IS 'View otimizada para listar instâncias com contagem de conversas';

-- 4. FUNÇÃO PARA BUSCA OTIMIZADA DE MENSAGENS COM KEYSET PAGINATION
-- ==========================================

-- Função para buscar mensagens com paginação keyset
CREATE OR REPLACE FUNCTION buscar_mensagens_keyset(
  p_session_id TEXT,
  p_cursor_data TIMESTAMPTZ DEFAULT NULL,
  p_cursor_id INTEGER DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_ascending BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
  id INTEGER,
  session_id TEXT,
  message JSONB,
  data TIMESTAMPTZ,
  instancia TEXT
) 
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    im.id, 
    im.session_id, 
    im.message, 
    im.data, 
    im.instancia
  FROM imobipro_messages im
  WHERE im.session_id = p_session_id
    AND (
      p_cursor_data IS NULL OR 
      CASE 
        WHEN p_ascending THEN (im.data, im.id) > (p_cursor_data, COALESCE(p_cursor_id, 0))
        ELSE (im.data, im.id) < (p_cursor_data, COALESCE(p_cursor_id, 999999999))
      END
    )
  ORDER BY 
    CASE WHEN p_ascending THEN im.data END ASC,
    CASE WHEN NOT p_ascending THEN im.data END DESC,
    CASE WHEN p_ascending THEN im.id END ASC,
    CASE WHEN NOT p_ascending THEN im.id END DESC
  LIMIT p_limit;
$$;

-- Comentários da função
COMMENT ON FUNCTION buscar_mensagens_keyset IS 'Função otimizada para buscar mensagens com paginação keyset para evitar OFFSET';

-- 5. FUNÇÃO PARA BUSCA OTIMIZADA DE CONVERSAS COM KEYSET PAGINATION
-- ==========================================

-- Função para buscar conversas com paginação keyset
CREATE OR REPLACE FUNCTION buscar_conversas_keyset(
  p_instancia TEXT,
  p_cursor_time TIMESTAMPTZ DEFAULT NULL,
  p_cursor_session TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_search_term TEXT DEFAULT NULL
)
RETURNS TABLE (
  session_id TEXT,
  instancia TEXT,
  last_time TIMESTAMPTZ,
  last_message JSONB,
  total_mensagens INTEGER,
  first_time TIMESTAMPTZ
) 
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    v.session_id,
    v.instancia,
    v.last_time,
    v.last_message,
    v.total_mensagens,
    v.first_time
  FROM v_conversas_por_instancia v
  WHERE v.instancia = p_instancia
    AND (
      p_cursor_time IS NULL OR 
      (v.last_time, v.session_id) < (p_cursor_time, COALESCE(p_cursor_session, ''))
    )
    AND (
      p_search_term IS NULL OR 
      v.last_message->>'content' ILIKE '%' || p_search_term || '%' OR
      v.session_id ILIKE '%' || p_search_term || '%'
    )
  ORDER BY v.last_time DESC, v.session_id DESC
  LIMIT p_limit;
$$;

-- Comentários da função
COMMENT ON FUNCTION buscar_conversas_keyset IS 'Função otimizada para buscar conversas por instância com paginação keyset e busca opcional';

-- 6. ÍNDICES ADICIONAIS PARA AS VIEWS
-- ==========================================

-- Índice para otimizar a view de instâncias
CREATE INDEX IF NOT EXISTS idx_imsg_instancia_session_not_null 
  ON imobipro_messages(instancia) 
  WHERE instancia IS NOT NULL AND session_id IS NOT NULL;

-- Índice para otimizar ordenação por data nas views
CREATE INDEX IF NOT EXISTS idx_imsg_data_desc 
  ON imobipro_messages(data DESC);

-- 7. ATUALIZAÇÃO DE ESTATÍSTICAS
-- ==========================================

-- Atualizar estatísticas da tabela principal
ANALYZE imobipro_messages;
ANALYZE leads;
ANALYZE whatsapp_instances;

-- 8. PERMISSÕES
-- ==========================================

-- Conceder permissões para as views
GRANT SELECT ON v_conversas_por_instancia TO authenticated;
GRANT SELECT ON v_instancias_com_conversas TO authenticated;

-- Conceder permissões para as funções
GRANT EXECUTE ON FUNCTION buscar_mensagens_keyset TO authenticated;
GRANT EXECUTE ON FUNCTION buscar_conversas_keyset TO authenticated;

-- 9. COMENTÁRIOS FINAIS
-- ==========================================

COMMENT ON INDEX idx_imsg_instancia_session_data IS 'Índice composto para busca eficiente por instância + sessão + data com keyset pagination';
COMMENT ON INDEX idx_imsg_session_data IS 'Índice para busca eficiente de mensagens por sessão ordenadas por data';
COMMENT ON INDEX idx_imsg_content_gin IS 'Índice GIN para busca textual no conteúdo das mensagens';
COMMENT ON INDEX idx_leads_corretor IS 'Índice para busca de leads por corretor responsável';
COMMENT ON INDEX idx_leads_created_at IS 'Índice para ordenação temporal de leads (descendente)';

-- Log da migração
DO $$
BEGIN
  RAISE NOTICE 'Migração de otimização do módulo Chats aplicada com sucesso';
  RAISE NOTICE 'Índices criados: 7';
  RAISE NOTICE 'Views criadas: 2';
  RAISE NOTICE 'Funções criadas: 2';
  RAISE NOTICE 'Performance esperada: Melhoria significativa no carregamento seletivo';
END $$;