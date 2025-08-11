-- ==================================================
-- Índices de performance para consultas sob RLS
-- Foco em company_id, user_id, created_at e chaves de junção
-- Data: 2025-08-10
-- ==================================================

-- properties
CREATE INDEX IF NOT EXISTS idx_properties_company_id ON public.properties(company_id);
CREATE INDEX IF NOT EXISTS idx_properties_user_id ON public.properties(user_id);
CREATE INDEX IF NOT EXISTS idx_properties_company_created_at ON public.properties(company_id, created_at DESC);

-- leads
CREATE INDEX IF NOT EXISTS idx_leads_company_created_at ON public.leads(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_user_created_at ON public.leads(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_property_id ON public.leads(property_id);

-- contracts
CREATE INDEX IF NOT EXISTS idx_contracts_company_created_at ON public.contracts(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contracts_user_created_at ON public.contracts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contracts_property_id ON public.contracts(property_id);

-- contract_templates
CREATE INDEX IF NOT EXISTS idx_contract_templates_company_created_at ON public.contract_templates(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contract_templates_user_created_at ON public.contract_templates(user_id, created_at DESC);

-- property_images
CREATE INDEX IF NOT EXISTS idx_property_images_property_id ON public.property_images(property_id);

-- whatsapp_instances
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_user_id ON public.whatsapp_instances(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_company_id ON public.whatsapp_instances(company_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_status ON public.whatsapp_instances(status);

-- whatsapp_chats
CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_instance_id ON public.whatsapp_chats(instance_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_user_id ON public.whatsapp_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_lead_id ON public.whatsapp_chats(lead_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_property_id ON public.whatsapp_chats(property_id);

-- whatsapp_messages
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_chat_id_timestamp ON public.whatsapp_messages(chat_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_instance_id ON public.whatsapp_messages(instance_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_user_id ON public.whatsapp_messages(user_id);

-- imoveisvivareal
CREATE INDEX IF NOT EXISTS idx_imoveisvivareal_company_id ON public.imoveisvivareal(company_id);
CREATE INDEX IF NOT EXISTS idx_imoveisvivareal_user_id ON public.imoveisvivareal(user_id);


