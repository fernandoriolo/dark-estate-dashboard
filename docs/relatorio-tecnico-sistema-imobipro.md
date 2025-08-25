# RELATÓRIO TÉCNICO COMPLETO - SISTEMA IMOBIPRO

## 📋 RESUMO EXECUTIVO

O **ImobiPRO** é uma plataforma SaaS (Software as a Service) desenvolvida para gestão imobiliária, implementada como uma Single Page Application (SPA) moderna com arquitetura baseada em microserviços e backend-as-a-service. O sistema oferece funcionalidades completas para corretores, gestores e administradores, incluindo gestão de propriedades, contratos, leads, agenda, CRM e integrações com WhatsApp.

---

## 🏗️ ARQUITETURA DO SISTEMA

### **Padrão Arquitetural**
- **Frontend**: SPA React com roteamento client-side
- **Backend**: Supabase (PostgreSQL + Auth + Realtime + Storage)
- **Integrações**: n8n (automação), WhatsApp Business API
- **Deploy**: Hostinger (frontend estático) + Supabase (backend)

### **Diagrama de Arquitetura**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Supabase      │    │   Integrações   │
│   (React SPA)   │◄──►│   (Backend)     │◄──►│   (n8n/WhatsApp)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Hostinger     │    │   PostgreSQL    │    │   Webhooks      │
│   (Static Host) │    │   (Database)    │    │   (Real-time)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## 🛠️ STACK TECNOLÓGICO

### **Frontend Stack**
```typescript
// Core Framework
- React 18.3.1 (Hooks, Context API)
- TypeScript 5.5.3 (Type Safety)
- Vite 5.4.1 (Build Tool & Dev Server)

// UI Framework & Styling
- Tailwind CSS 3.4.11 (Utility-first CSS)
- shadcn/ui (Component Library)
- Radix UI (Headless Components)
- Lucide React (Icons)

// State Management & Routing
- React Router DOM 6.26.2 (Client-side Routing)
- React Hook Form 7.53.0 (Form Management)
- Zod 3.23.8 (Schema Validation)

// Charts & Visualization
- MUI X-Charts 8.10.0 (Data Visualization)
- Recharts 2.12.7 (Alternative Charts)

// PDF & Document Processing
- jsPDF 3.0.1 (PDF Generation)
- react-pdf 9.2.1 (PDF Viewing)
- mammoth 1.9.1 (Word Document Processing)

// Animations & UX
- Framer Motion 12.19.2 (Animations)
- Sonner 1.7.4 (Toast Notifications)
```

### **Backend Stack**
```sql
-- Database & Backend-as-a-Service
- Supabase (PostgreSQL 15+)
- Row Level Security (RLS)
- Real-time Subscriptions
- Storage Buckets
- Edge Functions (Deno)

-- Authentication
- Supabase Auth (JWT-based)
- Role-based Access Control
- Session Management
```

### **DevOps & Tools**
```bash
# Development Tools
- ESLint 9.9.0 (Code Linting)
- Prettier (Code Formatting)
- TypeScript ESLint 8.0.1

# Build & Deploy
- Vite (Development & Production Build)
- Hostinger (Static Hosting)
- GitHub Actions (CI/CD)

# Monitoring & Analytics
- Supabase Analytics
- Error Tracking (Sentry planned)
```

---

## 🏢 HIERARQUIA DE USUÁRIOS E PERMISSÕES

### **Sistema de Roles**
```typescript
type UserRole = 'admin' | 'gestor' | 'corretor';

interface UserProfile {
  id: string;           // UUID (espelha auth.users.id)
  email: string;
  full_name: string;
  role: UserRole;       // Determina permissões
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
  company_id?: string;  // Legado (não usado no MVP)
}
```

### **Matriz de Permissões por Role**

#### **Admin (Superusuário)**
- **Acesso**: Total ao sistema
- **Funcionalidades**:
  - Gerenciamento de todas as empresas
  - Criação/edição/exclusão de usuários
  - Configuração de permissões globais
  - Acesso a todos os dados do sistema
  - Módulo "Configurar Permissões"

