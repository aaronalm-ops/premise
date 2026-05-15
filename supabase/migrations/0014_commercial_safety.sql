-- Premise — Commercial-safety guardrail on the public corpus (D-045)
-- Apply via Supabase Dashboard -> SQL Editor -> New Query -> paste -> Run.
-- Idempotent: safe to re-run.
--
-- Why: the public-corpus taskforce IP-lawyer rule (D-044) flagged that
-- CC-NC content and unverified-licence content cannot be used commercially.
-- Aaron's concrete worry: at the commercial-pivot moment, it's too easy to
-- forget which documents are NC-restricted. This migration makes the
-- restriction structural — a generated column computes commercial-safety
-- automatically from the licence value. The retrieval layer (D-016 pattern)
-- then enforces it whenever PREMISE_COMMERCIAL_MODE=true.
--
-- Pattern: same as D-016's SQL-boundary confidentiality enforcement.
-- The DB doesn't trust application code to remember the NC clause.

-- ============================================================================
-- 1. GENERATED COLUMN — commercial_use_blocked
-- ============================================================================
-- BLOCKED when the licence is:
--   - null              : no licence recorded yet — risky by default
--   - 'unknown'         : explicitly marked unverified
--   - 'cc-by-nc-4.0'    : Non-Commercial CC variant
--   - 'cc-by-nc-sa-4.0' : Non-Commercial + Share-Alike CC variant
--   - 'permission-licensed' : publisher requires explicit permission; the
--                             granted scope must be verified per document
--                             before unblocking. When you confirm permission
--                             allows commercial reuse, update the manifest
--                             licence to a specific value (e.g.
--                             'attribution-permitted' or 'cc-by-4.0').
--
-- NOT BLOCKED when licence is one of:
--   public-domain, ogl-uk-v3, cc0-1.0, cc-by-4.0, cc-by-sa-4.0,
--   attribution-permitted.

alter table documents
  add column if not exists commercial_use_blocked boolean
  generated always as (
    licence is null
    or licence in (
      'unknown',
      'cc-by-nc-4.0',
      'cc-by-nc-sa-4.0',
      'permission-licensed'
    )
  ) stored;

create index if not exists documents_commercial_use_blocked_idx
  on documents(commercial_use_blocked);
