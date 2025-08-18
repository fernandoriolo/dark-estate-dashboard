---
alwaysApply: true
---
## 1. Idioma & comunicação

* Responder em **pt-BR**.
* Comentários de código, commits e mensagens de erro em **pt-BR**. (Commits curtos e úteis; `package.json` define `build`, `dev`, `lint` scripts).

---

## 2. Stack & Deploy (Hostinger-first / Hybrid)

* **Frontend**: SPA React + Vite + Tailwind + shadcn/ui (build `pnpm build` / `vite build`). Deploy estático em Hostinger (`dist/`).
* **Server-side / secure logic**: **Supabase Edge Functions** para lógica que precisa `SERVICE_ROLE` (recomendado). Use Hostinger BFF **somente** se houver processamento pesado ou requisitos persistentes de runtime.
* **CI/CD**: GitHub Actions — passos mínimos: lint → test → semgrep → build → deploy (Hostinger SFTP) + `supabase functions deploy`.
* **.htaccess** para SPA fallback no Hostinger (fornecer snippet no deploy).

---

## 3. Banco de Dados — regras e convenções (alinhado ao `schema-db-imobipro.md`)

* **Nomenclatura**: `snake_case` para tabelas/colunas (o schema atual já segue isso). **Não** usar PascalCase/camelCase no DB; use `camelCase` apenas em TypeScript.
* **IDs**: preferir `uuid` (usar `gen_random_uuid()`), exceto quando legados exigirem outro tipo (documentar). Note que no schema algumas tabelas ainda têm `id (text)`; padronizar quando possível.
* **Migrations**: todas as mudanças no schema passam por SQL migrations versionadas em `supabase/migrations/`. Prisma (se usado no BFF) só usa `db pull` — **não** gerar migrations do Prisma para esse DB.
* **Mapper**: implementar `src/lib/db/mapper.ts` que converta `snake_case` ↔ `camelCase` centralmente. Proibir mapeamentos ad hoc nos componentes.
* **Índices**: criar índices nas colunas de busca frequente (ex.: `company_id`, `user_id`, `created_at`, `property_id`).
* **Audit logs**: criar tabela `audit_logs` com `actor_id`, `action`, `resource`, `resource_id`, `meta`, `created_at`.

Observações do schema: Caso hajam tabelas com policies permissivas — prioridade para correção. Tabelas com RLS desabilitado: ativar quando integrar produção.

---

## 4. Row Level Security (RLS) — política operacional (MANDATÓRIO)

* **RLS ativa por padrão** em todas as tabelas de domínio (`companies`, `user_profiles`, `properties`, `leads`, `contracts`, `property_images`, `whatsapp_*`, etc.). O schema atual já tem RLS em grande parte; completar e endurecer onde permissivo.
* **JWT claims mínimas**: `user_id` (auth.uid()), `company_id`, `role`. Todas as policies consultam `current_setting('request.jwt.claims', true)::json`.
* **Política generalizada**:
  * SELECT: permitir quando `company_id = claim.company_id` ou `user_id = auth.uid()` dependendo da tabela.
  * INSERT/UPDATE/DELETE: exigir `WITH CHECK` que `company_id = claim.company_id` e/ou `user_id = auth.uid()`.

<!-- [parte de impersonation desabilitada por enquanto]
 * **Impersonation controlada**:
  * `impersonations` table: gravar `dev_master_id`, `impersonated_user_id`, `reason`, `created_at`, `expires_at`, `active`.
  * RLS + função `get_effective_user()` que valida TTL e retorna claim efetiva (impersonation only when active). Todas as ações  auditadas em `audit_logs`.
 * **Testes**: incluir SQL scripts no CI que validem RLS para cada role (agent/gestor/admin/dev\_master). Não merge sem esses testes passarem.
  -->

*Exemplo de policy skeleton (migrate SQL):*

