-- Add helpful indexes for ORDER BY created_at DESC LIMIT N
CREATE INDEX IF NOT EXISTS idx_imoveisvivareal_created_at ON public.imoveisvivareal(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON public.properties(created_at DESC);
