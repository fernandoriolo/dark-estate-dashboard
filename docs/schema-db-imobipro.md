# Schema do Banco ImobiPRO — Guia Didático

Este documento explica de forma didática como funciona o banco de dados do sistema ImobiPRO, suas tabelas, relacionamentos e regras de negócio. É destinado tanto para desenvolvedores quanto para usuários que precisam entender a estrutura de dados.

## 📋 Visão Geral

O ImobiPRO é um sistema de gestão imobiliária com **arquitetura multi-tenant** (várias empresas no mesmo banco) e **controle rigoroso de acesso** por hierarquia de usuários.

### Conceitos Fundamentais
- **Multi-tenant**: Cada empresa tem seus dados isolados via `company_id`
- **Row Level Security (RLS)**: Cada linha da tabela tem regras específicas de acesso
- **Hierarquia de usuários**: Admin > Gestor > Corretor (cada um vê e faz coisas diferentes)

---

## 🏢 Estrutura Principal

### 1. **companies** — Empresas/Imobiliárias
**O que é**: Cadastro das empresas imobiliárias que usam o sistema.

**Campos principais**:
- `id` (uuid): Identificador único da empresa
- `name`: Nome da imobiliária
- `cnpj`: CNPJ da empresa
- `plan`: Plano contratado ('basico', 'profissional', 'enterprise')
- `max_users`: Limite de usuários por plano
- `is_active`: Se a empresa está ativa
- `owner_user_id`: ID do usuário proprietário/responsável

**Quem pode acessar**:
- **Usuários da própria empresa**: podem ver dados da sua empresa
- **Admins**: podem ver/gerenciar qualquer empresa

---

### 2. **user_profiles** — Perfis dos Usuários
**O que é**: Informações dos usuários do sistema (corretores, gestores, admins).

**Campos principais**:
- `id` (uuid): Mesmo ID do usuário autenticado no Supabase
- `email`: Email de login
- `full_name`: Nome completo
- `role`: Papel no sistema ('corretor', 'gestor', 'admin')
- `company_id`: A qual empresa pertence
- `phone`: Telefone de contato
- `is_active`: Se o usuário está ativo

**Relacionamentos**:
- Pertence a uma `companies` (via `company_id`)
- É referenciado por quase todas as outras tabelas (via `user_id`)

**Quem pode acessar**:
- **Cada usuário**: pode ver/editar apenas seu próprio perfil
- **Gestores**: podem ver perfis dos usuários da mesma empresa

---

### 3. **imoveisvivareal** — Sistema Principal de Imóveis (TABELA ATIVA)
**O que é**: Tabela ÚNICA e FUNCIONAL para todos os imóveis do sistema, sejam importados de portais (VivaReal, ZAP) ou cadastrados manualmente.

**Campos principais**:
- `id` (serial): Identificador único sequencial
- `listing_id`: ID original do portal (se importado)
- `tipo_categoria`: Categoria do imóvel
- `tipo_imovel`: Tipo específico (apartamento, casa, etc.)
- `descricao`: Descrição detalhada
- `preco`: Preço do imóvel
- `tamanho_m2`: Área em m²
- `quartos`, `banheiros`: Quartos e banheiros
- `cidade`, `bairro`, `endereco`: Localização completa
- `imagens[]`: **Array com URLs das fotos** (armazena as imagens diretamente)
- `features[]`: Array de características (piscina, garagem, etc.)
- `user_id`: Corretor responsável
- `company_id`: Empresa proprietária

**Relacionamentos**:
- Pertence a um `user_profiles` (corretor responsável)
- Pertence a uma `companies`
- **Não usa tabela separada para imagens** - armazena no campo `imagens[]`
- Pode ter vários `leads` interessados

**Quem pode acessar**:
- **Admin/Gestor**: podem ver/editar todos os imóveis da empresa
- **Corretor**: pode ver todos, mas só editar disponibilidade dos seus

---

### 4. **properties** e **property_images** — Tabelas Legado (NÃO UTILIZADAS)
**O que são**: Tabelas originais para imóveis e fotos, **mantidas apenas para compatibilidade**.

**Status atual**: 
- **NÃO estão sendo usadas** no sistema funcional
- Todos os imóveis são gerenciados via `imoveisvivareal`
- Mantidas no banco para evitar quebra de referências
- **Não devem ser usadas** para novos desenvolvimentos

---

### 5. **leads** — Clientes Interessados
**O que é**: Pessoas interessadas em imóveis (clientes em potencial).

