-- 0011_support_tickets.sql — Support ticket system
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_by_user_id UUID,
  subject TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant ON public.support_tickets (tenant_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets (status);

CREATE TABLE IF NOT EXISTS public.support_ticket_responses (
  id UUID PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  responder_type TEXT NOT NULL DEFAULT 'platform',
  responder_name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_responses_ticket ON public.support_ticket_responses (ticket_id);