#### **Gestor (Manager)**
- **Acesso**: Dados da sua empresa
- **Funcionalidades**:
  - Gestão completa de leads, propriedades, contratos
  - Visualização de relatórios da empresa
  - Gerenciamento de corretores da empresa
  - Configuração de permissões para corretores
  - Acesso a módulos administrativos

#### **Corretor (Agent)**
- **Acesso**: Apenas seus próprios dados
- **Funcionalidades**:
  - Gestão de seus leads e propriedades
  - Visualização de seus contratos
  - Acesso limitado a relatórios pessoais
  - Uso de WhatsApp integrado
  - Agenda pessoal

### **Implementação RLS (Row Level Security)**
```sql
-- Exemplo de Policy para Leads
CREATE POLICY "leads_select_policy" ON public.leads
FOR SELECT USING (
  CASE 
    WHEN get_current_role() IN ('admin', 'gestor') THEN true
    WHEN get_current_role() = 'corretor' THEN user_id = auth.uid()
    ELSE false
  END
);
```

---

## 📁 ESTRUTURA DE ARQUIVOS E COMPONENTES

### **Organização do Projeto**
```
dark-estate-dashboard/
├── src/
│   ├── components/           # Componentes React
│   │   ├── ui/              # shadcn/ui components
│   │   ├── DashboardContent.tsx
│   │   ├── DashboardCharts.tsx
│   │   ├── AppSidebar.tsx
│   │   └── [module]View.tsx # Views dos módulos
│   ├── hooks/               # Custom React Hooks
│   │   ├── useUserProfile.ts
│   │   ├── usePermissions.ts
│   │   ├── useLeads.ts
│   │   └── useProperties.ts
│   ├── contexts/            # React Contexts
│   │   ├── ContractTemplatesContext.tsx
│   │   └── PreviewContext.tsx
│   ├── services/            # Serviços e APIs
│   │   ├── metrics.ts
│   │   ├── agenda/
│   │   └── dispatchService.ts
│   ├── lib/                 # Utilitários e configurações
│   │   ├── charts/
│   │   ├── permissions/
│   │   └── utils.ts
│   ├── integrations/        # Integrações externas
│   │   └── supabase/
│   ├── pages/               # Páginas principais
│   └── types/               # TypeScript types
├── supabase/                # Configuração Supabase
│   ├── migrations/          # SQL migrations
│   ├── functions/           # Edge Functions
│   └── config.toml
├── docs/                    # Documentação
└── scripts/                 # Scripts utilitários
```

### **Módulos Principais**

#### **1. Dashboard (Painel)**
```typescript
// Componente Principal: DashboardContent.tsx
interface DashboardContent {
  // KPIs principais
  vgv: number;              // Valor Geral de Vendas
  totalImoveis: number;     // Total de propriedades
  disponiveis: number;      // Propriedades disponíveis
  totalLeads: number;       // Total de leads
  
  // Gráficos interativos
  charts: {
    vgvChart: VGVChart;     // VGV por período
    availabilityChart: AvailabilityChart;
    leadsChart: LeadsChart; // Leads por canal/tempo
    distributionChart: DistributionChart;
    funnelChart: FunnelChart;
    heatmapChart: HeatmapChart;
  };
}
```

#### **2. Propriedades**
```typescript
// Componente: PropertyList.tsx
interface Property {
  id: string;
  title: string;
  type: PropertyType;
  price: number;
  area: number;
  bedrooms: number;
  bathrooms: number;
  disponibilidade: 'disponivel' | 'indisponivel' | 'reforma';
  user_id: string;
  created_at: Date;
}

// Funcionalidades:
// - Listagem com filtros
// - Adição/edição de propriedades
// - Upload de imagens
// - Gestão de disponibilidade
```

#### **3. Contratos**
```typescript
// Componente: ContractsView.tsx
interface Contract {
  id: string;
  property_id: string;
  template_id: string;
  client_name: string;
  valor_total: number;
  tipo: 'Venda' | 'Locação';
  status: 'Ativo' | 'Inativo' | 'Pendente';
  user_id: string;
  created_at: Date;
}

// Funcionalidades:
// - Criação de contratos
// - Templates personalizáveis
// - Geração de PDF
// - Assinatura digital
```

