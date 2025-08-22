# Módulo Chats Otimizado

## Visão Geral

O módulo Chats foi completamente refatorado para implementar carregamento seletivo por níveis: **Instâncias → Conversas → Mensagens**. Esta nova arquitetura garante performance otimizada mesmo com milhares de mensagens, mantendo RLS rigoroso e experiência de usuário fluida.

## Arquitetura

### 🏗️ Estrutura 3 Colunas

```
┌─────────────────┬─────────────────┬─────────────────┐
│   Instâncias    │    Conversas    │    Mensagens    │
│   (Corretores)  │   (session_id)  │   (Conteúdo)    │
├─────────────────┼─────────────────┼─────────────────┤
│ • SDR           │ • Cliente A     │ • Mensagem 1    │
│ • Corretor 1    │ • Cliente B     │ • Mensagem 2    │
│ • Corretor 2    │ • Cliente C     │ • ...           │
│ • ...           │ • ...           │                 │
└─────────────────┴─────────────────┴─────────────────┘
```

### 🔄 Carregamento Seletivo

1. **Nível 1**: Carregar apenas instâncias visíveis ao usuário
2. **Nível 2**: Carregar conversas apenas da instância clicada
3. **Nível 3**: Carregar mensagens apenas da conversa clicada

## Performance

### 📊 Otimizações Implementadas

- **Keyset Pagination**: Evita OFFSET alto para datasets grandes
- **Índices Específicos**: Compostos para queries mais eficientes
- **Views Materializadas**: Agregações pré-computadas
- **Realtime Seletivo**: Subscription apenas para sessão ativa
- **Infinite Scroll**: Carregamento sob demanda

### 🚀 Benchmarks Esperados

| Operação | Volume | Tempo Esperado |
|----------|---------|----------------|
| Listar Instâncias | < 100 | < 500ms |
| Carregar Conversas | < 1000 | < 1s |
| Carregar Mensagens | < 10000 | < 800ms |
| Enviar Mensagem | N/A | < 300ms |

## Segurança (RLS)

### 🛡️ Políticas por Role

#### Corretor
- **Leitura**: Apenas mensagens de suas próprias instâncias + SDR
- **Escrita**: Apenas em suas próprias instâncias
- **Instâncias**: Apenas as que possui acesso

#### Gestor
- **Leitura**: Todas as mensagens da empresa
- **Escrita**: Pode modificar mensagens da empresa
- **Instâncias**: Todas da empresa

#### Admin
- **Leitura**: Acesso global
- **Escrita**: Acesso global
- **Instâncias**: Todas as instâncias

### 🔐 Implementação RLS

```sql
-- Exemplo de policy para leitura
CREATE POLICY "imsg_select_by_access_rules" 
  ON imobipro_messages 
  FOR SELECT
  TO authenticated
  USING (user_has_access_to_instance(instancia));
```

## Estrutura de Arquivos

```
src/
├── components/
│   ├── ChatsViewOptimized.tsx          # Componente principal
│   ├── ConversasListOptimized.tsx      # Lista de conversas com infinite scroll
│   ├── MensagensAreaOptimized.tsx      # Área de mensagens com realtime
│   └── test/
│       ├── ChatsPerformanceTest.tsx    # Testes de performance
│       └── ImobiproChatsTest.tsx       # Testes existentes
├── hooks/
│   ├── useOptimizedChats.ts           # Hook principal otimizado
│   └── useImobiproChats.ts            # Hook original (mantido)
├── services/
│   └── imobiproQueries.ts             # Queries SQL otimizadas
├── types/
│   └── imobiproChats.ts               # Interfaces TypeScript
└── docs/modulos/
    └── modulo-chats-otimizado.md      # Esta documentação
```

## API Reference

### Hooks

#### `useOptimizedChats()`

Hook principal para gerenciar estado do módulo Chats otimizado.

```typescript
const {
  // Estados
  loading, instanciasLoading, conversasLoading, mensagensLoading,
  error,
  instancias, conversas, mensagens,
  selectedInstancia, selectedSession, searchTerm,
  conversasHasMore, mensagensHasMore,
  
  // Ações
  setSelectedInstancia, setSelectedSession, setSearchTerm,
  loadMoreConversas, loadMoreMensagens, loadOlderMensagens,
  sendMessage, refreshData, cleanup
} = useOptimizedChats();
```

### Componentes

#### `ChatsViewOptimized`
Componente principal com arquitetura 3 colunas.

**Props**: Nenhuma (usa hooks internos)

