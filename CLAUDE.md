# CLAUDE.md — operating manual for Premise

This file is auto-loaded by Claude Code when working in this repo. Read it before doing anything substantive.

## What this is

**Premise** is an AI co-pilot for market and consumer insights researchers. End-to-end workflow: brief → hypotheses → questionnaire (with persona recommendations and question variants) → analysis → story angles, grounded in the researcher's historical work via strict-mode RAG.

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
  - **Survey export** (D-022) — markdown / Qualtrics / plaintext. Buttons in Questionnaire artefact, endpoint at `/api/briefs/[id]/export`. Closes R-4 / U-3.
  - **Cost telemetry** (D-023) — `api_calls` table, `tracedMessagesCreate` + `recordVoyage` helpers, `/api/projects/[id]/costs` rollup, live cost badge in canvas header. Closes L-7 / P-3.
  - **Edit affordance** (D-024) — inline edit on hypothesis statement / expected_direction / confirmation_criteria, and on each question variant's statement. Closes U-4.
- **Next**: Tier 2 of the audit queue — engineering hygiene (project creation in UI, retry logic, DB transactions, idempotency, error message safety, Zod validation). Or move to Phase 4 (analysis). Aaron's call.

## What NOT to do

- Do not introduce LangChain, LlamaIndex, or any "agent framework."
- Do not default to Sonnet on routine work; that blows the budget.
- Do not relax the strict-abstention pipeline to "be more helpful." Helpful is a UX problem to solve at the UI/options layer, not by softening the citation guarantee.
- Do not write user-facing documentation (READMEs, marketing copy) without Aaron's voice — those are his to own.
- Do not run destructive git operations (`git reset --hard`, force-push to main, etc.) without explicit confirmation.
