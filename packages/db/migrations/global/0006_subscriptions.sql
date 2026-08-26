-- 0006_subscriptions.sql — Tenant subscription billing and suspension tracking

CREATE TABLE IF NOT EXISTS public.tenant_subscriptions (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_code TEXT NOT NULL REFERENCES public.plans(code),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('trialing', 'active', 'past_due', 'cancelled')),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL,
  trial_end TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tenant_subscriptions_tenant_idx ON public.tenant_subscriptions (tenant_id);
CREATE INDEX IF NOT EXISTS tenant_subscriptions_status_idx ON public.tenant_subscriptions (status);

-- Only one active/trialing subscription per tenant
CREATE UNIQUE INDEX IF NOT EXISTS tenant_subscriptions_active_uq
  ON public.tenant_subscriptions (tenant_id)
  WHERE status IN ('trialing', 'active', 'past_due');

CREATE TABLE IF NOT EXISTS public.tenant_invoices (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES public.tenant_subscriptions(id),
  amount_paise BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'overdue', 'void')),
  billing_period_start TIMESTAMPTZ NOT NULL,
  billing_period_end TIMESTAMPTZ NOT NULL,
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  payment_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tenant_invoices_tenant_idx ON public.tenant_invoices (tenant_id);
CREATE INDEX IF NOT EXISTS tenant_invoices_status_idx ON public.tenant_invoices (status);
CREATE INDEX IF NOT EXISTS tenant_invoices_due_idx ON public.tenant_invoices (due_date) WHERE status = 'pending';

-- Grace period config (days after subscription expires before auto-suspension)
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS suspension_grace_days INT NOT NULL DEFAULT 7;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
