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
2. **Calibrated provenance.** Two pieces (D-055).
   - **Chat pane (left)** — strict abstention to the corpus. Q&A against the corpus must cite chunks; if the corpus doesn't cover the question, the bot says so. The "Premise refuses to fabricate" floor lives here, untouched.
   - **Right-pane artefacts** — corpus is *inspiration, not a fence*. Every right-pane claim self-reports a `provenance` tier so the researcher always knows the source. Hypotheses + personas: corpus-grounded / corpus-inspired / general-knowledge. Analysis verdicts: data-grounded / data-extrapolated / general-knowledge. Recommendations + story angles inherit grounding via the evidence chain (must cite hypothesis/pattern IDs) and don't carry their own provenance — they're creative synthesis from already-vetted inputs.
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
| Analytics | Vercel Web Analytics (2026-05-19) — `@vercel/analytics/next` `<Analytics />` mounted in [src/app/layout.tsx](src/app/layout.tsx). Free-tier, zero-config; captures page views + visitors on the deployed site. |
| Scripts | `tsx` with `--env-file=.env.local` |

## Where things live

- [docs/DECISIONS.md](docs/DECISIONS.md) — **canonical decision log** (D-001 through D-055). Source of truth for *why*. Read before challenging any choice.
- [docs/CASE_STUDY.md](docs/CASE_STUDY.md) — running portfolio narrative in Aaron's voice.
- [docs/ROADMAP.md](docs/ROADMAP.md) — phased plan with hard exit criteria per phase.
- [docs/PROJECT_BRIEF.md](docs/PROJECT_BRIEF.md) — dense self-contained brief for handing off to another chat.
- [docs/PORTFOLIO.md](docs/PORTFOLIO.md) — portfolio-ready copy in multiple lengths.
- [docs/EVALUATION_LOG.md](docs/EVALUATION_LOG.md) — eval-harness baselines, audit logs, dogfood findings.
- [docs/TASKFORCE_CRITIQUE.md](docs/TASKFORCE_CRITIQUE.md) — Audit #2 taskforce critique log (D-038 through D-043).
- [docs/PUBLIC_CORPUS_TASKFORCE.md](docs/PUBLIC_CORPUS_TASKFORCE.md), [docs/PUBLIC_CORPUS_LICENSING.md](docs/PUBLIC_CORPUS_LICENSING.md), [docs/PUBLIC_CORPUS_SHOPPING_LIST.md](docs/PUBLIC_CORPUS_SHOPPING_LIST.md) — public-corpus curation discipline.
- [docs/NEXT_DUCKDB.md](docs/NEXT_DUCKDB.md) — planning doc for the deferred DuckDB-as-tool capability (next-session scaffold).
- [src/lib/rag/](src/lib/rag/) — chunking, embeddings, retrieval, reranker, generation, verification, pipeline. Key modules:
  - `hypothesis-generator.ts`, `persona-generator.ts`, `question-generator.ts`, `analysis-generator.ts`, `recommendation-generator.ts`, `story-generator.ts` — the six generators.
  - `consistency-checks.ts` (D-050, D-055-footnote) — independent Sonnet verifiers: `rectifyVerdicts`, `rectifyRecommendations`, `rectifyHypothesisProvenance`, `rectifyPersonaProvenance`.
  - `scope-detector.ts`, `corpus-skew.ts` (D-049) — brief-scope detection + project-corpus skew for the clarifier flow.
- [src/lib/prompts/](src/lib/prompts/) — system prompts. Every word here is load-bearing for strict abstention (chat) and provenance discipline (right-pane artefacts).
- [src/components/canvas/](src/components/canvas/) — UI surfaces:
  - `canvas-shell.tsx`, `projects-home.tsx` (D-054) — root layout + two-state home page.
  - `chat-pane.tsx`, `artefacts-pane.tsx` — left + right panes.
  - `brief-artefact.tsx`, `scope-clarifier.tsx` (D-049), `hypotheses-artefact.tsx`, `personas-artefact.tsx`, `questions-artefact.tsx`, `analysis-artefact.tsx`, `recommendations-artefact.tsx`, `stories-artefact.tsx` — per-stage artefact cards.
  - `new-project-modal.tsx` (D-054, redesigned) — 3-option corpus selector.
  - `grounding-disclosure.tsx` (D-038), `cost-badge.tsx` (D-023), `account-menu.tsx`, `premise-mark.tsx`, `project-switcher.tsx`, `public-libraries-section.tsx` (D-047), `documents-artefact.tsx`.