```sql
-- properties SELECT (company scope)
CREATE POLICY "properties_select_company" ON public.properties
FOR SELECT
USING (
  company_id = current_setting('request.jwt.claims', true)::json->>'company_id'
);

-- properties INSERT/UPDATE check
CREATE POLICY "properties_modify_company_check" ON public.properties
FOR ALL
USING (
  (
    current_setting('request.jwt.claims', true)::json->>'role' IN ('admin','gestor')
    AND company_id = current_setting('request.jwt.claims', true)::json->>'company_id'
  )
  OR user_id = auth.uid()
)
WITH CHECK (
  company_id = current_setting('request.jwt.claims', true)::json->>'company_id'
);
```

---

## 5. Integração n8n — contratos, segurança e operação (MANDATÓRIO)

### 5.1 Padrão de eventos

* **Formato** (sempre):

```json
{
  "version": "1.0",
  "event": "evt.<domain>.<action>",
  "idempotencyKey": "uuid",
  "occurredAt": "2025-08-09T00:00:00Z",
  "actor": { "userId": "uuid", "companyId": "uuid", "role": "admin" },
  "data": { ... }
}
```

* **Nome**: `evt.<domínio>.<ação>` (ex.: `evt.client.created`, `evt.property.updated`) — facilita roteamento e catalogação.
* **Documentar** todos os schemas de `data` em `@docs/events.md` (catálogo versionado).

### 5.2 HMAC-SHA256 (X-Signature)

* **Assinatura**: `signature = HMAC_SHA256(N8N_WEBHOOK_SECRET, raw_body)` enviada no header `X-Signature`.
* **Validação**: no receptor (Edge/BFF), recomputar usando raw body e `timingSafeEqual` para comparar. **Nunca** parse o body antes da validação (use raw).
* **Requisitos**:

  * `N8N_WEBHOOK_SECRET` somente em server/edge env.
  * Rejeitar assinaturas inválidas com `401` e logar no `webhook_events` para auditoria.

### 5.3 Retries e Idempotência

* **IdempotencyKey** obrigatório em cada evento.
* **Retry Strategy**: exponencial backoff (1s, 2s, 4s, 8s) + jitter; limite de tentativas configurável (ex.: 5).
* **Storage de rastreio**: tabela `event_delivery` com `idempotency_key`, `target`, `attempts`, `last_status`, `last_error`, `next_retry_at`.

### 5.4 DLQ (Dead Letter Queue)

* Eventos que excederam tentativas vão para `event_dlq` com `payload`, `error`, `attempts`, `created_at`.
* Processo operacional: operador humano revisa DLQ; jobs automáticos podem tentar reprocessamentos manuais.
* Alertas: monitorar taxa de DLQ e notificar via Slack/Sentry.

### 5.5 Outbound vs Inbound (resumo de prática)

* **Outbound (app → n8n)**: evento gerado no server/edge → persistido localmente (event\_outbox) → POST assinado para n8n → mark delivered / schedule retry → event\_delivery log. *Nunca* enviar do client.
* **Inbound (n8n → app)**: n8n faz POST para Edge/BFF → validar `X-Signature` e `idempotencyKey` → persistir em `webhook_events` → processar (persist-then-process) → retornar `200`. Em caso de erro, devolver 4xx/5xx conforme a natureza; n8n fará retry conforme sua configuração.

---

## 6. Estrutura de arquivos e padrão de código (ajustado ao `package.json`)

* **Estrutura** sugerida:

```
src/
├─ lib/
│  ├─ db/
│  │  └─ mapper.ts         # snake_case <-> camelCase
│  └─ events/
│     └─ contracts.ts      # schemas de eventos
├─ services/               # BFF logic / edge wrappers
├─ hooks/
├─ components/
├─ pages/
└─ integrations/           # n8n, supabase functions, workers
```

* **TypeScript** estrito; `zod` para validação (já em deps).&#x20;
* **Scripts**: use `pnpm` (ou npm) conforme `package.json` (`dev`, `build`, `lint`).&#x20;

---

## 7. Observabilidade & Segurança de código