#### `ConversasListOptimized`
Lista de conversas com infinite scroll.

```typescript
interface ConversasListOptimizedProps {
  conversas: ConversaSessionInfo[];
  selectedSession: string | null;
  onSelectSession: (sessionId: string) => void;
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  instanciaName?: string;
}
```

#### `MensagensAreaOptimized`
Área de mensagens com realtime e infinite scroll.

```typescript
interface MensagensAreaOptimizedProps {
  mensagens: MensagemInfo[];
  selectedSession: string | null;
  conversaInfo: ConversaSessionInfo | null;
  onSendMessage: (content: string) => Promise<boolean>;
  loading: boolean;
  hasMore: boolean;
  onLoadMoreMensagens: () => void;
  onLoadOlderMensagens: () => void;
  canSendMessage: boolean;
  userRole?: string;
  userName?: string;
}
```

### Queries SQL

#### `buscarInstanciasCorretores(params)`
Busca instâncias com contagem de conversas.

```typescript
interface BuscarInstanciasParams {
  userRole: 'admin' | 'gestor' | 'corretor';
  userId?: string;
  companyId?: string;
}
```

#### `buscarConversasPorInstancia(params)`
Busca conversas com keyset pagination.

```typescript
interface BuscarConversasParams {
  instancia: string;
  searchTerm?: string;
  limit?: number;
  cursorTime?: string; // Para keyset pagination
  cursorSession?: string;
}
```

#### `buscarMensagensDaSessao(params)`
Busca mensagens com keyset pagination.

```typescript
interface BuscarMensagensParams {
  sessionId: string;
  limit?: number;
  cursorData?: string; // Para keyset pagination
  cursorId?: number;
  ascending?: boolean;
}
```

## Banco de Dados

### 📋 Migrações

#### `20250822100000_optimize_chats_module.sql`
- Índices compostos para performance
- Views agregadas (`v_conversas_por_instancia`, `v_instancias_com_conversas`)
- Funções SQL para keyset pagination
- Otimizações de consulta

#### `20250822101000_chats_rls_policies.sql`
- Políticas RLS por role
- Função auxiliar `user_has_access_to_instance()`
- Políticas para leads (contexto de chats)
- Função de testes `test_imsg_rls_policies()`

### 🗂️ Índices Criados

```sql
-- Performance principal
CREATE INDEX idx_imsg_instancia_session_data 
  ON imobipro_messages(instancia, session_id, data);

CREATE INDEX idx_imsg_session_data 
  ON imobipro_messages(session_id, data);

-- Busca textual
CREATE INDEX idx_imsg_content_gin 
  ON imobipro_messages USING gin ((message->>'content'));

-- Relacionamentos
CREATE INDEX idx_leads_corretor 
  ON leads(id_corretor_responsavel);

CREATE INDEX idx_leads_created_at 
  ON leads(created_at DESC);
```

### 📊 Views Otimizadas

#### `v_conversas_por_instancia`
Agrupa conversas por instância com preview da última mensagem.

```sql
SELECT 
  instancia,
  session_id,
  MAX(data) AS last_time,
  (ARRAY_AGG(message ORDER BY data DESC))[1] AS last_message,
  COUNT(*)::int AS total_mensagens,
  MIN(data) AS first_time
FROM imobipro_messages
GROUP BY instancia, session_id;
```

#### `v_instancias_com_conversas`
Lista instâncias com contagem total de conversas.

```sql
SELECT 
  instancia,
  COUNT(DISTINCT session_id) AS total_conversas,
  MAX(data) AS last_activity_time,
  MIN(data) AS first_activity_time
FROM imobipro_messages
GROUP BY instancia;
```

### ⚡ Funções SQL

#### `buscar_mensagens_keyset()`
Paginação keyset para mensagens evitando OFFSET.

```sql
buscar_mensagens_keyset(
  p_session_id TEXT,
  p_cursor_data TIMESTAMPTZ DEFAULT NULL,
  p_cursor_id INTEGER DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_ascending BOOLEAN DEFAULT TRUE
)
```

#### `buscar_conversas_keyset()`
Paginação keyset para conversas com busca opcional.

```sql
buscar_conversas_keyset(
  p_instancia TEXT,
  p_cursor_time TIMESTAMPTZ DEFAULT NULL,
  p_cursor_session TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_search_term TEXT DEFAULT NULL
)
```

## Realtime

### 📡 Subscription Otimizada

- **Escopo**: Apenas sessão ativa (`session_id` específico)
- **Canal**: `optimized_messages_${sessionId}`
- **Eventos**: INSERT, UPDATE, DELETE
- **Auto-cleanup**: Subscription anterior cancelada automaticamente

