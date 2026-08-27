-- 0013_email_logs.sql — Track sent emails to prevent duplicates
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY,
  tenant_id UUID,
  email_type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_tenant_type ON public.email_logs (tenant_id, email_type, sent_at);
