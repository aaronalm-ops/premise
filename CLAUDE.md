# CLAUDE.md — operating manual for Premise

This file is auto-loaded by Claude Code when working in this repo. Read it before doing anything substantive.

## What this is

**Premise** is an AI co-pilot for market and consumer insights researchers. End-to-end workflow: brief → hypotheses → questionnaire (with persona recommendations and question variants) → analysis → story angles, grounded in the researcher's historical work via strict-mode RAG.

**Live demo:** https://premise-one.vercel.app/ (private-share, not publicly broadcast — D-030)
**Repo:** https://github.com/aaronalm-ops/premise (public)

## Owner

Aaron — Researcher / Analyst transitioning to AI Product Manager. This repo is his first AI project and is being built as a portfolio piece *and* a case study. He has deep researcher domain expertise and limited engineering background ("aspiring vibe coder"). Treat him as the product owner with research domain authority; treat the build as the engineering arm.

## Non-negotiables

These are load-bearing for the product and have been agreed. Do not relitigate without flagging.

1. **The chatbot proposes, the researcher disposes.** Every output is options/variants, never a single auto-decision. The researcher selects based on expertise.
2. **Strict abstention on RAG.** Zero fabrication. Every claim cites a source chunk; if the corpus does not support an answer, the bot says so. Enforced via three layers: schema-forced tool_use → verifier pass → UI gate.
3. **Haiku-default model routing.** Default to `claude-haiku-4-5-20251001`. Escalate to `claude-sonnet-4-6` only for synthesis-heavy steps (hypothesis generation, analysis writeup, story angles, the final questionnaire pass). **Never default to Opus.**
4. **Prompt caching on every repeated call.** System prompts, persona libraries, document context — anything that repeats. This is the #1 cost lever.
5. **Confidentiality enforced at the SQL boundary**, not in application code. See [supabase/migrations/0001_initial_schema.sql](supabase/migrations/0001_initial_schema.sql) `match_chunks` function.
6. **No LangChain, no agent frameworks.** Direct SDK calls only. Every loophole we want to close lives inside the prompt; frameworks abstract that away.
7. **<$5/month budget during portfolio phase.** Costs are a product decision, not a tuning detail.
8. **Build by risk, not by user-flow order.** RAG before features. Evals before scaling.

## How Aaron wants explanations

For every meaningful decision, lead with a **story or analogy** drawn from the researcher/agency world, then the technical rationale. Aaron learns through narrative, not specs. When introducing any technical term (RAG, embedding, prompt caching, ADR, eval, RLS), define it inline before using it operationally. See [docs/DECISIONS.md](docs/DECISIONS.md) for the established voice.

## Stack

| Layer | Choice |
|---|---|
| App | Next.js 15 (App Router) + TypeScript |
| UI | Tailwind v4 + shadcn/ui (deferred until Phase 1.5) |
| DB + vectors | Supabase Postgres + pgvector |
| LLM | Anthropic Claude (Haiku/Sonnet routing) |
| Embeddings | Voyage AI `voyage-3` (1024-dim) |
| Hosting | Vercel free tier |
| Scripts | `tsx` with `--env-file=.env.local` |

## Where things live

- [docs/DECISIONS.md](docs/DECISIONS.md) — **canonical decision log** (D-001 through D-017). Source of truth for *why*. Read before challenging any choice.
- [docs/CASE_STUDY.md](docs/CASE_STUDY.md) — running portfolio narrative in Aaron's voice.
- [docs/ROADMAP.md](docs/ROADMAP.md) — phased plan with hard exit criteria per phase.
- [docs/PROJECT_BRIEF.md](docs/PROJECT_BRIEF.md) — dense self-contained brief for handing off to another chat.
- [docs/PORTFOLIO.md](docs/PORTFOLIO.md) — portfolio-ready copy in multiple lengths.
- [src/lib/rag/](src/lib/rag/) — chunking, embeddings, retrieval, reranker, generation, verification, pipeline.
- [src/lib/prompts/](src/lib/prompts/) — system prompts. Every word here is load-bearing for strict abstention.
- [supabase/migrations/](supabase/migrations/) — schema + RPC functions.
- [scripts/](scripts/) — CLIs (`create-project`, `ingest`, `diagnose`).

## Conventions

- **Comments**: write none unless the *why* is non-obvious. No "what" comments.
- **Strict TypeScript**, no implicit any.
- **Server-side data access via service role key.** Browser-side never sees Supabase directly until we add auth + RLS policies.
- **New migrations start from [supabase/migrations/_template.sql](supabase/migrations/_template.sql).** Every new `public` table must `grant select, insert, update, delete ... to service_role` and `enable row level security`. Supabase removed the implicit Data API grant (D-037); a missing grant means supabase-js returns `42501`.
- **One npm script per CLI**, all use `tsx --env-file=.env.local`.
- **Add a numbered entry to DECISIONS.md** for every meaningful choice. Format: D-NNN, with story / analogy, what we considered, the PM lesson, and what would break if we got it wrong.