```typescript
// Exemplo de subscription
supabase
  .channel(`optimized_messages_${sessionId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'imobipro_messages',
    filter: `session_id=eq.${sessionId}`
  }, handleRealtime)
  .subscribe();
```

## Testes

### 🧪 Componente de Teste

Use `ChatsPerformanceTest.tsx` para validar:

- ✅ Migrações aplicadas
- ✅ RLS funcionando
- ✅ Performance de queries
- ✅ Eficiência de índices
- ✅ Volume de dados
- ✅ Conexão realtime

### 🎯 Métricas de Sucesso

| Teste | Critério de Sucesso |
|-------|-------------------|
| Migrações | Views e funções disponíveis |
| RLS | Acesso controlado por role |
| Performance Instâncias | < 1s para carregamento |
| Performance Índices | < 500ms para queries ordenadas |
| Volume de Dados | Contagem eficiente independente do volume |
| Realtime | Conexão em < 5s |

## Uso

### 🚀 Integração Básica

```typescript
import { ChatsViewOptimized } from '@/components/ChatsViewOptimized';

function App() {
  return <ChatsViewOptimized />;
}
```

### 🎛️ Configuração Avançada

```typescript
import { useOptimizedChats } from '@/hooks/useOptimizedChats';

function CustomChatComponent() {
  const {
    instancias,
    conversas,
    mensagens,
    setSelectedInstancia,
    loadMoreConversas,
    sendMessage
  } = useOptimizedChats();

  // Implementação customizada...
}
```

## Migração

### 📦 Da Versão Anterior

1. **Aplicar migrações SQL**:
   ```sql
   -- Aplicar 20250822100000_optimize_chats_module.sql
   -- Aplicar 20250822101000_chats_rls_policies.sql
   ```

2. **Atualizar imports**:
   ```typescript
   // Antes
   import { ChatsView } from '@/components/ChatsView';
   
   // Depois
   import { ChatsViewOptimized } from '@/components/ChatsViewOptimized';
   ```

3. **Testar performance**:
   ```typescript
   import { ChatsPerformanceTest } from '@/components/test/ChatsPerformanceTest';
   ```

### 🔄 Compatibilidade

- ✅ **Dados**: Totalmente compatível com tabela `imobipro_messages` existente
- ✅ **RLS**: Melhora as políticas existentes
- ✅ **APIs**: Mantém compatibilidade com endpoints existentes
- ✅ **Realtime**: Otimiza subscriptions existentes

## Troubleshooting

### 🐛 Problemas Comuns

#### Migrações não aplicadas
```sql
-- Verificar se as views existem
SELECT table_name FROM information_schema.views 
WHERE table_name IN ('v_conversas_por_instancia', 'v_instancias_com_conversas');
```

#### RLS bloqueando acesso
```sql
-- Verificar policies
SELECT policyname, tablename, roles 
FROM pg_policies 
WHERE tablename = 'imobipro_messages';
```

#### Performance lenta
```sql
-- Verificar índices
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename = 'imobipro_messages'
ORDER BY indexname;
```

#### Realtime não funcionando
```typescript
// Verificar status da conexão
const status = supabase.channel('test').status;
console.log('Supabase status:', status);
```

### 📞 Suporte

Para problemas específicos:
1. Execute `ChatsPerformanceTest` para diagnóstico
2. Verifique logs do navegador para erros JavaScript
3. Monitore queries SQL no Supabase Dashboard
4. Consulte documentação do Supabase Realtime

## Roadmap

### 🛣️ Próximas Funcionalidades

- [ ] **Busca Avançada**: Full-text search com ranking
- [ ] **Anexos**: Upload e visualização de arquivos
- [ ] **Mensagens Temporárias**: Auto-delete após período
- [ ] **Analytics**: Métricas de resposta e engajamento
- [ ] **Moderação**: Filtros automáticos de conteúdo
- [ ] **Exportação**: Backup de conversas em PDF

### 🔮 Melhorias Futuras

- [ ] **Compression**: Compactação de mensagens antigas
- [ ] **Sharding**: Particionamento por data ou empresa
- [ ] **Cache**: Redis para queries frequentes
- [ ] **CDN**: Distribuição global de anexos
- [ ] **ML**: Sugestões automáticas de resposta

---

**Versão**: 2.0.0 (Otimizada)  
**Data**: 2025-08-22  
**Autor**: Sistema de IA Claude  
**Status**: ✅ Produção