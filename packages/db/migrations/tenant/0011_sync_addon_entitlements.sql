UPDATE addon_entitlements AS ae
SET enabled = EXISTS (
  SELECT 1
  FROM public.tenants AS t
  INNER JOIN public.plans AS p ON p.code = t.plan_code
  WHERE t.schema_name = current_schema()
    AND p.addons @> jsonb_build_array(ae.module_code)
);