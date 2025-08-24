# Hierarquia de Usuários — Matriz de Permissões (RLS)

Este documento descreve, de forma didática, como as políticas RLS aplicam a hierarquia de acesso por `role` e `company_id` nas tabelas do domínio. O objetivo é preservar o MVP e garantir isolamento multi-tenant.

## Papéis
- **corretor**: vê e gerencia apenas seus próprios registros (`user_id = auth.uid()`).
- **gestor**: vê todos os registros da sua empresa; pode gerenciar conforme a tabela.
- **admin**: acesso global com poder de gestão ampliado e acesso ao gerenciamento de permissões.

## Regras por tabela (resumo)

### user_profiles
- **SELECT/UPDATE**: somente o próprio registro (`id = auth.uid()`).

### properties / imoveisvivareal
- **Admin/Gestor**: CRUD global
- **Corretor**: leitura de todos; pode adicionar; pode alterar disponibilidade (com observação); não pode editar/deletar

### property_images
- **Leitura**: para autenticados
- **Mutações**: por admin/gestor

### leads
- **Admin/Gestor**: leitura e CRUD de todos
- **Corretor**: leitura/criação/atualização dos próprios (`user_id = auth.uid()`), delete negado

### contract_templates (tabela)
- **Leitura/criação**: para todos autenticados
- **Update/delete**: por admin/gestor ou autor (`user_id`)

### role_permissions (Configuração de Permissões)
- **Admin**: acesso total (ALL) - pode gerenciar todas as permissões de gestor e corretor
- **Gestor**: apenas SELECT em permissões de corretor - pode visualizar para configurar
- **Corretor**: apenas SELECT das próprias permissões - visualização dos próprios acessos
- **Hierarquia**: Admin gerencia gestor+corretor; Gestor gerencia apenas corretor

### contracts
- **Admin/Gestor**: leitura e CRUD de todos
- **Corretor**: leitura/escopo próprio (a definir conforme evolução do módulo)

### imobipro_messages (Módulo CONVERSA)
- **Admin**: acesso total via policy `imobipro_messages_select_secure` e `imobipro_messages_delete_secure`
- **Gestor**: CRUD completo via `get_current_role()` em policies `*_manager`
- **Corretor**: acesso baseado em instância:
  - Instância `sdr`: acesso para todos autenticados (`auth.uid() IS NOT NULL`)
  - Outras instâncias: apenas se vinculada ao `company_id` via `whatsapp_instances`
  - INSERT/SELECT: permitido conforme regras de instância
  - UPDATE/DELETE: restrito a admin/gestor

### whatsapp_instances (Configuração de Instâncias)  
- **Admin**: acesso total via `_admin_global()`
- **Gestor**: pode gerenciar instâncias da mesma empresa via `is_manager()`
- **Corretor**: pode gerenciar apenas suas próprias instâncias (`user_id = auth.uid()`)
- **Função**: controla acesso às mensagens via `instance_name` e `company_id`

### whatsapp_chats / whatsapp_messages (Legado)
- **Status**: Tabelas mantidas para compatibilidade
- **Uso atual**: Sistema migrou para `imobipro_messages`
- **Referência**: Ainda referenciadas nas policies para controle de acesso

## Observações
- **Triggers BEFORE INSERT**: definem automaticamente `user_id` e `company_id` quando nulos.
- **Políticas WITH CHECK**: aplicam `WITH CHECK (company_id = get_user_company_id())` para impedir spoof de empresa.
- **Funções de segurança**: `get_user_role()`/`get_user_company_id()` (SECURITY DEFINER) evitam recursão de RLS.

## Hierarquia Visual

```
Admin (Global)
    ├── Acesso total ao sistema
    ├── Gerencia permissões de Gestor e Corretor (através do módulo "Configurar Permissões")
    └── Invisível para outros usuários
    
Gestor (Empresa)
    ├── Acesso completo à sua empresa
    ├── Gerencia permissões de Corretor (através do módulo "Configurar Permissões")
    └── Vê todos os dados da empresa
    
Corretor (Individual)  
    ├── Acesso apenas aos próprios registros
    ├── Pode alterar disponibilidade de propriedades
    └── Acesso ao módulo Conversa a apenas as conversas dos leads atribuidos a ele.
```

Última atualização: auditoria completa RLS via Supabase MCP em 24/08/2025 - verificação de 25 tabelas com RLS ativo e políticas específicas por role.