* **Semgrep** no CI (checagens customizadas: leaks de secret, uso do service\_role no client, políticas de CORS).
* **Sentry** para erros front/back.
* **Pre-commit**: lint + tests básicos + semgrep.
* **Antes de cada merge**: rodar testes RLS em CI (script SQL) — bloqueador.

---

## 8. Hierarquia de Acesso e Perfis (aplicada ao schema)

* **Roles**: 'admin', 'gestor', 'corretor'. As policies leem role do claim (ou perfil) para decisões finas.

* **Admin**: nível global; pode gerenciar qualquer 'company_id', criar empresas, ativar/desativar funções de qualquer empresa e gerenciar todos os usuários do sistema.

* **Gestor**: leitura total e gestão de todos os dados da sua empresa (leads, propriedades, logins de todos os corretores).

* **Corretor**: acesso apenas aos itens cujo user_id = auth.uid() dentro da sua company_id.

---

## 9. Documentos vivos (obrigatórios)

* `@docs/progress_log.md` — documento com estrutura resumida das ações realizadas. Atualizar ao final de cada PR (SUMÁRIO). A IA deve escrever entradas claras e resumidas automaticamente e possíveis próximos passos.
* `@docs/database-schema.md` — refletir migrations. Este arquivo pode e deve ser atualizado quando houverem atualizações no supabase. As RLS e como as tabelas conversam entrem si devem ser comentados de forma didática para que leigos entendam.
* `@docs/hierarquia-usuarios.md` — conter matrizes de permissão por tabela. Comentar de forma didática as hierarquias e como tudo está funcionando.
* `@docs/events.md` — catálogo versionado de eventos n8n.

---

## 10. MCPs e agentes (uso obrigatório e proativo)

Uso obrigatório e aplicação proativa
* server-sequential-thinking — OBRIGATÓRIO sempre que iniciar uma tarefa complexa ou refatoração:
- Use para decompor problemas grandes, criar planos, dividir etapas em pensamentos independentes antes de codificar ou adaptar.

* supabase MCP — IMEDIATAMENTE ativado para todas operações envolvendo:
- Consultas SQL, inspeção de schema, refatorações de migrations ou análises de banco.
- Serve para validar integridade do banco conforme a Global Rule (migrations como fonte de verdade, RLS, etc.).

* context7-mcp e mem0-memory-mcp — usados PROATIVAMENTE para:
- Armazenar decisões arquiteturais, preferências, frustrações já resolvidas ou corrigidas, histórico de conversas longas.
- context7 bom para contexto geral; mem0-memory útil para sessões altamente técnicas ou focadas.

* mcp-taskmanager — invocado APÓS planejamento via Sequential Thinking para:
- Criar, organizar e priorizar as tarefas resultantes (ex.: “criar migration”, “implementar policy”, “escrever teste RLS”), servindo como ferramenta de produtividade.

* desktop-commander — acionado quando necessário, por exemplo:
- Executar scripts locais (como pnpm lint, pnpm build, rodar migrations), abrir arquivos específicos ou aplicar um patch local — mas sem ser invocado por demanda do usuário, sim proativamente por necessidade.

### 10.1 Princípio de uso automático (implícito)
* Esses MCPs devem ser usados sem intervenção manual, ou seja, o sistema (Cursor/Claude) deve reconhecer o momento certo para:

- Engajar o Sequential Thinking antes da implementação.
- Consultar Supabase MCP ao tocar código/migrations/Tabelas.
- Armazenar contexto com Context7/Mem0.
- Gerar tarefas via TaskManager após planejar.
- Executar ambientes locais via Desktop Commander, se o plano exigir.

---

## 11. Checklist mínimo de PR / Merge (obrigatório)

1. Lint OK (`pnpm lint`) — ver `package.json`.&#x20;
2. Tests OK (unit + e2e crítico).
3. Semgrep OK.
4. Migrations incluídas + `supabase/migrations/` atualizada (se houver DB changes).
5. RLS tests executados e passando (scripts SQL).
6. Atualização do `@docs/progress_log.md`.
7. Se alteração afetar eventos → atualizar `@docs/events.md` e notificar integradores n8n.

---