#### **4. CRM e Leads**
```typescript
// Componente: ClientsView.tsx
interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: 'facebook' | 'google' | 'whatsapp' | 'outros';
  stage: 'Novo Lead' | 'Visita Agendada' | 'Em Negociação' | 'Fechamento';
  property_id?: string;
  user_id: string;
  created_at: Date;
}

// Funcionalidades:
// - Pipeline de vendas
// - Gestão de estágios
// - Atribuição de leads
// - Relatórios de performance
```

#### **5. Agenda**
```typescript
// Componente: AgendaView.tsx
interface Appointment {
  id: string;
  title: string;
  date: Date;
  client_name: string;
  property_id?: string;
  user_id: string;
  status: 'Agendado' | 'Confirmado' | 'Cancelado';
}

// Integração com n8n para automação
// - Sincronização com calendários externos
// - Lembretes automáticos
// - Confirmações via WhatsApp
```

#### **6. WhatsApp Integration**
```typescript
// Componente: ConversasView.tsx
interface WhatsAppInstance {
  id: string;
  user_id: string;
  phone_number: string;
  status: 'connected' | 'disconnected';
  created_at: Date;
}

interface WhatsAppMessage {
  id: string;
  instance_id: string;
  from_me: boolean;
  content: string;
  timestamp: Date;
  chat_id: string;
}

// Funcionalidades:
// - Gestão de instâncias WhatsApp
// - Chat em tempo real
// - Envio de mensagens automáticas
// - Heatmap de atividade
```

---

## 🎨 SISTEMA DE DESIGN E UI/UX

### **Design System**
```typescript
// Tema Dark (Padrão)
const theme = {
  colors: {
    background: 'hsl(var(--background))',      // #020817
    foreground: 'hsl(var(--foreground))',      // #f8fafc
    primary: 'hsl(var(--primary))',            // #3b82f6
    secondary: 'hsl(var(--secondary))',        // #64748b
    muted: 'hsl(var(--muted))',                // #334155
    border: 'hsl(var(--border))',              // #1e293b
  },
  borderRadius: {
    lg: 'var(--radius)',                       // 0.5rem
    md: 'calc(var(--radius) - 2px)',
    sm: 'calc(var(--radius) - 4px)',
  }
};
```

### **Componentes UI**
```typescript
// shadcn/ui Components utilizados
- Button (variants: default, destructive, outline, secondary, ghost, link)
- Card (header, content, footer)
- Dialog (modal, sheet, drawer)
- Form (input, select, textarea, checkbox, radio)
- Navigation (sidebar, menu, tabs, breadcrumb)
- Data Display (table, badge, avatar, progress)
- Feedback (toast, alert, tooltip)
```

### **Responsividade**
```css
/* Breakpoints Tailwind */
sm: 640px   /* Mobile */
md: 768px   /* Tablet */
lg: 1024px  /* Small Desktop */
xl: 1280px  /* Desktop */
2xl: 1536px /* Large Desktop */

/* Grid System */
.grid-cols-1 xl:grid-cols-12  /* 12-column grid on desktop */
```

---

## 🔐 SEGURANÇA E AUTENTICAÇÃO

### **Sistema de Autenticação**
```typescript
// Supabase Auth Integration
interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

// JWT Claims Structure
interface JWTPayload {
  aud: string;           // Audience
  exp: number;           // Expiration
  iat: number;           // Issued at
  iss: string;           // Issuer
  sub: string;           // Subject (user_id)
  user_metadata: {
    role?: UserRole;     // User role
    company_id?: string; // Company ID (legacy)
  };
}
```

### **Row Level Security (RLS)**
```sql
-- Políticas de Segurança Implementadas

-- 1. User Profiles
CREATE POLICY "user_profiles_own_data" ON public.user_profiles
FOR ALL USING (id = auth.uid());

-- 2. Properties (Read-only for agents)
CREATE POLICY "properties_select_all" ON public.properties
FOR SELECT USING (true);

CREATE POLICY "properties_modify_admin_gestor" ON public.properties
FOR ALL USING (
  get_current_role() IN ('admin', 'gestor')
);

-- 3. Leads (Role-based access)
CREATE POLICY "leads_role_based" ON public.leads
FOR ALL USING (
  CASE 
    WHEN get_current_role() IN ('admin', 'gestor') THEN true
    WHEN get_current_role() = 'corretor' THEN user_id = auth.uid()
    ELSE false
  END
);
```

