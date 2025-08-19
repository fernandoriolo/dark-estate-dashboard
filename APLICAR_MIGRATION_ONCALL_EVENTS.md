# 🔧 Instruções para Aplicar Migration da Tabela oncall_events

## ⚠️ PROBLEMA IDENTIFICADO
A tabela `oncall_events` não existe no banco de dados de produção, causando:
- Eventos não sendo persistidos após recarregamento da página
- Eventos não aparecendo no Dashboard "Próximos Compromissos"
- Erros 400 ao tentar acessar a tabela

## 📋 SOLUÇÃO

### 1. **Migration SQL já Criada**
O arquivo `supabase/migrations/20250818210000_create_oncall_events.sql` contém:
- Estrutura completa da tabela `oncall_events`
- Índices para performance
- RLS (Row Level Security) configurada
- Triggers para `updated_at`

### 2. **Como Aplicar a Migration**

#### **Opção A: Via Supabase Dashboard (RECOMENDADO)**
1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Navegue para seu projeto
3. Vá em **SQL Editor**
4. Execute o conteúdo completo do arquivo `20250818210000_create_oncall_events.sql`

#### **Opção B: Via CLI Supabase**
```bash
# Se tiver acesso ao banco local
supabase migration up

# Ou aplicar em produção (se configurado)
supabase db push
```

#### **Opção C: SQL Direto**
Execute este SQL no seu banco de produção:

```sql
-- Criar tabela oncall_events para armazenar eventos da agenda criados localmente
-- Complementa a tabela oncall_schedules que define horários de plantão

create table if not exists public.oncall_events (
  id text primary key default gen_random_uuid()::text,
  
  -- Informações básicas do evento
  title text not null,
  description text,
  
  -- Data e horário
  starts_at timestamp with time zone not null,
  ends_at timestamp with time zone,
  
  -- Participantes
  client_name text,
  client_phone text,
  client_email text,
  
  -- Propriedade relacionada
  property_id text references public.properties(id) on delete set null,
  property_title text,
  address text,
  
  -- Tipo e status
  type text default 'Visita' check (type in ('Visita', 'Avaliação', 'Apresentação', 'Vistoria', 'Reunião', 'Ligação', 'Outro')),
  status text default 'Aguardando confirmação' check (status in ('Confirmado', 'Aguardando confirmação', 'Cancelado', 'Talvez')),
  
  -- Integração externa
  google_event_id text unique, -- ID do evento no Google Calendar quando sincronizado
  webhook_source text, -- Origem: 'local' para eventos criados aqui, 'google' para sincronizados
  
  -- Auditoria e controle
  company_id text not null references public.companies(id) on delete cascade,
  user_id text not null references auth.users(id) on delete cascade,
  assigned_user_id text references public.user_profiles(id) on delete set null, -- Corretor responsável
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Índices para performance
create index if not exists idx_oncall_events_starts_at on public.oncall_events(starts_at);
create index if not exists idx_oncall_events_company_id on public.oncall_events(company_id);
create index if not exists idx_oncall_events_user_id on public.oncall_events(user_id);
create index if not exists idx_oncall_events_assigned_user_id on public.oncall_events(assigned_user_id);
create index if not exists idx_oncall_events_property_id on public.oncall_events(property_id);
create index if not exists idx_oncall_events_google_event_id on public.oncall_events(google_event_id);
create index if not exists idx_oncall_events_status on public.oncall_events(status);
create index if not exists idx_oncall_events_type on public.oncall_events(type);

-- Trigger para updated_at
create or replace function public.update_oncall_events_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_update_oncall_events_updated_at on public.oncall_events;
create trigger trg_update_oncall_events_updated_at
  before update on public.oncall_events
  for each row execute function public.update_oncall_events_updated_at();

-- RLS (Row Level Security)
alter table public.oncall_events enable row level security;

-- Policy para SELECT: usuário da mesma empresa pode ver eventos da empresa
drop policy if exists oncall_events_select on public.oncall_events;
create policy oncall_events_select on public.oncall_events
  for select using (
    exists (
      select 1 from public.user_profiles up 
      where up.id = auth.uid()::text
      and up.company_id = oncall_events.company_id
    )
  );

-- Policy para INSERT/UPDATE/DELETE: gestor/admin da empresa ou próprio usuário responsável
drop policy if exists oncall_events_modify on public.oncall_events;
create policy oncall_events_modify on public.oncall_events
  for all using (
    exists (
      select 1 from public.user_profiles up 
      where up.id = auth.uid()::text
      and up.company_id = oncall_events.company_id
      and (
        up.role in ('admin', 'gestor') 
        or up.id = oncall_events.user_id
        or up.id = oncall_events.assigned_user_id
      )
    )
  )
  with check (
    exists (
      select 1 from public.user_profiles up 
      where up.id = auth.uid()::text
      and up.company_id = oncall_events.company_id
    )
  );

select 'oncall_events criada com RLS e índices' as status, now() as at;
```

### 3. **Verificação**
Após aplicar a migration, você pode verificar se deu certo:

```sql
-- Verificar se a tabela existe
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'oncall_events';

-- Verificar estrutura
\d public.oncall_events

-- Testar inserção (opcional)
INSERT INTO public.oncall_events (
  title, starts_at, client_name, company_id, user_id
) VALUES (
  'Evento de Teste', 
  NOW() + INTERVAL '1 day', 
  'Cliente Teste', 
  'sua-company-id-aqui',
  'seu-user-id-aqui'
);
```

## ✅ **RESULTADO ESPERADO**

Após aplicar a migration:

1. ✅ Eventos criados no modal da agenda serão salvos na tabela `oncall_events`
2. ✅ Eventos persistirão após recarregar a página
3. ✅ Dashboard "Próximos Compromissos" mostrará os eventos
4. ✅ Não haverá mais erros 400 no console

## 🔄 **FALLBACK ATUAL**

Enquanto a tabela não for criada, o sistema:
- ✅ Detecta automaticamente que a tabela não existe
- ✅ Salva os eventos nas notas dos clientes como fallback
- ✅ Não quebra a funcionalidade do sistema
- ✅ Mostra logs informativos no console

---

**Status**: 🔴 Migration pendente de aplicação em produção
**Prioridade**: 🔥 Alta - Funcionalidade crítica afetada