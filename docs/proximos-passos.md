Ajustar dados legados
Backfill de user_id/company_id nas tabelas (properties, leads, contracts, contract_templates, whatsapp_*) para registros antigos, usando user_profiles.company_id. Sem isso, RLS pode bloquear leituras/edições.
Verificação RLS
Rodar/estender verify_access_levels.sql com asserts para: corretor (vê só próprios), gestor/admin (vê por company_id), e writes com WITH CHECK falhando quando company_id não bate.
Smoke tests em AccessLevelDebug/IsolationDebug.
Perfomance/Índices
Garantir índices em company_id, user_id, created_at, property_id nas tabelas de domínio (se faltar, criar).
Users list (gestor/admin)
Hoje user_profiles só permite ver/editar o próprio. Se o MVP precisa listar usuários da empresa, criar um endpoint seguro (RPC SECURITY DEFINER ou view dedicada) para gestor/admin ler perfis por company_id sem recursão de RLS.
Storage
Revisar bucket contract-templates: manter leitura conforme caso de uso e restringir mutações a autenticados; opcionalmente amarrar ownership via metadados.
Frontend
Confirmar que telas que dependem de ver “todos” (ex.: gestor) continuam funcionais com as novas RLS.
Manter login anônimo somente em DEV via VITE_ENABLE_ANON_LOGIN=false em produção.
CI/CD
Adicionar etapa que roda SQL de verificação RLS no pipeline (bloqueia merge se falhar).
Rodar pnpm lint/build e um semgrep básico.