### **Funções de Segurança**
```sql
-- Função para obter role atual
CREATE OR REPLACE FUNCTION public.get_current_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN (
    SELECT role 
    FROM public.user_profiles 
    WHERE id = auth.uid()
  ) COALESCE (
    (current_setting('request.jwt.claims', true)::json->>'user_metadata')::json->>'role',
    'corretor'
  );
END;
$$;
```

---

## 📊 BANCO DE DADOS E SCHEMA

### **Estrutura Principal**
```sql
-- Tabelas Core
CREATE TABLE public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  email text NOT NULL,
  full_name text NOT NULL,
  role text DEFAULT 'corretor' CHECK (role IN ('admin', 'gestor', 'corretor')),
  phone text,
  avatar_url text,
  is_active boolean DEFAULT true,
  company_id uuid, -- Legacy field
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.properties (
  id text PRIMARY KEY,
  title text NOT NULL,
  type text NOT NULL,
  price decimal(12,2),
  area numeric,
  bedrooms integer,
  bathrooms integer,
  disponibilidade text DEFAULT 'disponivel',
  user_id uuid REFERENCES public.user_profiles(id),
  company_id uuid, -- Legacy field
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  source text,
  stage text DEFAULT 'Novo Lead',
  property_id text REFERENCES public.properties(id),
  user_id uuid REFERENCES public.user_profiles(id),
  company_id uuid, -- Legacy field
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

### **Views para Relatórios**
```sql
-- View para VGV mensal
CREATE VIEW vw_segura_metricas_vgv_mensal AS
SELECT 
  DATE_TRUNC('month', c.created_at) as mes,
  SUM(c.valor_total) as soma_vgv,
  COUNT(*) as total_contratos
FROM contracts c
WHERE c.tipo = 'Venda'
  AND c.is_active = true
GROUP BY DATE_TRUNC('month', c.created_at)
ORDER BY mes;

-- View para leads por canal
CREATE VIEW vw_chart_leads_por_canal AS
SELECT 
  COALESCE(
    CASE 
      WHEN l.source = 'facebook' THEN 'Facebook'
      WHEN l.source = 'google' THEN 'Google'
      WHEN l.source = 'whatsapp' THEN 'WhatsApp'
      ELSE l.source 
    END, 'Não informado'
  ) as canal_bucket,
  COUNT(*) as total
FROM leads l
GROUP BY canal_bucket
ORDER BY total DESC;
```

---

## 🔄 INTEGRAÇÕES E APIS

### **Supabase Integration**
```typescript
// Cliente Supabase
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});
```

### **n8n Integration (Automação)**
```typescript
// Webhook para agenda
interface N8NWebhook {
  endpoint: string;
  payload: {
    event_type: 'appointment_created' | 'appointment_updated';
    data: Appointment;
    user_id: string;
  };
}

// Proxy configurado no Vite
proxy: {
  '/api/webhook': {
    target: 'https://webhooklabz.n8nlabz.com.br',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api\/webhook/, '/webhook')
  }
}
```

### **WhatsApp Business API**
```typescript
// Integração WhatsApp
interface WhatsAppAPI {
  // Instâncias
  createInstance(userId: string): Promise<WhatsAppInstance>;
  connectInstance(instanceId: string): Promise<void>;
  disconnectInstance(instanceId: string): Promise<void>;
  
  // Mensagens
  sendMessage(instanceId: string, to: string, message: string): Promise<void>;
  getMessages(instanceId: string, chatId: string): Promise<WhatsAppMessage[]>;
  
  // Webhooks
  handleIncomingMessage(webhook: WhatsAppWebhook): void;
}
```

---

## 🚀 PERFORMANCE E OTIMIZAÇÃO

### **Code Splitting**
```typescript
// Lazy Loading de Módulos
const DashboardContent = createLazyComponent(
  () => import("@/components/DashboardContent").then(m => ({ default: m.DashboardContent })),
  "DashboardContent"
);

