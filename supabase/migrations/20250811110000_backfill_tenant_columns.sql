-- Backfill tenant columns: company_id (and ensure user_id where applicable)
-- Safe to run multiple times: uses updates only where company_id is null

BEGIN;

-- properties: if company_id null, set from user_profiles
UPDATE public.properties p
SET company_id = up.company_id
FROM public.user_profiles up
WHERE p.company_id IS NULL
  AND p.user_id = up.id;

-- leads: prefer company from property if exists, else from user_profiles
UPDATE public.leads l
SET company_id = COALESCE(p.company_id, up.company_id)
FROM public.properties p
LEFT JOIN public.user_profiles up ON up.id = l.user_id
WHERE l.company_id IS NULL
  AND p.id = l.property_id;

UPDATE public.leads l
SET company_id = up.company_id
FROM public.user_profiles up
WHERE l.company_id IS NULL
  AND l.user_id = up.id;

-- contracts: prefer property.company_id, else user_profiles
UPDATE public.contracts c
SET company_id = COALESCE(p.company_id, up.company_id)
FROM public.properties p
LEFT JOIN public.user_profiles up ON up.id = c.user_id
WHERE c.company_id IS NULL
  AND p.id = c.property_id;

UPDATE public.contracts c
SET company_id = up.company_id
FROM public.user_profiles up
WHERE c.company_id IS NULL
  AND c.user_id = up.id;

-- contract_templates: set from user_profiles (source of truth is the row)
UPDATE public.contract_templates ct
SET company_id = up.company_id
FROM public.user_profiles up
WHERE ct.company_id IS NULL
  AND ct.user_id = up.id;

-- whatsapp_instances: set from user_profiles
UPDATE public.whatsapp_instances wi
SET company_id = up.company_id
FROM public.user_profiles up
WHERE wi.company_id IS NULL
  AND wi.user_id = up.id;

-- whatsapp_chats: prefer instance.company_id, else user_profiles
UPDATE public.whatsapp_chats wc
SET company_id = COALESCE(wi.company_id, up.company_id)
FROM public.whatsapp_instances wi
LEFT JOIN public.user_profiles up ON up.id = wc.user_id
WHERE wc.company_id IS NULL
  AND wi.id = wc.instance_id;

UPDATE public.whatsapp_chats wc
SET company_id = up.company_id
FROM public.user_profiles up
WHERE wc.company_id IS NULL
  AND wc.user_id = up.id;

-- whatsapp_messages: prefer instance.company_id via chat, else user_profiles
UPDATE public.whatsapp_messages wm
SET company_id = COALESCE(wi.company_id, up.company_id)
FROM public.whatsapp_chats wc
LEFT JOIN public.whatsapp_instances wi ON wi.id = wc.instance_id
LEFT JOIN public.user_profiles up ON up.id = wm.user_id
WHERE wm.company_id IS NULL
  AND wc.id = wm.chat_id;

UPDATE public.whatsapp_messages wm
SET company_id = up.company_id
FROM public.user_profiles up
WHERE wm.company_id IS NULL
  AND wm.user_id = up.id;

-- imoveisvivareal: set from user_profiles
UPDATE public.imoveisvivareal iv
SET company_id = up.company_id
FROM public.user_profiles up
WHERE iv.company_id IS NULL
  AND iv.user_id = up.id;

COMMIT;
