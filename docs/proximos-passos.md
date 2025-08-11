# Próximos passos — pendências priorizadas

## P1 — Backfill de dados legados (tenant columns)
- Criar e aplicar migration para preencher `company_id` (e onde aplicável reforçar `user_id`) em registros antigos de:
  - `properties`, `leads`, `contracts`, `contract_templates`, `whatsapp_instances`, `imoveisvivareal`.
- Estratégia:
  - `company_id` ← via join em `user_profiles.company_id` pelo `user_id` da linha.
  - Quando houver `property_id`, preferir `company_id` herdado de `properties` (se existir), senão `user_profiles`.
- Status atual: aplicado com sucesso em todas as tabelas citadas.
  - `imoveisvivareal`: os 124 registros sem `user_id` receberam `company_id` padrão `f07e1247-b654-4902-939e-dba0f6d0f5a3` (ImobiPro - Empresa Demo).
- Pós-ação: validar contagens e amostras por empresa/usuário; reexecutar smoke tests de RLS.

## P2 — Verificação RLS automatizada (concluído)
- `verify_access_levels.sql` criado com asserts por role (inclui disponibilidade). Integrado no CI como gate de merge.

## P3 — Regenerar tipos do Supabase (frontend) (concluído)
- Tipos gerados via token e `--project-id`. Arquivo atualizado: `src/integrations/supabase/types.ts`.

## P4 — Endpoint seguro de listagem de usuários (concluído)
- `UserManagementView` integrado ao RPC `list_company_users`. Estados unificados e filtros por role/texto.

## P5 — Storage `contract-templates` (concluído)
- Upload agora salva em `contract-templates/{userId}/...` e cria linha em `contract_templates` com `user_id`/`created_by`.

## P6 — Frontend (validações e telas “gestor”) (concluído)
- Disponibilidade implementada; filtros/badges aplicados; smoke tests compilaram (lint/build OK).

## P7 — Produção/ambiente
- Garantir `VITE_ENABLE_ANON_LOGIN=false` em produção (arquivo `.env.production` criado/atualizado). Revisar CORS/Supabase.

## P8 — CI/CD mínimo
- Ativar Branch Protection exigindo os jobs: `rls-verify`, `lint-build`, `semgrep`, `types-gen-check`, `require-all`.

## P9 — Performance
- Rodar `EXPLAIN` nas consultas críticas sob RLS para confirmar uso de índices. Ajustar se necessário.

## P10 — Documentos vivos
- Atualizar `@docs/hierarquia-usuarios.md` caso haja novas mudanças; manter progresso sincronizado.

## P7 — Produção/ambiente
- Garantir `VITE_ENABLE_ANON_LOGIN=false` em produção (Hostinger).
- Verificar variáveis `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` e CORS no projeto Supabase.

## P8 — CI/CD mínimo
- Pipeline: `pnpm lint` → testes (incl. `verify_access_levels.sql`) → `semgrep` → `pnpm build` → deploy Hostinger (SFTP `dist/`) → `supabase functions deploy` (se houver).
- SPA fallback `.htaccess` no Hostinger.

## P9 — Performance
- Rodar `EXPLAIN` nas consultas críticas sob RLS para confirmar uso de índices.
- Ajustar índices/coberturas se necessário.

## P10 — Documentos vivos
- Atualizar `@docs/progress_log.md`, `@docs/hierarquia-usuarios.md` e `@docs/events.md` após cada etapa relevante.
