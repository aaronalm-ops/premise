# Premise

> Every research project starts with one.

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