## How to run

```bash
npm install
cp .env.local.example .env.local           # then fill in 5 keys
npm run diagnose                            # verifies env + pings each service
npm run dev                                 # http://localhost:3000
npm run create-project -- "Name" client-confidential "Description"
npm run ingest -- <projectId> ./file.txt    # .txt or .md
curl -s -X POST localhost:3000/api/ask -H 'Content-Type: application/json' \
  -d '{"projectId":"<id>","question":"..."}' | jq
```

## Current build state (last updated 2026-04-30)

- Phase 0 — scaffolding **shipped**.
- Phase 1 — strict-mode RAG core **shipped**: schema, ingestion CLI, retrieval, rerank, strict-output generation, verifier, `/api/ask`.
- Phase 1.5 — chat-pane UI **shipped**: project switcher, question input, structured answer rendering with citation chips, abstention callout, retrieved-chunks audit panel.
- Phase 2 — hypothesis generation **shipped**: `briefs` and `hypotheses` schema, hypothesis generator pipeline (RAG-augmented, forced tool_use, citation discipline), brief intake artefact, hypothesis cards with priority, citations, and accept/reject affordances. Reuses the strict-output chassis from D-010 (D-018).
- Phase 3 — personas + questionnaires **shipped**: `personas`, `questions`, `question_variants` schema. Persona generator (RAG-augmented, requires `under_represents` field). Question generator with variant taxonomy (neutral_direct / leading / projective / behavioural / attitudinal / forced_choice / constant_sum / maxdiff) — every question has exactly 3 variants from different frames, each labelled with what it elicits and its caveat. Researcher selects one variant per question. D-019 captures the principle.
- **Audit #1** completed (2026-04-30): see `docs/EVALUATION_LOG.md`. 38 specific gaps identified across 5 expert lenses; 5 prioritised for next push.
- **Eval harness shipped**: `evals/` directory with 6 probe types (golden-qa, abstention, hallucination, hypothesis-quality, persona-quality, confidentiality), 20 probes, fixtures, dedicated test projects, CLI (`npm run eval`). Gates every prompt change. D-020.
- **Tier 1 of the Audit-#1 build queue shipped**:
  - **Prompt caching** (D-021) — every generation call uses Anthropic `cache_control`. Closes L-1.
  - **Survey export** (D-022) — markdown / Qualtrics / plaintext. Closes R-4 / U-3.
  - **Cost telemetry** (D-023) — `api_calls` table, traced wrappers, live cost badge. Closes L-7 / P-3.
  - **Edit affordance** (D-024) — inline edit on hypothesis + variant statements. Closes U-4.
- **Tier 2 of the Audit-#1 build queue shipped**:
  - **Zod validation + safe-error** (D-025) — every API route validates input with Zod and sanitises errors before responding. Closes D-4, D-5, D-6.
  - **Atomic generation** (D-026) — `replace_proposed_*` Postgres functions wrap delete+insert in a single transaction. Closes D-3.
  - **Retry logic** (D-027) — `withRetry` wraps every Anthropic + Voyage call; exponential backoff with jitter on 429/5xx/network errors. Closes L-3.
  - **Generation locks** (D-028) — `generation_locks` table + `withGenerationLock` helper applied to hypotheses/personas/questions endpoints. Closes L-6.
  - **Project creation in UI** (D-029) — `+ New` button + modal in the project switcher. Closes U-6.
