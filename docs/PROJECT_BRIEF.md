# Premise — Project Brief

> **Purpose of this doc.** A self-contained brief you can paste into any LLM chat (Claude, ChatGPT, Gemini, Cursor, etc.) to bring it up to speed on Premise in under five minutes. Optimised for density and structure over prose flow.

## What Premise is

An AI co-pilot for market and consumer insights researchers. It walks the researcher through the full project lifecycle — **brief → hypotheses → questionnaire (with persona recommendations and question variants) → analysis → story angles** — and grounds every step in the researcher's prior work via strict-mode RAG.

The wedge: existing AI tools either replace the researcher's judgment (wrong) or give them ChatGPT-flavoured platitudes with no memory of their last 100 client studies. Premise does neither. It widens the option space and remembers everything.

## The owner

Aaron — Researcher / Analyst transitioning to AI Product Manager. This is his first AI project, built as a portfolio piece *and* a case-study-shaped commercial product. Background: Market/Consumer Insights research; aspiring vibe coder; no prior AI engineering.

## The principle (load-bearing)

> **The chatbot proposes. The researcher disposes.**

Every output is 3–5 ranked options with rationale, never a single auto-decision. Researcher instinct + project context beats model judgment for these decisions, every time. Hallucination and confidently-wrong outputs are the failure mode the product is engineered against.

## Architecture at a glance

```
[Researcher]
   │
   ▼
[Canvas UI: chat ↔ artefacts pane]   (Next.js 15 + TS + Tailwind v4)
   │
   ├──► [Anthropic Claude]   Haiku 4.5 default; Sonnet 4.6 for synthesis
   │     └─ Tool-use with forced JSON schema for strict-output generation
   │
   ├──► [Supabase Postgres + pgvector]   projects, documents, chunks
   │     └─ match_chunks RPC enforces project-scoped retrieval at SQL layer
   │
   └──► [Voyage AI voyage-3]   1024-dim embeddings for retrieval
```

## Strict-mode RAG pipeline (the heart of the product)

```
question
  │
  ▼
embed query (Voyage, "query" mode)
  │
  ▼
match_chunks(top-12, project_id)   ← confidentiality enforced here
  │
  ▼
Haiku rerank → top-5 actually relevant
  │
  ▼
Sonnet generate w/ forced tool_use schema   { claims: [{text, citation_ids[], confidence}], unanswered_aspects: [] }
  │
  ▼
Haiku per-claim verifier   (drops, never rewrites, unsupported claims)
  │
  ▼
{ claims, unanswered_aspects, retrieved_chunks, used_chunk_ids }
```

**Strict abstention is enforced in three layers**, not via prompting alone:
1. **Schema** — Anthropic tool_use forces every claim to have non-empty `citation_ids`.
2. **Verifier** — a second Haiku pass per claim; failures dropped, not rewritten.
3. **UI gate** — refuses to render any claim without a citation (Phase 1.5).

## Locked decisions (one-line each, see docs/DECISIONS.md for full rationale)

- **D-001** Anthropic Claude over OpenAI/Gemini/Llama — model personality matches "no fabrication" promise.
- **D-002** Haiku-default, Sonnet-on-escalation, never Opus — staffing-as-cost-decision.
- **D-003** Anthropic prompt caching aggressively — ~9× cost reduction on repeated input.
- **D-004** RAG is the moat — private corpus + retrieval is the differentiator.
- **D-005** Voyage `voyage-3` for embeddings — Anthropic-recommended, cheap.
- **D-006** Postgres + pgvector, not Pinecone — don't operate a tool you don't need.
- **D-007** Supabase, not raw Postgres — managed services for boring infra.
- **D-008** Next.js everywhere, not Python+React split — match stack to solo maintainer.
- **D-009** Direct SDK calls, no LangChain — frameworks hide the surface where differentiation lives.
- **D-010** Strict abstention via schema + verifier + UI gate — structural enforcement over prompting.
- **D-011** Build RAG first — sequence by risk, not user-flow order.
- **D-012** Hand-write the scaffold, not `create-next-app` — for learn-as-you-build value.
- **D-013** `/api/health` first endpoint — observability before features.
- **D-014** Product named "Premise" — every research project starts with one.
- **D-015** Paragraph-aware chunking, ~300 tokens per chunk — boring infrastructure compounds.
- **D-016** Confidentiality at the SQL boundary — guarantees are properties of the system, not the code.
- **D-017** RLS on by default — set safe defaults before there are users to protect.

## Build state (as of 2026-04-29)

- **Phase 0 — scaffolding**: shipped. Next.js + Supabase + Anthropic + Voyage wired; canvas shell renders; `/api/health` validates env.
- **Phase 1 — strict-mode RAG core**: shipped. Schema applied; ingestion CLI works; `/api/ask` endpoint returns structured cited answers or honest abstentions.
- **Phase 1.5 — UI integration + eval harness**: next. Wire chat pane to `/api/ask`; render claims with citation chips; build golden Q&A / hallucination / abstention probes.
- **Phase 2** — Hypothesis generation from brief. **Phase 3** — Questionnaire + personas + question variants. **Phase 4** — Analysis (quant + qual). **Phase 5** — Story angles. **Phase 6** — Polish + dogfood on a real client project.

## Files to read for deeper context

- [README.md](../README.md) — run instructions, repo layout, current scripts
- [CLAUDE.md](../CLAUDE.md) — the operating manual; conventions, non-negotiables, what-not-to-do
- [docs/DECISIONS.md](DECISIONS.md) — every choice in plain language with researcher-world analogies; **the source of truth for *why***
- [docs/CASE_STUDY.md](CASE_STUDY.md) — running portfolio narrative
- [docs/ROADMAP.md](ROADMAP.md) — phased plan with hard exit criteria
- [src/lib/prompts/strict-rag.ts](../src/lib/prompts/strict-rag.ts) — every word is load-bearing for the no-hallucination guarantee

## Constraints to honour when continuing

- **Budget**: <$5/month while building. Default to Haiku; escalate explicitly. Cache repeated input.
- **Stack stability**: do not introduce LangChain, LlamaIndex, or agent frameworks. Direct SDK only.
- **Voice**: every new decision gets a DECISIONS.md entry with story, analogy, PM lesson, failure mode.
- **Confidentiality**: any retrieval path must be project-scoped at the SQL layer.
- **Aaron's learning goal**: he is an aspiring AI PM on his first AI project. Explanations should lead with researcher-world analogies, not specs.

## How to use this brief

Paste into a fresh chat. Then ask any question about Premise — the LLM should now have full context on what it is, who's building it, what's locked, and what's next.