- [supabase/migrations/](supabase/migrations/) — schema + RPC functions. Latest: 0016 (brief scope), 0017 (recommendation action-class), 0018 (provenance columns).
- [scripts/](scripts/) — CLIs: `create-project`, `ingest`, `diagnose`, `seed-public-library`, `seed-public-corpus`, `audit-public-corpus`, `audit-public-corpus-regions` (D-049 follow-up).
- [evals/](evals/) — eval harness. 14 probe types as of D-055. Runners: golden-qa, abstention, hallucination, hypothesis-quality, persona-quality, confidentiality, citation-accuracy (D-042), hypothesis-judge, persona-judge, recommendation-judge, story-angle-judge, variant-judge, prompt-injection (all D-046), scope-discipline (D-049), provenance-honesty (D-055).

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
cp .env.local.example .env.local                # then fill in 5 keys
npm run diagnose                                # verifies env + pings each service
npm run dev                                     # http://localhost:3000
npm run typecheck                               # tsc --noEmit
npm run create-project -- "Name" client-confidential "Description"
npm run ingest -- <projectId> ./file.txt        # .txt, .md, .pdf, .docx, or URL
curl -s -X POST localhost:3000/api/ask -H 'Content-Type: application/json' \
  -d '{"projectId":"<id>","question":"..."}' | jq

# Public-corpus
npm run seed-public-corpus                      # bulk-ingest from scripts/public-library-manifest.ts
npm run audit-public-corpus                     # SAFE vs BLOCKED partition (commercial-safety)
npm run audit-public-corpus-regions             # geography distribution (D-049 follow-up)

