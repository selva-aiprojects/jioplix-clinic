-- 0010_password_reset.sql — Password reset tokens
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id UUID PRIMARY KEY,
  user_email TEXT NOT NULL,
  user_type TEXT NOT NULL DEFAULT 'tenant',
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_email ON public.password_reset_tokens (user_email);
CREATE INDEX IF NOT EXISTS idx_password_reset_hash ON public.password_reset_tokens (token_hash);
