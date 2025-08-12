# Hierarquia de Usuários — Matriz de Permissões (RLS)

Este documento descreve, de forma didática, como as políticas RLS aplicam a hierarquia de acesso por `role` e `company_id` nas tabelas do domínio. O objetivo é preservar o MVP e garantir isolamento multi-tenant.

## Papéis
- corretor: vê e gerencia apenas seus próprios registros (`user_id = auth.uid()`).
- gestor: vê todos os registros da sua empresa (`company_id = get_user_company_id()`); pode gerenciar conforme a tabela.
- admin: equivalente ao gestor, com poder de gestão ampliado e acesso ao gerenciamento de permissões.

## Regras por tabela (resumo)

- `user_profiles`
  - SELECT/UPDATE: somente o próprio registro (`id = auth.uid()`).

- `companies`
  - SELECT: usuário vê a empresa à qual pertence (`company_id = get_user_company_id()`).

- `properties`
  - corretor: SELECT/ALL sobre os próprios (`user_id = auth.uid()`), sempre com `WITH CHECK company_id = get_user_company_id()`.
  - gestor/admin: SELECT/ALL para registros com `company_id = get_user_company_id()`.

- `property_images`
  - Escopo herdado de `properties.property_id` e `properties.company_id`.
  - Mutações apenas quando o usuário é dono do imóvel ou gestor/admin da empresa.

- `leads`
  - corretor: SELECT/ALL sobre os próprios (`user_id = auth.uid()`), `WITH CHECK company_id`.
  - gestor/admin: SELECT/ALL por `company_id`.

- `contract_templates`
  - Leitura e mutação restritas à `company_id` do usuário; corretor gerencia os próprios, gestor/admin gerenciam todos na empresa.

- `contracts`
  - corretor: SELECT/ALL sobre os próprios, `WITH CHECK company_id`.
  - gestor/admin: SELECT/ALL por `company_id`.

- `whatsapp_instances`
  - corretor: SELECT/ALL das próprias instâncias.
  - gestor/admin: SELECT/ALL por `company_id`.

- `whatsapp_chats` e `whatsapp_messages`
  - corretor: SELECT/ALL dos próprios (`user_id = auth.uid()`).
  - gestor/admin: SELECT/ALL por `company_id` via associação com `whatsapp_instances.company_id`.

## Observações
- Triggers BEFORE INSERT definem automaticamente `user_id` e `company_id` quando nulos.
- Todas as políticas de escrita aplicam `WITH CHECK (company_id = get_user_company_id())` para impedir spoof de empresa.
- Evita-se recursão nas policies consultando `get_user_role()`/`get_user_company_id()` (SECURITY DEFINER) somente em tabelas diferentes de `user_profiles`.

Última atualização: sincronizada com a migration de RLS consolidada.