**Campos principais**:
- `id` (uuid): Identificador único do lead
- `name`: Nome do cliente
- `email`, `phone`: Contatos
- `property_id`: Imóvel de interesse (referencia `imoveisvivareal`)
- `source`: De onde veio ('site', 'whatsapp', 'indicação')
- `stage`: Estágio no funil ('Novo Lead', 'Visita Agendada', etc.)
- `message`: Mensagem inicial
- `user_id`: Corretor responsável
- `company_id`: Empresa

**Relacionamentos**:
- Pertence a um `imoveisvivareal` (imóvel de interesse)
- Pertence a um `user_profiles` (corretor responsável)
- Pode gerar `contracts` (se fechar negócio)
- Gera `imobipro_messages` (conversas)

**Quem pode acessar**:
- **Admin/Gestor**: podem ver/gerenciar todos os leads da empresa
- **Corretor**: pode ver/gerenciar apenas os leads atribuídos a ele

---

### 6. **contracts** — Contratos de Locação/Venda
**O que é**: Contratos formalizados entre cliente e proprietário.

**Campos principais**:
- `id` (text): Número único do contrato
- `numero`: Número sequencial
- `tipo`: Tipo de contrato ('Locacao' ou 'Venda')
- `status`: Status atual ('ativo', 'finalizado', etc.)
- `property_id`: Imóvel contratado (referencia `imoveisvivareal`)
- `template_id`: Template usado
- `client_*`: Dados do cliente (nome, cpf, etc.)
- `landlord_*`: Dados do proprietário
- `valor_*`: Valores financeiros
- `user_id`: Corretor responsável
- `company_id`: Empresa

**Relacionamentos**:
- Baseado em um `imoveisvivareal`
- Usa um `contract_templates`
- Criado por um `user_profiles`

**Quem pode acessar**:
- **Admin/Gestor**: podem ver/gerenciar todos os contratos da empresa
- **Corretor**: pode ver/gerenciar apenas os contratos que criou

---

### 7. **contract_templates** — Modelos de Contrato
**O que é**: Templates/modelos prontos para gerar contratos.

**Campos principais**:
- `id` (text): Identificador do template
- `name`: Nome do modelo
- `template_type`: Tipo ('Locacao' ou 'Venda')
- `file_name`, `file_path`: Arquivo do template
- `user_id`: Quem criou
- `is_active`: Se está ativo

**Relacionamentos**:
- Criado por um `user_profiles`
- Usado para gerar `contracts`

**Quem pode acessar**:
- **Leitura/criação**: qualquer usuário autenticado
- **Edição/exclusão**: apenas admin/gestor ou quem criou

---

## 💬 Sistema de Comunicação

### 8. **imobipro_messages** — Sistema Principal de Mensagens
**O que é**: Sistema central de mensagens do WhatsApp integrado ao CRM.

**Campos principais**:
- `id` (uuid): ID único da mensagem
- `instancia`: Instância WhatsApp origem
- `chat_id`: ID do chat/conversa
- `lead_id`: Lead relacionado (se aplicável)
- `message_type`: Tipo da mensagem (text, image, etc.)
- `content`: Conteúdo da mensagem
- `from_me`: Se foi enviada pelo corretor (true/false)
- `timestamp`: Quando foi enviada

**Relacionamentos**:
- Conecta com `leads` (via `lead_id`)
- Conecta com `whatsapp_instances` (via `instancia`)

**Quem pode acessar**:
- **Admin**: acesso total
- **Gestor**: pode ver/gerenciar mensagens da empresa
- **Corretor**: acesso baseado em instância:
  - Instância 'sdr': todos podem acessar
  - Outras instâncias: apenas se vinculada à sua empresa

### 9. **whatsapp_instances** — Configuração das Instâncias WhatsApp
**O que é**: Configurações de cada "número" WhatsApp conectado ao sistema.

**Campos principais**:
- `id` (uuid): ID único da instância
- `instance_name`: Nome da instância (único)
- `phone_number`: Número do WhatsApp
- `profile_name`: Nome do perfil
- `status`: Status da conexão
- `user_id`: Usuário responsável
- `company_id`: Empresa proprietária

**Relacionamentos**:
- Pertence a um `user_profiles`
- Pertence a uma `companies`
- Controla acesso às `imobipro_messages`

**Quem pode acessar**:
- **Admin**: pode gerenciar qualquer instância
- **Gestor**: pode gerenciar instâncias da sua empresa
- **Corretor**: pode gerenciar apenas suas próprias instâncias

