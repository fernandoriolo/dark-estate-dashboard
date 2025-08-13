BEGIN;

-- Adiciona colunas de disponibilidade no catálogo de imóveis (VivaReal)
ALTER TABLE public.imoveisvivareal
  ADD COLUMN disponibilidade text;

ALTER TABLE public.imoveisvivareal
  ADD COLUMN disponibilidade_observacao text;

-- Define default e faz backfill para registros existentes
ALTER TABLE public.imoveisvivareal
  ALTER COLUMN disponibilidade SET DEFAULT 'disponivel';

UPDATE public.imoveisvivareal
  SET disponibilidade = 'disponivel'
  WHERE disponibilidade IS NULL;

-- Restrições de domínio
ALTER TABLE public.imoveisvivareal
  ADD CONSTRAINT imoveisvivareal_disponibilidade_check
    CHECK (disponibilidade IN ('disponivel','indisponivel','reforma'));

-- Observação obrigatória quando indisponível ou em reforma
ALTER TABLE public.imoveisvivareal
  ADD CONSTRAINT imoveisvivareal_disponibilidade_obs_required
    CHECK (
      disponibilidade NOT IN ('indisponivel','reforma')
      OR disponibilidade_observacao IS NOT NULL
    );

-- Torna NOT NULL após o backfill
ALTER TABLE public.imoveisvivareal
  ALTER COLUMN disponibilidade SET NOT NULL;

-- Comentários (documentação in-db)
COMMENT ON COLUMN public.imoveisvivareal.disponibilidade IS 'Status de disponibilidade do imóvel: disponivel | indisponivel | reforma. Default: disponivel.';
COMMENT ON COLUMN public.imoveisvivareal.disponibilidade_observacao IS 'Observação obrigatória quando indisponivel ou reforma.';

COMMIT;


