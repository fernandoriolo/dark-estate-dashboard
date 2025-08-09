-- ==================================================
-- TABELA: public.imoveisvivareal
-- Descrição: Estrutura de imóveis (VivaReal) com imagens e features em arrays
-- ==================================================

-- Função utilitária para updated_at (cria se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
  ) THEN
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ language 'plpgsql';
  END IF;
END $$;

-- Criação da tabela
CREATE TABLE IF NOT EXISTS public.imoveisvivareal (
  id SERIAL NOT NULL,
  listing_id TEXT NULL,
  imagens TEXT[] NULL,
  tipo_categoria TEXT NULL,
  tipo_imovel TEXT NULL,
  descricao TEXT NULL,
  preco NUMERIC NULL,
  tamanho_m2 NUMERIC NULL,
  quartos INTEGER NULL,
  banheiros INTEGER NULL,
  ano_construcao INTEGER NULL,
  suite INTEGER NULL,
  garagem INTEGER NULL,
  features TEXT[] NULL,
  andar INTEGER NULL,
  blocos INTEGER NULL,
  cidade TEXT NULL,
  bairro TEXT NULL,
  endereco TEXT NULL,
  numero TEXT NULL,
  complemento TEXT NULL,
  cep TEXT NULL,
  user_id UUID NULL,
  company_id UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
  CONSTRAINT imoveis_pkey PRIMARY KEY (id),
  CONSTRAINT imoveisvivareal_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies (id),
  CONSTRAINT imoveisvivareal_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles (id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_imoveisvivareal_user_id ON public.imoveisvivareal(user_id);
CREATE INDEX IF NOT EXISTS idx_imoveisvivareal_company_id ON public.imoveisvivareal(company_id);
CREATE INDEX IF NOT EXISTS idx_imoveisvivareal_cidade ON public.imoveisvivareal(cidade);
CREATE INDEX IF NOT EXISTS idx_imoveisvivareal_bairro ON public.imoveisvivareal(bairro);
CREATE INDEX IF NOT EXISTS idx_imoveisvivareal_preco ON public.imoveisvivareal(preco);
CREATE INDEX IF NOT EXISTS idx_imoveisvivareal_tamanho ON public.imoveisvivareal(tamanho_m2);
CREATE INDEX IF NOT EXISTS idx_imoveisvivareal_quartos ON public.imoveisvivareal(quartos);
CREATE INDEX IF NOT EXISTS idx_imoveisvivareal_banheiros ON public.imoveisvivareal(banheiros);
CREATE INDEX IF NOT EXISTS idx_imoveisvivareal_tipo_imovel ON public.imoveisvivareal(tipo_imovel);
CREATE INDEX IF NOT EXISTS idx_imoveisvivareal_tipo_categoria ON public.imoveisvivareal(tipo_categoria);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_imoveisvivareal_updated_at ON public.imoveisvivareal;
CREATE TRIGGER update_imoveisvivareal_updated_at
  BEFORE UPDATE ON public.imoveisvivareal
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS: habilitar e políticas
ALTER TABLE public.imoveisvivareal ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'imoveisvivareal' LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON public.imoveisvivareal';
  END LOOP;
END $$;

-- Usuário vê seus imóveis e gestores/admins veem por empresa
CREATE POLICY "Users can view own imoveis" ON public.imoveisvivareal
FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role IN ('gestor','admin')
      AND up.company_id = imoveisvivareal.company_id
  )
);

-- Usuário gerencia apenas seus imóveis
CREATE POLICY "Users can manage own imoveis" ON public.imoveisvivareal
FOR ALL USING (user_id = auth.uid());

COMMENT ON TABLE public.imoveisvivareal IS 'Tabela de imóveis (VivaReal) com imagens e features em arrays, associada a usuário/empresa.';
COMMENT ON COLUMN public.imoveisvivareal.imagens IS 'URLs das imagens do imóvel como array de texto.';
COMMENT ON COLUMN public.imoveisvivareal.features IS 'Lista de features/amenidades do imóvel como array de texto.';