### 10. **whatsapp_chats** e **whatsapp_messages** — Sistema Legado
**O que é**: Sistema anterior de mensagens, mantido para compatibilidade.

**Status atual**: 
- Tabelas mantidas no banco mas não são mais usadas ativamente
- Sistema migrou para `imobipro_messages`
- Ainda referenciadas nas políticas RLS para controle

---

## 🔐 Sistema de Permissões

### 11. **role_permissions** — Controle Granular de Acesso
**O que é**: Define quais funcionalidades cada tipo de usuário pode acessar.

**Campos principais**:
- `id` (uuid): ID único da permissão
- `role`: Tipo de usuário ('corretor', 'gestor', 'admin')
- `permission_key`: Chave da permissão (ex: 'menu_leads')
- `permission_name`: Nome amigável
- `category`: Categoria (ex: 'Menu', 'Ação')
- `is_enabled`: Se está habilitada

**Como funciona**:
- Cada funcionalidade do sistema tem uma `permission_key`
- Para cada `role`, define-se se tem ou não acesso (`is_enabled`)
- Sistema consulta esta tabela antes de mostrar menus/botões

**Quem pode acessar**:
- **Admin**: pode alterar qualquer permissão
- **Gestor**: pode ver permissões de corretor (para configurar)
- **Corretor**: pode apenas ver suas próprias permissões

---

## 🔗 Como as Tabelas se Relacionam

```mermaid
erDiagram
    companies ||--o{ user_profiles : "company_id"
    companies ||--o{ imoveisvivareal : "company_id"
    companies ||--o{ leads : "company_id"
    companies ||--o{ whatsapp_instances : "company_id"
    
    user_profiles ||--o{ imoveisvivareal : "user_id (responsável)"
    user_profiles ||--o{ leads : "user_id (responsável)"
    user_profiles ||--o{ contracts : "user_id (criador)"
    user_profiles ||--o{ whatsapp_instances : "user_id (dono)"
    
    imoveisvivareal ||--o{ leads : "property_id (interesse)"
    imoveisvivareal ||--o{ contracts : "property_id (contratado)"
    
    leads ||--o{ imobipro_messages : "lead_id (conversa)"
    leads ||--o{ contracts : "lead → contrato"
    
    contract_templates ||--o{ contracts : "template_id"
    
    whatsapp_instances ||--o{ imobipro_messages : "instancia (controle)"
    
    properties : "LEGADO - NÃO USADO"
    property_images : "LEGADO - NÃO USADO"
```

## 🛡️ Regras de Segurança (RLS)

### Princípios Gerais
1. **Isolamento por empresa**: Cada empresa vê apenas seus dados
2. **Hierarquia de acesso**: Admin > Gestor > Corretor
3. **Propriedade individual**: Corretores veem principalmente o que é "deles"

### Por Tipo de Usuário

**🔴 Admin**
- Acesso global a tudo
- Pode gerenciar qualquer empresa
- Invisível para outros usuários
- Gerencia permissões de gestor e corretor

**🟡 Gestor** 
- Vê todos os dados da própria empresa
- Pode gerenciar corretores da empresa
- Configura permissões dos corretores
- Pode reatribuir leads/imóveis entre corretores

**🟢 Corretor**
- Vê apenas dados atribuídos a ele
- Pode ver todos os imóveis mas só editar disponibilidade
- Acessa conversas apenas dos seus leads
- Pode criar leads e contratos

---

## 📝 Observações Importantes

### ⚠️ ATENÇÃO: Tabela Funcional vs Legado
- **USAR**: `imoveisvivareal` para TODOS os imóveis (importados ou manuais)
- **NÃO USAR**: `properties` e `property_images` (apenas legado)
- **Imagens**: Armazenadas no array `imagens[]` da tabela `imoveisvivareal`

### Triggers Automáticos
- Quando um registro é inserido, `user_id` e `company_id` são preenchidos automaticamente
- Sistema impede "falsificar" empresa (spoof de `company_id`)

### Funções de Segurança
- `get_current_role()`: Retorna o papel do usuário atual
- `get_user_company_id()`: Retorna a empresa do usuário atual
- `_admin_global()`: Verifica se é admin global

### Manutenção
- Este documento deve ser atualizado a cada migration no Supabase
- Mudanças no RLS devem refletir aqui
- Novos campos/tabelas devem ser documentados

---

**Última atualização**: 24/08/2025 - Corrigido: `imoveisvivareal` como tabela única funcional para imóveis
**Próxima revisão**: A cada migration ou mudança estrutural significativa