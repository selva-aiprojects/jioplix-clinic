-- Shared extensions live in public, never inside tenant schemas.
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;
