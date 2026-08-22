UPDATE public.plans
SET addons = addons || '["procedures"]'::jsonb
WHERE code = 'professional'
  AND NOT addons @> '["procedures"]'::jsonb;