// Chunk Splitting no Vite
rollupOptions: {
  output: {
    manualChunks(id) {
      if (id.includes('jspdf') || id.includes('react-pdf')) {
        return 'vendor-pdf';
      }
      if (id.includes('/components/ContractsView')) {
        return 'domain-contracts';
      }
      return undefined;
    }
  }
}
```

### **Realtime Subscriptions**
```typescript
// Supabase Realtime
const channel = supabase
  .channel(`dashboard_${Date.now()}`)
  .on('postgres_changes', { 
    event: '*', 
    schema: 'public', 
    table: 'leads' 
  }, () => {
    refetchData();
  })
  .subscribe();
```

### **Caching Strategy**
```typescript
// Memoização de Dados
const memoizedData = useMemo(() => {
  return processComplexData(rawData);
}, [rawData]);

// Debouncing de Filtros
const debouncedSearch = useDebounce(searchTerm, 300);
```

---

## 🧪 TESTES E QUALIDADE

### **Estrutura de Testes**
```typescript
// Testes Unitários (Planejados)
describe('DashboardContent', () => {
  it('should render KPIs correctly', () => {
    // Test implementation
  });
  
  it('should handle data loading states', () => {
    // Test implementation
  });
});

// Testes de Integração
describe('Supabase Integration', () => {
  it('should fetch user profile', async () => {
    // Test implementation
  });
});
```

### **Linting e Formatação**
```json
// ESLint Configuration
{
  "extends": [
    "@eslint/js",
    "typescript-eslint"
  ],
  "plugins": [
    "react-hooks",
    "react-refresh"
  ],
  "rules": {
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

---

## 📈 MONITORAMENTO E ANALYTICS

### **Error Tracking**
```typescript
// Error Boundary Implementation
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to monitoring service
    console.error('Error caught by boundary:', error, errorInfo);
  }
}
```

### **Performance Monitoring**
```typescript
// Web Vitals Tracking
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

---

## 🔮 ROADMAP E EVOLUÇÃO

### **Melhorias Planejadas**

#### **Curto Prazo (1-3 meses)**
- [ ] Implementação de testes automatizados
- [ ] Otimização de performance com Service Workers
- [ ] Melhoria do sistema de notificações
- [ ] Exportação de relatórios em PDF/Excel

#### **Médio Prazo (3-6 meses)**
- [ ] Integração com mais portais imobiliários
- [ ] Sistema de comissões automático
- [ ] App mobile (React Native)
- [ ] API pública para integrações

#### **Longo Prazo (6+ meses)**
- [ ] Machine Learning para scoring de leads
- [ ] Integração com sistemas de pagamento
- [ ] Marketplace de templates
- [ ] White-label para imobiliárias

### **Arquitetura Futura**
```typescript
// Microserviços (Planejado)
interface MicroservicesArchitecture {
  auth: AuthService;           // Autenticação centralizada
  properties: PropertyService; // Gestão de propriedades
  contracts: ContractService;  // Gestão de contratos
  crm: CRMService;            // Gestão de leads
  notifications: NotificationService; // Sistema de notificações
  analytics: AnalyticsService; // Analytics e relatórios
}
```

---

## 📋 CONCLUSÃO

O sistema **ImobiPRO** representa uma solução completa e moderna para gestão imobiliária, caracterizada por:

### **Pontos Fortes**
- **Arquitetura Moderna**: SPA React + Supabase backend-as-a-service
- **Segurança Robusta**: RLS implementado em todas as tabelas críticas
- **UX/UI Polida**: Design system consistente com shadcn/ui
- **Performance Otimizada**: Code splitting, lazy loading, realtime
- **Escalabilidade**: Arquitetura preparada para crescimento

### **Diferenciais Técnicos**
- **Role-based Access Control**: Hierarquia clara de permissões
- **Realtime Updates**: Dados atualizados instantaneamente
- **Integração WhatsApp**: Comunicação direta com clientes
- **Relatórios Avançados**: Gráficos interativos e KPIs
- **Multi-tenant Ready**: Preparado para múltiplas empresas

### **Stack Tecnológico**
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **UI**: shadcn/ui + Radix UI + Lucide Icons
- **Charts**: MUI X-Charts + Recharts
- **Deploy**: Hostinger + GitHub Actions

O sistema está posicionado como uma solução enterprise-ready para o mercado imobiliário, oferecendo funcionalidades completas de CRM, gestão de propriedades, contratos e automação de comunicação, tudo integrado em uma plataforma moderna e escalável.
