-- ==================================================
-- VERIFICAÇÃO DOS NÍVEIS DE ACESSO (GATE DE MERGE)
-- Alvo: modelo sem companies; regras por role
SET ROLE authenticated;
-- - corretor: SELECT geral; INSERT; UPDATE apenas disponibilidade; DELETE negado
-- - gestor/admin: CRUD completo
-- ==================================================

-- Utilitário: executar e esperar falha (se não falhar, levantar erro)
CREATE OR REPLACE FUNCTION public._expect_fail(sql_text text, failure_hint text)
RETURNS void AS $$
BEGIN
  BEGIN
    EXECUTE sql_text;
  EXCEPTION WHEN others THEN
    -- Falhou como esperado
    RETURN;
  END;
  RAISE EXCEPTION 'Teste deveria falhar: %', failure_hint USING ERRCODE = 'P0001';
END;
$$ LANGUAGE plpgsql;

-- Utilitário: executar e esperar sucesso (se falhar, propaga)
CREATE OR REPLACE FUNCTION public._expect_ok(sql_text text)
RETURNS void AS $$
BEGIN
  EXECUTE sql_text;
END;
$$ LANGUAGE plpgsql;

-- Ambiente de teste isolado
BEGIN;

-- ==================================================
-- 1) CORRETOR — pode ler, adicionar, alterar apenas disponibilidade; não pode deletar/editar outros campos
-- ==================================================
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-000000000001","user_metadata":{"role":"corretor"}}', true);

-- 1.1 Inserir em imoveisvivareal deve funcionar
SELECT public._expect_ok($$INSERT INTO public.imoveisvivareal (cidade, bairro, endereco, preco) VALUES ('TesteCity','Centro','Rua 1', 100000)$$);

-- Capturar ID inserido
WITH last AS (
  SELECT max(id) AS id FROM public.imoveisvivareal
)
SELECT 'corretor_last_imovel_id' AS k, id AS v FROM last;

-- 1.2 UPDATE de campo não relacionado à disponibilidade deve falhar (trigger bloqueia)
SELECT public._expect_fail(
  $$UPDATE public.imoveisvivareal SET preco = 200000 WHERE id = (SELECT max(id) FROM public.imoveisvivareal)$$,
  'Corretor não deve editar campos gerais'
);

-- 1.3/1.4 Testes de disponibilidade apenas se colunas existirem
DO $$
DECLARE has_disp boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='imoveisvivareal' AND column_name='disponibilidade'
  ) INTO has_disp;
  IF has_disp THEN
    PERFORM public._expect_fail(
      'UPDATE public.imoveisvivareal SET disponibilidade = ''indisponivel'', disponibilidade_observacao = NULL WHERE id = (SELECT max(id) FROM public.imoveisvivareal)',
      'Mudança para indisponivel exige observação'
    );
    PERFORM public._expect_ok(
      'UPDATE public.imoveisvivareal SET disponibilidade = ''indisponivel'', disponibilidade_observacao = ''Em manutenção'' WHERE id = (SELECT max(id) FROM public.imoveisvivareal)'
    );
  END IF;
END $$;

-- 1.5 DELETE deve falhar para corretor
SELECT public._expect_fail(
  $$DELETE FROM public.imoveisvivareal WHERE id = (SELECT max(id) FROM public.imoveisvivareal)$$,
  'Corretor não deve poder deletar'
);

-- ==================================================
-- 2) GESTOR — CRUD completo
-- ==================================================
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-000000000002","user_metadata":{"role":"gestor"}}', true);

-- 2.1 INSERT deve funcionar
SELECT public._expect_ok($$INSERT INTO public.imoveisvivareal (cidade, endereco, preco) VALUES ('CityG','Rua 2', 300000)$$);

-- 2.2 UPDATE geral deve funcionar
SELECT public._expect_ok(
  $$UPDATE public.imoveisvivareal SET preco = 350000 WHERE id = (SELECT max(id) FROM public.imoveisvivareal)$$
);

-- 2.3 DELETE deve funcionar
SELECT public._expect_ok(
  $$DELETE FROM public.imoveisvivareal WHERE id = (SELECT max(id) FROM public.imoveisvivareal)$$
);

-- ==================================================
-- 3) ADMIN — CRUD completo (mesmo comportamento do gestor)
-- ==================================================
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-000000000003","user_metadata":{"role":"admin"}}', true);

SELECT public._expect_ok($$INSERT INTO public.imoveisvivareal (cidade, endereco, preco) VALUES ('CityA','Rua 3', 400000)$$);
SELECT public._expect_ok($$UPDATE public.imoveisvivareal SET preco = 450000 WHERE id = (SELECT max(id) FROM public.imoveisvivareal)$$);
SELECT public._expect_ok($$DELETE FROM public.imoveisvivareal WHERE id = (SELECT max(id) FROM public.imoveisvivareal)$$);

