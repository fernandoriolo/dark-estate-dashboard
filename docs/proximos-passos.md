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

## P2 — Verificação RLS automatizada
- Ampliar `verify_access_levels.sql` com asserts e cenários de falha esperada para:
  - corretor: só vê/edita próprios (`user_id = auth.uid()`).
  - gestor/admin: leitura por `company_id` + writes respeitando `WITH CHECK`.
- Integrar execução desse SQL no CI como gate de merge.

## P3 — Regenerar tipos do Supabase (frontend)
- Rodar geração e commitar `src/integrations/supabase/types.ts` pós-migrations.
- Revisar impactos em hooks e componentes.

## P4 — Endpoint seguro de listagem de usuários por empresa
- Confirmar RPC `list_company_users` (SECURITY DEFINER) criado.
- Ajustar `UserManagementView`/`PermissionsManagementView` para consumir o RPC, removendo workarounds client-side.

## P5 — Storage `contract-templates`: garantir ownership na criação
- Manter policies endurecidas já criadas.
- Garantir, no upload, vínculo consistente de ownership:
  - Preferência: criar/atualizar registro em `contract_templates` imediatamente após upload com `user_id`/`company_id` corretos (fonte de verdade para policies que fazem join por `file_path`).
  - Opcional (se necessário): padronizar `file_path` com prefixo de `company_id/user_id/`.

## P6 — Frontend (validações e telas “gestor”)
- Validar `AccessLevelDebug`/`IsolationDebug` e todas as telas onde gestor/admin precisam “ver todos”.
- Ajustar queries com filtros e paginação conforme índices.

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