- **Phase 5 deployment shipped** (2026-05-01): repo public, deploy live at `premise-one.vercel.app`. Public-repo / semi-public-URL strategy (D-030); multi-format ingestion — PDF/DOCX/URL with Mozilla Readability (D-031); Supabase Auth with magic links + per-user ownership + `claim_orphan_projects` (D-032); shared public library that solves cold-start (D-033).
- **Phase 4 (analysis) shipped**: `analyses` + `analysis_data` schema (migration 0008). LLM-driven analyser produces per-hypothesis verdicts + emergent patterns + study caveats. Closes P-4. D-034.
- **Tier 3-5 polish push** (D-035, 2026-05-01): chat persistence (U-1), user feedback loop / rejection_reason (P-2), confirm-on-destructive (U-8), bulk Accept-all, delete project + delete document (U-7), color disambiguation (U-9), loading-stage pipeline (U-5), reranker as tool_use (L-4), verifier batched (L-5), researcher-controlled counts (P-6), prompt versioning (L-8), cost regression in eval harness, success metrics doc (P-1). 14 of 22 audit items closed; 4 deferred (streaming, skip logic, judge probes, optimistic UI) with rationale.
- **Phase 5 (story angles) shipped** (D-036, 2026-05-01): `story_angles` schema (migration 0010). Angle generator produces 3-4 ranked angles with named audience, lede, 3 beats, evidence chain, and a mandatory `omits` disclosure rendered as an indigo callout. Outline drafter generates structured markdown outlines for accepted angles. Copy-and-download-as-`.md`. Closes the brief → story arc end-to-end.
- **All five user-flow phases shipped.** Premise: brief → hypotheses → personas → questionnaire → analysis → **recommendation** → story angles + outline. 45 D-NN entries. 33 production routes. 32 of 38 audit items resolved. Taskforce-driven Audit #2 (2026-05-14) closed all 10 prioritised critiques across 5 execution waves; see `docs/TASKFORCE_CRITIQUE.md` + D-038 through D-043. Public-corpus taskforce convened (2026-05-14); scaffolding (D-044) and commercial-safety guardrail (D-045) shipped. First public-corpus ingest: 66 documents (~$0.11 in embeddings).
- **D-037 — Supabase Data-API grant policy** (2026-05-14): Supabase announced that public-schema tables will no longer auto-expose to the Data API (PostgREST / supabase-js / GraphQL). New projects flip May 30, 2026; existing projects (including Premise) flip Oct 30, 2026, applied only to *new* tables from that date. Existing tables grandfathered. Added [supabase/migrations/_template.sql](supabase/migrations/_template.sql) with the canonical `GRANT … to service_role` + `enable row level security` pattern and updated CLAUDE.md conventions so future migrations are safe-by-construction.
- **D-038 — Strict abstention is the floor, not the ceiling** (2026-05-14): taskforce-driven reframe (see `docs/TASKFORCE_CRITIQUE.md`). Reframed README / PITCH / PORTFOLIO to position zero-fabrication as the *floor* and calibrated estimation (the already-existing confidence-per-claim) as the *ceiling*. Softened the chat-pane abstention copy ("Below the grounding floor"). Reframed the `omits` label on story angles as deliberate positioning, not confession. Added `<GroundingDisclosure />` component under every RAG-grounded artefact (chat / hypotheses / analysis / angles). Added a "What Premise is *not*" section to the pitch. No behaviour change; positioning change.
- **D-036 footnote 1 — Story prompt v2** (2026-05-14): positioned titles + distinct primary audience per angle (taskforce 7a/7b). Story prompt tightened (rule 1: different audiences across angles; rule 3: title encodes the positioning; rule 6: omits framed as choice not apology). `story-gen` bumped to `v2-2026-05-14`. Schema and chassis unchanged; the model just populates the same fields with sharper instruction.
- **D-039 — Recommendation artefact** (2026-05-14): taskforce critique 5a-5c (the C-suite-shaped output that lives between analysis and story angles). New `recommendations` table (migration 0011), Sonnet-driven generator with forced tool_use, three API routes (generate / list / patch), recommendations-artefact UI slotted between Analysis and Stories in the artefacts pane. Each recommendation carries a causal insight, a specific action, a calibrated confidence (high/medium/low against evidence-chain strength), an evidence chain, and mandatory caveats. **Cascade**: story-generator now reads accepted Recommendation and bumps `story-gen` to `v3-2026-05-14` — angles ladder up to the recommendation when present; fall back to today's behaviour when none accepted. All cross-cutting gates (D-010/021/023/024/025/026/027/028/037/038) honored. Known gap: no recommendation-quality eval probe yet (deferred to Wave 5).
- **D-040 — Variant ordering by hypothesis-fit + audit-trail selection_mode** (2026-05-14): taskforce critique 4a (Behavioral Scientist). Question generator now marks exactly one variant per question as `is_recommended`; UI renders the recommended variant first with a quiet sky-tint and "Recommended" tag. Server-derived `selection_mode` on the chosen variant: `'default'` when the researcher accepts the recommendation, `'active'` when they override. `question-gen` bumped to `v4-2026-05-14`. Migration 0012 adds `is_recommended` + `selection_mode` columns and redefines `replace_proposed_questions` to persist the flag. The fatigue-default is now a defensible default.
- **D-041 — Post-analysis hypothesis revision discipline** (2026-05-14): taskforce critiques 9a + 4 (Academic Peer-Reviewer + Behavioral Scientist; Aaron explicitly deferred the call to the taskforce). Soft-lock-with-rationale pattern, modelled on academic pre-registration / AsPredicted deviation reports. When an accepted hypothesis is structurally edited (statement / expected_direction / confirmation_criteria / assumptions / priority) AND an analysis exists on the brief, a non-empty `revision_rationale` is required by both the UI prompt and the API (`422` on missing rationale). New columns on `hypotheses` (migration 0012): `revised_after_analysis boolean`, `revision_rationale text`. UI surfaces an amber "Revised post-analysis" tag with rationale on hover + expanded view. **Cascade**: `story-generator.ts` auto-appends `[Deviation: H<n> was revised after analysis (rationale: ...)]` to any angle's `omits` field when the evidence chain references a revised hypothesis. The integrity flows schema → API → UI → angle artefact → outline export. No hard lock, no workaround temptation.
- **D-042 — Citation-accuracy probe** (2026-05-14): taskforce critique 8a (AI-safety researcher). New `citation-accuracy` probe type wired through `evals/lib/types.ts`, `evals/cli.ts`, and `evals/runners/citation-accuracy.ts`. Five fixtures in `evals/probes/citation-accuracy/` (reusing the golden-qa corpus). Independent Sonnet judge with a stricter prompt cross-checks the existing Haiku batched verifier (D-035) — catches verifier false-positives the runtime chassis can't catch by itself. Threshold per probe: `min_support_rate: 1.0` (every claim must be Sonnet-supported). EVALUATION_LOG.md updated with Audit #2 section + the new probe baseline.
- **D-043 — Cost-at-scale calculator** (2026-05-14): taskforce critique 10d (AI PM). New `src/lib/db/cost-projection.ts` aggregates per-endpoint averages from `api_calls` (D-023) into 9 lifecycle buckets, with hardcoded fallbacks where observation count is <3. New public route `GET /api/cost-projection` returns anonymised aggregates (no project_id, no content). New standalone page `/cost-calculator` with sliders (docs / questions / regenerations / outlines), hero card (per study + monthly @ 10 studies), per-stage breakdown labelling each row as "observed (N calls)" or "fallback estimate". Answers the first question every commercial conversation opens with.
- **D-044 — Public-corpus metadata + bulk-ingest scaffold** (2026-05-14): public-corpus taskforce week-1 deliverable (see `docs/PUBLIC_CORPUS_TASKFORCE.md` + `docs/PUBLIC_CORPUS_SHOPPING_LIST.md`). Migration 0013 adds seven per-document metadata columns (`licence`, `licence_url`, `source_type` with 9-bucket CHECK, `publication_year`, `geography`, `topic_tags` text[] with GIN index, `curators_note`) plus filtered-retrieval indexes. Types layer adds `Licence` (SPDX-style) and `SourceType` enums. `ingestDocument` accepts a `metadata` object end-to-end; content-hash duplicates trigger `updateDocumentMetadata` so re-running the seed script after a manifest edit refreshes the editorial layer without re-embedding. New typed manifest `scripts/public-library-manifest.ts` + bulk ingester `scripts/seed-public-corpus.ts` (reuses `extractFromFile` from D-031 for PDF/DOCX/TXT/MD). `npm run seed-public-corpus` wired up. New `corpus/public-library/` working dir (gitignored). New `docs/PUBLIC_CORPUS_LICENSING.md` legal audit trail with four-bucket policy, verbatim licence templates, permission-emails section, and per-document log. Editorial discipline: curator notes are Aaron's voice, never bot-generated.
- **D-045 — Commercial-safety guardrail on the public corpus** (2026-05-15): Aaron's worry — "I'll forget to exclude NC content at the commercial pivot." Built the gate at the SQL boundary, not the checklist. Migration 0014 adds a generated column `commercial_use_blocked` computed from the licence enum (blocked: null, `unknown`, `cc-by-nc-4.0`, `cc-by-nc-sa-4.0`, `permission-licensed`). Retrieval-time filter in `src/lib/rag/retrieval.ts` drops blocked-document chunks when `PREMISE_COMMERCIAL_MODE=true`. Three helpers in `src/lib/db/commercial-safety.ts`. New audit script `npm run audit-public-corpus` partitions the public library into SAFE vs BLOCKED with grouped reasons and explicit unblocking instructions. Default: env var off, every existing deploy unaffected; setting it is the act of "going commercial" so the filter can't be forgotten. Same pattern as D-016 (confidentiality at SQL boundary).
- **Next**: (a) dogfood Premise on a real client research project — highest portfolio leverage; (b) stop building, write the story (LinkedIn post, portfolio page, cold-email copy); (c) tackle the deferred items if a real wave surfaces them (skip logic from R-5, judge-based eval probes, streaming D-7).

## What NOT to do

- Do not introduce LangChain, LlamaIndex, or any "agent framework."
- Do not default to Sonnet on routine work; that blows the budget.
- Do not relax the strict-abstention pipeline to "be more helpful." Helpful is a UX problem to solve at the UI/options layer, not by softening the citation guarantee.
- Do not write user-facing documentation (READMEs, marketing copy) without Aaron's voice — those are his to own.
- Do not run destructive git operations (`git reset --hard`, force-push to main, etc.) without explicit confirmation.
