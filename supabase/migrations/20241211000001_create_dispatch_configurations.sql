-- Migration: Criar tabela de configurações de disparador
-- Permite criar setups pré-definidos para o sistema de disparos WhatsApp

-- 1. Criar tabela principal de configurações
CREATE TABLE IF NOT EXISTS public.dispatch_configurations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Configurações de Corretores
  assigned_brokers JSONB DEFAULT '[]'::jsonb,
  broker_assignment_strategy TEXT DEFAULT 'round_robin' 
    CHECK (broker_assignment_strategy IN ('round_robin', 'random', 'least_busy')),
  
  -- Configurações de Tempo
  time_windows JSONB DEFAULT '{}'::jsonb,
  interval_between_messages INTEGER DEFAULT 150 CHECK (interval_between_messages >= 0),
  max_messages_per_hour INTEGER DEFAULT 100 CHECK (max_messages_per_hour > 0),
  
  -- Template da Mensagem
  message_template TEXT NOT NULL DEFAULT 'Olá {nome}, tudo bem?',
  
  -- Configurações Gerais
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(company_id, name),
  CONSTRAINT valid_assigned_brokers CHECK (jsonb_typeof(assigned_brokers) = 'array'),
  CONSTRAINT valid_time_windows CHECK (jsonb_typeof(time_windows) = 'object')
);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_dispatch_configs_company_id ON public.dispatch_configurations(company_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_configs_user_id ON public.dispatch_configurations(user_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_configs_active ON public.dispatch_configurations(is_active);
CREATE INDEX IF NOT EXISTS idx_dispatch_configs_created_at ON public.dispatch_configurations(created_at);

-- 3. Trigger para atualizar updated_at
CREATE TRIGGER update_dispatch_configurations_updated_at
    BEFORE UPDATE ON public.dispatch_configurations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Trigger para definir company_id automaticamente
CREATE OR REPLACE FUNCTION set_dispatch_config_company_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Se company_id não foi definido, buscar do usuário
  IF NEW.company_id IS NULL THEN
    SELECT company_id INTO NEW.company_id
    FROM public.user_profiles
    WHERE id = NEW.user_id;
  END IF;
  
  -- Se user_id não foi definido, usar auth.uid()
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_set_dispatch_config_company_id
    BEFORE INSERT ON public.dispatch_configurations
    FOR EACH ROW EXECUTE FUNCTION set_dispatch_config_company_id();
