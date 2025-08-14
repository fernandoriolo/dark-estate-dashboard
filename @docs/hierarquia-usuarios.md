# Hierarquia de Usuários e Permissões (Resumo)

## Papéis
- admin: acesso global. Pode gerenciar qualquer usuário e empresa.
- gestor: acesso à própria empresa. Pode listar usuários da empresa, atualizar hierarquia apenas para corretores e desativar usuários da empresa.
- corretor: acesso somente ao próprio perfil.

## Tabela `user_profiles`
- SELECT:
  - admin/gestor: usuários da própria empresa (via `list_company_users`).
  - corretor: apenas o próprio registro.
- UPDATE role:
  - admin: qualquer usuário (`changeUserRole`).
  - gestor: apenas via RPC `update_user_role_in_company(target_user_id, new_role)`, limitado a definir `corretor` e apenas na mesma empresa.
  - corretor: não permitido.
- UPDATE is_active (desativar):
  - admin: qualquer usuário (`deactivateUser`).
  - gestor: via RPC `deactivate_user_in_company(target_user_id)` na mesma empresa.
  - corretor: não permitido.

## Observações
- Ao criar usuário via módulo, o `company_id` do novo perfil é vinculado ao `company_id` do criador.
- Senha padrão configurável via `VITE_DEFAULT_NEW_USER_PASSWORD` (fallback `Imobi@1234`). Recomenda-se forçar troca no primeiro acesso.