# Eval harness
npm run eval                                    # full pass (14 probe types)
npm run eval -- --type=scope-discipline         # one type (D-049)
npm run eval -- --type=provenance-honesty       # D-055 — labelling honesty
npm run eval:setup                              # provision projects + ingest fixtures
npm run eval:reset                              # discard config to start fresh
```

## Current build state (last updated 2026-05-19)

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
- **D-046 — Closing the deferred audit items: judge probes + adversarial probes** (2026-05-15): Six new probe types wired through `evals/lib/types.ts`, `evals/cli.ts`, and `evals/runners/*.ts`. `hypothesis-judge` (R-1), `persona-judge` (R-2), `recommendation-judge` (E-2), `story-angle-judge` (E-1), `variant-judge` (E-3), `prompt-injection` (E-4). Shared `judgeWithSonnet` primitive in `evals/lib/judge.ts` returns 1-5 scores per rubric dimension via forced tool_use. Synth helper in `evals/lib/synth.ts` casts compact JSON-fixture payloads into typed `Hypothesis` / `Persona` / `Analysis` / `Recommendation` shapes so deep-chain probes don't need a real upstream pipeline. Twelve fixtures across the six types. EVALUATION_LOG.md tabulates the new probe-set total and per-type baseline thresholds. D-7 (streaming), R-5 (skip logic), E-5 (model-regression) remain deferred — original rationale holds.
- **D-047 — Public library is read-only and opt-in per project** (2026-05-15): Aaron flagged DELETE buttons on shared public-library documents and silent auto-inclusion in every project's retrieval. Migration 0015 adds `include_public_libraries boolean default false` to `projects`, backfills existing rows to `true` for grandfather behaviour. Retrieval ([src/lib/rag/retrieval.ts](src/lib/rag/retrieval.ts)) short-circuits `getPublicLibraryIds()` when the flag is off — same SQL-boundary pattern as D-016/D-045. UI ([documents-artefact.tsx](src/components/canvas/documents-artefact.tsx)) hides Upload / URL-fetch / DELETE when viewing a public project (`is_public=true`); [PublicLibrariesSection](src/components/canvas/public-libraries-section.tsx) drops the inline doc-list expansion and becomes a one-line opt-in toggle. New PATCH on `/api/projects/[id]` accepts `include_public_libraries: boolean` and refuses to mutate public projects. GET on the same route returns the project record.
- **D-048 — Optimistic accept/reject (closes D-8)** (2026-05-15): parent-level override map in `HypothesesArtefact` — cards call `applyOptimistic(id, { status })` before the PATCH; bucketing recomputes; the card moves on the next render frame. `onSettled(id)` refreshes from server and clears the override. Pattern is small and contained (a `useState` + a merged `effective` list); ready to copy to personas / recommendations cards if their accept-volume warrants it. Closes the deferred D-8 with the rationale that the deferral was correct at the time but the marginal cost has dropped now that the rest of the queue is cleared.
- **Dogfood audit — ASEAN travel synthetic survey** (2026-05-18, see [docs/EVALUATION_LOG.md](docs/EVALUATION_LOG.md)): Aaron ran a region-neutral generational-travel brief through the full pipeline using a 10,000-row simulated CSV. Surfaced five failure classes, drove five decisions in one session:
- **D-049 — Scope is set by the brief, not the corpus** (2026-05-18): a region-neutral brief was producing region-locked hypotheses because the hypothesis generator inherited not just *content* but *scope* from retrieved chunks. Two-layer fix: Layer 1 — brief-scope clarifier (Haiku detects which axes the brief specifies + project-corpus skew check; UI surfaces a clarifier card when both conditions hit). Layer 2 — prompt-level scope-from-brief discipline + `scope_inherited_from` audit field with amber tag when value is `corpus` or `model_default`. Migration 0016 adds the brief columns + redefines `replace_proposed_hypotheses`. New eval probe type `scope-discipline` with 2 fixtures. Public library is *not* checked for skew (assumed global-by-curation).
- **D-050 — Verdict-direction-check + action/caveat consistency-check** (2026-05-18): H10 carried verdict `confirmed` for "Gen Z outspend Millennials" while the prose said the opposite. H8 wrote "leans Gen Z" then "43% < 48% — favours Millennials" in one paragraph. A recommendation said "shift budgets" while its own caveats said it'd tank GMV. New `consistency-checks.ts` runs an independent Sonnet pass after analysis + recommendation generation. Mismatched verdicts get auto-corrected with a `[Direction check]` caveat; undermined recommendations get confidence-downgraded with a `[Consistency check]` caveat. Same pattern as D-042's citation-accuracy.
- **D-051 — Recommendation action-class constraint** (2026-05-18): a BNPL "introduce credit caps within the current product cycle" recommendation from stated-preference survey data. Risk teams move on transactional ledgers, not surveys. Added action-class ladder to the recommendation prompt + new `requires_behavioral_validation: boolean` tool field. When true, server-side caps confidence at "medium". UI renders amber chip "Validate against behavioural data". Migration 0017 adds the column.
- **D-052 — Story-angle audience precision** (2026-05-18): the "Travel Avidity Myth" angle bundled insights leads + research agencies + tourism boards in a single `target_audience` field — inheriting the commercial viability of its most reluctant buyer (tourism boards). Two prompt rules: `target_audience` names ONE buyer + ONE job-to-be-done (not a list); debunk/negation ledes must target audiences whose budget is *unlocked* by the correction (methodologists, risk committees, regulators), not growth-stage commercial buyers. `story-gen` v4-2026-05-18.
- **D-053 — Honest CSV framing in the analyser** (2026-05-18): the analyser repeatedly said "only ~528 rows visible" of a 10k-row CSV — that's mechanical (80k char budget vs 1.5MB CSV ≈ 5.3%). Premise was honestly reading the truncated extract but the framing wasn't there. Added a CSV-framing section to the analysis prompt + inline user-prompt notice when `source_type=csv` is in scope + amber UI callout on the analysis artefact. Counts/percentages cited from the extract are illustrative, not population estimates; significance claims must be `inconclusive` with the missing-test caveat named.
- **D-054 — Home-page redesign + 3-option reference-materials flow** (2026-05-18): elite taskforce convened (UX designer, insights workflow researcher, activation PM, conversational AI designer, research director). Two-state home: empty (splash + CTA) vs populated (project grid + "+ New Project"). New `ProjectsHome` component shown when no project is selected. New-project modal redesigned with three fields (name, brief textarea, 3-option corpus selector: public-only / own-only / own-plus-public) — chains project-create → patch include_public_libraries → optional brief-create. Logo in header is now a "back to projects" button. Confidentiality dropped from the modal (defaults to client-confidential) — reduces activation friction.
- **D-055 — Corpus is inspiration, not a fence** (2026-05-18, taskforce-driven): The dogfood caught D-049 over-applying the strict-abstention floor. A region-neutral brief on a public-only project produced zero hypotheses — the corpus had no on-topic chunks and the chassis refused to help. Aaron's reframe: **strict abstention is for the chat pane only; the right pane uses provenance**. Five voices (Marcus / Dr. Riya / James / Sam / Devi) converged: keep the floor where claims are load-bearing (Q&A), use provenance labels where artefacts are proposals. Hypotheses + personas now carry `corpus-grounded` / `corpus-inspired` / `general-knowledge`; analysis verdicts carry `data-grounded` / `data-extrapolated` / `general-knowledge`. Recommendations + story angles unchanged — their grounding is the evidence-chain (must cite hypothesis IDs). Strict-citation filter removed from hypothesis-gen + persona-gen. New three-tier chips on every right-pane card; analysis verdicts marked `general-knowledge` render a prominent banner. Migration 0018 adds provenance columns + redefines RPCs. CLAUDE.md non-negotiable #2 rewritten. Prompt versions: hypothesis-gen v4, persona-gen v4, analysis-gen v3.
- **Provenance-honesty eval probe** (2026-05-18, D-055-g): new probe type wired through `evals/lib/types.ts` + `evals/cli.ts` + `evals/runners/provenance-honesty.ts`. Two fixtures (corpus-partial-coverage on AI-tooling, corpus-silent on B2B-SaaS-pricing). Independent Sonnet auditor returns `agrees` / `off-by-one` / `wrong` / `falsely-grounded` per draft. Threshold: `min_agreement_rate: 0.7`, `no_false_grounding: true`. Same pattern as D-042 citation-accuracy.
- **D-055 footnote 1 — Runtime provenance rectifier** (2026-05-19): the first run of the `provenance-honesty` probe caught the model citing methodology paragraphs as if they grounded substantive findings claims — three falsely-grounded labels on probe 001 and one on probe 002. The chassis's empty-citation downgrade couldn't catch present-but-irrelevant citations. New `rectifyHypothesisProvenance` + `rectifyPersonaProvenance` in [src/lib/rag/consistency-checks.ts](src/lib/rag/consistency-checks.ts): one batched Sonnet pass per generation classifies each cited draft as `supports` / `topic-match-only` / `no-citations`; topic-match-only drafts get auto-downgraded to `general-knowledge` with citations stripped. Prompts gained explicit anti-example (methodology-paragraph-is-not-support). Prompts bumped to `v4.1-2026-05-19`. New endpoint `provenance-audit` at `v1-2026-05-19`. **Pattern named**: hard-schema-generate + soft-second-pass-verify is now the load-bearing pattern of Premise's right-pane integrity (D-042, D-050, D-055 all use it).
- **Vercel Web Analytics** (2026-05-19): installed `@vercel/analytics`; `<Analytics />` component mounted in [src/app/layout.tsx](src/app/layout.tsx) inside `<body>` per the App Router pattern. Vercel Agent generated a parallel PR; local working tree updated directly so the code is consistent regardless of merge order. Free-tier; captures page views + visitor counts on the live deployment.
- **Next**: (a) Aaron applies migrations 0016 + 0017 + 0018 to Supabase, restarts the dev server, re-runs the same ASEAN brief through the post-fix pipeline, fills in the before/after section in [docs/EVALUATION_LOG.md](docs/EVALUATION_LOG.md); (b) re-run `npm run eval -- --type=provenance-honesty` to verify the rectifier closes the falsely-grounded failures; (c) public-library global-curation audit via `npm run audit-public-corpus-regions` — verify the 66-doc public library is regionally balanced enough to be assumed global-by-curation, or rebalance; (d) DuckDB-as-tool: own decision entry, capability extension for tabular data (planning doc at [docs/NEXT_DUCKDB.md](docs/NEXT_DUCKDB.md)); (e) deferred items still standing: D-7 streaming, R-5 skip logic, E-5 model-regression — original rationale holds.

## Migrations to apply (in order)

When Aaron's Supabase project lags behind the local migrations folder, apply these in numerical order via Supabase Dashboard → SQL Editor → New Query → paste → Run. Each is idempotent and safe to re-run.

| File | Decision | What it does |
|---|---|---|
| 0001–0015 | D-001 through D-047 | Foundational schema, RLS, telemetry, auth, story-angles, recommendations, public-corpus metadata, commercial-safety, public-library opt-in. |
| `0016_brief_scope_discipline.sql` | D-049 | Adds `scope_dimensions`, `scope_corpus_skew`, `scope_clarifications`, `scope_clarifier_status` columns to `briefs`. Adds `scope_inherited_from` column to `hypotheses`. Redefines `replace_proposed_hypotheses`. |
| `0017_recommendation_action_class.sql` | D-051 | Adds `requires_behavioral_validation boolean` column to `recommendations`. Redefines `replace_proposed_recommendations`. |
| `0018_provenance.sql` | D-055 | Adds `provenance` column to `hypotheses` + `personas`. Redefines both `replace_proposed_*` RPCs. Analysis verdict provenance lives in the existing `hypothesis_verdicts` jsonb — no DB column needed. |

## Prompt versions (load-bearing for telemetry + regression diff)

The `prompt_version` field on every recorded API call lets us diff behaviour across prompt revisions. Current versions in [src/lib/llm/prompt-versions.ts](src/lib/llm/prompt-versions.ts):

| Endpoint | Version | Last touched |
|---|---|---|
| rag-draft | v3-2026-05-01 | D-010 / strict-RAG |
| rag-verify | v2-2026-05-01 | D-035 batched verifier |
| rerank | v2-2026-05-01 | D-035 tool-use rerank |
| hypothesis-gen | v4.1-2026-05-19 | D-055 footnote: anti-example + rectifier |
| persona-gen | v4.1-2026-05-19 | D-055 footnote: anti-example + rectifier |
| question-gen | v4-2026-05-14 | D-040 is_recommended |
| analysis-gen | v3-2026-05-18 | D-055 verdict provenance |
| recommendation-gen | v2-2026-05-18 | D-051 action-class constraint |
| story-gen | v4-2026-05-18 | D-052 audience precision |
| story-outline | v1-2026-05-01 | initial |
| scope-detect | v1-2026-05-18 | D-049 Haiku |
| corpus-skew | v1-2026-05-18 | D-049 Haiku |
| verdict-direction-check | v1-2026-05-18 | D-050 |
| action-consistency-check | v1-2026-05-18 | D-050 |
| provenance-audit | v1-2026-05-19 | D-055 footnote |
| embed-doc / embed-query | voyage-3 | — |

## What NOT to do

- Do not introduce LangChain, LlamaIndex, or any "agent framework."
- Do not default to Sonnet on routine work; that blows the budget.
- Do not relax the strict-abstention pipeline to "be more helpful." Helpful is a UX problem to solve at the UI/options layer, not by softening the citation guarantee.
- Do not write user-facing documentation (READMEs, marketing copy) without Aaron's voice — those are his to own.
- Do not run destructive git operations (`git reset --hard`, force-push to main, etc.) without explicit confirmation.