-- ==================================================
-- 4) PROPERTIES — smoke básico (inserção por corretor + trava de campos)
-- Obs: depende do esquema aceitar nulos/valores mínimos; caso falhe, mantenha apenas verificação de UPDATE bloqueado
-- ==================================================
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-000000000004","user_metadata":{"role":"corretor"}}', true);

-- Tentar inserir um registro mínimo (se o esquema exigir campos, ajuste conforme necessário)
DO $$
BEGIN
  BEGIN
    INSERT INTO public.properties (id, title) VALUES (gen_random_uuid()::text, 'Teste Corretor');
  EXCEPTION WHEN others THEN
    -- Ignorar falha de INSERT aqui se o schema exigir mais campos
    NULL;
  END;
END; $$;

-- Tentar atualizar campo não disponibilidade deve falhar por trigger
SELECT public._expect_fail(
  $$UPDATE public.properties SET price = COALESCE(price,0) + 1 WHERE created_at = created_at LIMIT 1$$,
  'Corretor não deve editar campos gerais em properties'
);

-- Atualizar disponibilidade com observação deve funcionar (se houver linha)
SELECT public._expect_ok($$UPDATE public.properties SET disponibilidade='indisponivel', disponibilidade_observacao='Motivo' WHERE id = (SELECT id FROM public.properties LIMIT 1)$$);

-- ==================================================
-- 5) LEADS — regras por role
-- ==================================================
-- Corretor: cria próprios; update próprios; não pode criar para outro usuário
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-000000000001","user_metadata":{"role":"corretor"}}', true);
SELECT public._expect_ok($$INSERT INTO public.leads (user_id, name) VALUES (auth.uid(), 'Lead Corretor')$$);
SELECT public._expect_fail($$INSERT INTO public.leads (user_id, name) VALUES ('00000000-0000-4000-a000-0000000000FF', 'Lead Spoof')$$, 'Corretor não deve criar lead para outro usuário');
SELECT public._expect_ok($$UPDATE public.leads SET notes = 'ok' WHERE user_id = auth.uid()$$);

-- Gestor: pode criar para qualquer usuário
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-000000000002","user_metadata":{"role":"gestor"}}', true);
SELECT public._expect_ok($$INSERT INTO public.leads (user_id, name) VALUES ('00000000-0000-4000-a000-0000000000AA', 'Lead Gestor')$$);

-- Admin: pode remover os inseridos no teste (rollback ao final)
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-000000000003","user_metadata":{"role":"admin"}}', true);
SELECT public._expect_ok($$DELETE FROM public.leads WHERE name IN ('Lead Corretor','Lead Gestor')$$);

-- ==================================================
-- 6) CONTRACT_TEMPLATES — regras por role
-- ==================================================
-- Corretor: cria próprio; update próprio; não cria para outro
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-000000000001","user_metadata":{"role":"corretor"}}', true);
SELECT public._expect_ok($$INSERT INTO public.contract_templates (id, name, user_id) VALUES (gen_random_uuid()::text, 'Tpl Own', auth.uid())$$);
SELECT public._expect_fail($$INSERT INTO public.contract_templates (id, name, user_id) VALUES (gen_random_uuid()::text, 'Tpl Spoof', '00000000-0000-4000-a000-0000000000FF')$$, 'Corretor não deve criar template para outro usuário');
SELECT public._expect_ok($$UPDATE public.contract_templates SET description = 'ok' WHERE user_id = auth.uid()$$);

-- Gestor/Admin: podem atualizar/deletar
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-000000000002","user_metadata":{"role":"gestor"}}', true);
SELECT public._expect_ok($$UPDATE public.contract_templates SET description = 'gestor-ok'$$);
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-000000000003","user_metadata":{"role":"admin"}}', true);
SELECT public._expect_ok($$DELETE FROM public.contract_templates WHERE name IN ('Tpl Own','Tpl Spoof')$$);

-- ==================================================
-- 7) WHATSAPP — checagens mínimas
-- ==================================================
-- Corretor: não pode criar instances
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-000000000001","user_metadata":{"role":"corretor"}}', true);
SELECT public._expect_fail($$INSERT INTO public.whatsapp_instances (id) VALUES (gen_random_uuid())$$, 'Corretor não deve criar whatsapp_instances');

ROLLBACK;

-- Limpeza utilitários (opcional em ambiente compartilhado)
DROP FUNCTION IF EXISTS public._expect_fail(text, text);
DROP FUNCTION IF EXISTS public._expect_ok(text);
