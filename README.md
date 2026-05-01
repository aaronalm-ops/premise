# Premise

> Every research project starts with one.

**Live demo:** [premise-one.vercel.app](https://premise-one.vercel.app/) (private-share — request access)
**Repo:** [github.com/aaronalm-ops/premise](https://github.com/aaronalm-ops/premise)

An AI co-pilot for market and consumer insights researchers. It walks you through the full research lifecycle: **brief → hypotheses → questionnaire (with persona recommendations & question variants) → data analysis → story angles**, and grounds every step in your historical research via strict, citation-only RAG.

> **Status:** Phase 0 (foundations). Stack chosen, scaffold not yet built. See [docs/ROADMAP.md](docs/ROADMAP.md).

> **Owner:** Aaron — Researcher / Analyst transitioning to AI Product Manager. This repo is both a portfolio piece *and* an in-progress commercial product. The build itself is the case study.
>
> Two companion docs:
> - [docs/DECISIONS.md](docs/DECISIONS.md) — every choice explained in plain language, with stories. Read this first.
> - [docs/CASE_STUDY.md](docs/CASE_STUDY.md) — the running portfolio narrative on architecture, costs, and learnings.

## The core principle

**The chatbot proposes, the researcher disposes.** Every output is options/variants. The researcher selects based on expertise and instinct. The bot's job is to widen the option space, not to pick.

## Why "strict mode" matters

The RAG layer enforces **zero fabrication**. Every claim must cite a source chunk; if the corpus doesn't support an answer, the bot says so explicitly. This is the single most important behavioural commitment of the product.

## Stack (locked v0)

| Layer | Choice | Why |
|---|---|---|
| App framework | Next.js 15 (App Router) + TypeScript | One language end-to-end, canvas UI, free Vercel deploy |
| UI primitives | Tailwind + shadcn/ui | Fast canvas-style layouts, accessible defaults |
| Database + vectors | Supabase Postgres with pgvector | Free tier, app data + embeddings in one place |
| LLM | Anthropic Claude (Haiku 4.5 default, Sonnet 4.6 for synthesis) | Cost-aware routing, prompt caching for ~90% input savings |
| Embeddings | Voyage AI `voyage-3` | Anthropic-recommended, ~$0.06/M tokens |
| Hosting | Vercel | Free tier, zero-config Next.js |

Detailed rationale, cost model, and confidentiality posture: [docs/CASE_STUDY.md](docs/CASE_STUDY.md).

## Running locally

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment variables
```bash
cp .env.local.example .env.local
```
Then edit `.env.local` and fill in the five values:

| Variable | Where to get it |
|---|---|
| `ANTHROPIC_API_KEY` | https://console.anthropic.com/settings/keys |
| `VOYAGE_API_KEY` | https://www.voyageai.com/ (free tier covers 200M tokens) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project Settings → API (server-only) |

Until you fill these in, the app will still build and run, but any feature that calls Claude/Supabase will throw a friendly "missing env var" error.

### 3. Start the dev server
```bash
npm run dev
```
Open http://localhost:3000 — you'll see the empty canvas (chat pane left, artefacts pane right).

### 4. Check env wiring
```bash
curl http://localhost:3000/api/health
```
Returns JSON with `ok: true` once all five env vars are set. This is your "is everything plugged in?" canary.

### Useful scripts
- `npm run dev` — dev server with Turbopack
- `npm run build` — production build (catches type errors)
- `npm run typecheck` — type check without building
- `npm run create-project -- "Name" [confidentiality] [description]` — create a project from CLI
- `npm run ingest -- <projectId> <filePath> [title]` — ingest a `.txt` or `.md` file into a project's corpus

## Phase 1 — Strict-mode RAG (current)

The strict-mode RAG pipeline is the heart of Premise. It's wired and ready — three setup steps, then you can drop a doc in and ask a question.

### Step 1 — Apply the database schema

In your Supabase project: **SQL Editor → New Query → paste the contents of [`supabase/migrations/0001_initial_schema.sql`](supabase/migrations/0001_initial_schema.sql) → Run**.

This creates the `projects`, `documents`, `chunks` tables, the HNSW index for fast vector search, and the `match_chunks` retrieval function. It's idempotent — safe to re-run.

### Step 2 — Create a project

```bash
npm run create-project -- "Pilot project" client-confidential "Test corpus for Phase 1 dogfooding"
```

You'll get back a project id (UUID). Copy it.

### Step 3 — Ingest a document

Drop a `.txt` or `.md` file somewhere on disk (any research doc, a prior transcript, a deck transcribed to text — whatever you have handy for testing). Then:

```bash
npm run ingest -- <projectId> ./path/to/your-file.txt "Optional title"
```

You'll see chunk count, embedding tokens used, and the estimated cost (usually well under a cent for a typical doc).

### Step 4 — Ask a question

Start the dev server (`npm run dev`), then in another terminal:

```bash
curl -s -X POST http://localhost:3000/api/ask \
  -H "Content-Type: application/json" \
  -d '{"projectId":"<projectId>","question":"What does the corpus say about X?"}' | jq
```

You'll get back a JSON response with shape:
```json
{
  "question": "...",
  "answer": {
    "claims": [{ "text": "...", "citation_ids": ["..."], "confidence": "high" }],
    "unanswered_aspects": ["..."]
  },
  "retrieved_chunks": [...],
  "used_chunk_ids": [...]
}
```

If the corpus doesn't support an answer, `claims` will be empty and `unanswered_aspects` will explain what's missing. **This is the correct behaviour** — it's how you know the strict-abstention guarantee is real (D-010).

### What runs under the hood

```
question
   │
   ▼
[Voyage] embed query   (input_type: "query")
   │
   ▼
[Postgres] match_chunks(top-12, project_id)   (D-016 — SQL-bounded confidentiality)
   │
   ▼
[Haiku] rerank → top-5 actually relevant
   │
   ▼
[Sonnet] generate with forced tool_use schema (D-010)
   │   schema enforces: every claim has citation_ids
   ▼
[Haiku] verify each claim against its cited chunks
   │   unsupported claims dropped (not rewritten)
   ▼
{ claims, unanswered_aspects, retrieved_chunks }
```

See [docs/DECISIONS.md](docs/DECISIONS.md) D-001 through D-018 for plain-language rationale on every choice above.

## Phase 2 — Hypothesis generation

Once Phase 1 RAG is working, you can generate hypotheses from a brief.

### Step 1 — Apply the Phase 2 schema

In Supabase: **SQL Editor → New Query → paste [`supabase/migrations/0002_phase2_briefs_hypotheses.sql`](supabase/migrations/0002_phase2_briefs_hypotheses.sql) → Run**. Adds `briefs` and `hypotheses` tables.

### Step 2 — Use the canvas (no CLI needed)

Reload the dev server, pick your project from the dropdown. The right pane now has a **Brief** section and a **Hypotheses** section.

1. Type or paste your research brief in the Brief textarea, give it an optional title, click **Create brief**.
2. Click **Generate hypotheses**. Premise retrieves from your corpus, drafts 5–7 ranked hypotheses, and persists them as `proposed`.
3. For each hypothesis: hit **Accept** (it survives regenerate) or **Reject** (also survives regenerate; resurface with **Reset**). Click **details** on a card to see assumptions, expected direction, confirmation criteria, and supporting/contradicting citation chips.
4. Hit **Regenerate proposed** to draft fresh candidates without disturbing your accepted/rejected decisions.

### What's enforced at the schema level

Every hypothesis must cite at least one supporting OR contradicting chunk from the corpus — the LLM tool_use schema rejects empty citation lists. Pure speculation cannot reach the database. See [D-018](docs/DECISIONS.md#d-018) for why this matters.

## Deploying to Vercel (production)

Premise is built to deploy to Vercel free tier with zero changes. The repo is public; the live URL is shared on a per-contact basis (no public broadcast — see [D-030](docs/DECISIONS.md) for the cost-burn rationale).

### Step 1 — Apply all schema migrations to Supabase

In Supabase SQL Editor, run each of these in order if you haven't already:

- `supabase/migrations/0001_initial_schema.sql`
- `supabase/migrations/0002_phase2_briefs_hypotheses.sql`
- `supabase/migrations/0003_phase3_personas_questions.sql`
- `supabase/migrations/0004_phase3_5_telemetry.sql`
- `supabase/migrations/0005_phase4_atomic_locks.sql`

Each is idempotent (safe to re-run). Click **Run and enable RLS** on the prompts.

### Step 2 — Deploy via Vercel

1. Go to https://vercel.com and sign up with GitHub (or log in).
2. **New Project** → import `aaronalm-ops/premise`.
3. Framework preset auto-detects as **Next.js** — accept defaults.
4. **Environment Variables** — paste the same 5 keys from your `.env.local`:
   - `ANTHROPIC_API_KEY`
   - `VOYAGE_API_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. **Deploy**.

~90 seconds later you have a URL like `premise-xxxx.vercel.app`. The cost-protection layers ship with the deploy:
- `public/robots.txt` blocks search-engine crawling.
- Every API call is validated (Zod) and error-sanitised (D-025).
- Generation endpoints are locked against double-clicks (D-028).
- Every Anthropic + Voyage call records cost in `api_calls` (D-023).

### Step 3 — Smoke test

Open the deployed URL. Hit `/api/health` first — should return `ok: true` with all 5 env vars `configured: true`. Then create a project from the UI, ingest a doc, ask a question. Watch the cost badge climb in real time.

### Step 4 — Custom domain (optional)

Vercel project settings → **Domains** → add a custom domain. Free tier supports one. A subdomain on your existing portfolio domain (e.g. `premise.aaronalm.com`) is the cleanest version.

## Phase 3 — Personas and questionnaires with variants

The product-defining phase: the "options not answers" principle becomes a literal UI surface.

### Step 1 — Apply the Phase 3 schema

In Supabase: **SQL Editor → New Query → paste [`supabase/migrations/0003_phase3_personas_questions.sql`](supabase/migrations/0003_phase3_personas_questions.sql) → Run**. Adds `personas`, `questions`, `question_variants` tables.

### Step 2 — In the canvas, after you have at least one accepted hypothesis

The right pane now has a **Personas** section and a **Questionnaire** section.

1. **Recommend personas** — bot retrieves from corpus, generates 3-5 ranked personas. Each persona has an `under_represents` field calling out the sampling blind spot. Accept the ones that match the brief's audience.
2. **Draft questionnaire** — bot generates 4-8 questions tied to your accepted hypotheses. **Each question has 3 variants** from different methodological frames (neutral_direct / behavioural / projective / etc.).
3. For each question, the three variants are displayed side-by-side. Each card shows:
   - The variant type (Neutral, Leading, Projective, Behavioural, etc.)
   - The actual question statement
   - **What it elicits** — what THIS phrasing surfaces
   - **Caveat** — the bias or weakness it carries
4. Click a variant card to **select** it as the canonical phrasing for that question. Accept the question once you've picked a variant.

### Why three variants

The same question phrased three ways elicits three different things. A senior researcher's instinct knows which to pick; a junior or generic LLM doesn't. The bot's job is to widen the option space and surface the tradeoff — the researcher picks. See [D-019](docs/DECISIONS.md) for the full reasoning.

## Repo layout (planned)

```
research-ai-bot/
├── README.md
├── docs/
│   ├── CASE_STUDY.md        running case study + architecture + costs + prompting
│   └── ROADMAP.md           phased delivery plan
├── src/
│   ├── app/                 Next.js App Router
│   ├── components/          UI components (canvas panes, chat, artifacts)
│   ├── lib/
│   │   ├── llm/             Claude client, prompt-cache helpers, model routing
│   │   ├── rag/             ingestion, chunking, retrieval, citation enforcement
│   │   ├── prompts/         system prompts and prompt templates per stage
│   │   └── db/              Drizzle schema, Supabase client
│   └── server/              server actions / route handlers
├── evals/                   golden Q&A, hallucination probes, abstention tests
└── scripts/                 corpus ingestion CLI, eval runner
```
