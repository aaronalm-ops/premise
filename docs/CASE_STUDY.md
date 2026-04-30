# Premise — Case Study: Building an AI Research Co-pilot

> A running narrative of how this product is being built, the decisions made, and the AI Product Management lessons that fell out of them. Written in first-person as Aaron's perspective so it can double as a portfolio artefact.

---

## Chapter 1 — The Problem

I'm a Researcher and Analyst by trade. A typical Market/Consumer Insights project has the same shape every time:

1. A client brief lands (a question or a hypothesis to validate).
2. I write hypotheses I want to prove or disprove.
3. I design a questionnaire — choosing personas, choosing the *exact phrasing* of each question (because the same question worded differently produces different responses).
4. We field the survey.
5. I analyse the data — both the agreed hypotheses and emergent patterns.
6. I write up the story — finding the angle that lands with the target audience.

Steps 2–6 are where ~80% of my time goes, and ~50% of that time is mechanical: pulling prior research from old decks, re-typing similar questions, cross-tabbing variables I've cross-tabbed a hundred times before.

There are three reasons I haven't just used ChatGPT for this:
- **Hallucination.** A made-up stat in a client deck is a fireable offence.
- **Memory.** ChatGPT doesn't know my last 100 client studies.
- **Researcher's instinct.** Most AI tools try to *replace* the researcher's judgment. I want a tool that *widens* the option space and lets me pick.

So I'm building it.

## Chapter 2 — The Audience

Two audiences, in order:

1. **Me.** I want to run a real client project end-to-end through this and save 10 hours.
2. **Hiring managers evaluating me as an AI Product Manager.** This case study, the eval harness, and the cost model are the artefacts they'll look at.

If that goes well, audience 3 is **other Market/Consumer Insights researchers** — agencies, freelancers, in-house insights teams. The product surface stays the same; the deployment changes (multi-tenant, billing, SSO).

## Chapter 3 — The Core Design Principle

> **The chatbot proposes. The researcher disposes.**

Every screen surfaces 3–5 options with rationale, never one auto-decision. The bot's role is to *widen* my option space, not narrow it for me. Researcher instinct + project context beats model judgment on these decisions, every time.

Concretely this shows up as:
- Hypotheses come back as a ranked list of 5–7 with stated assumptions, expected effect direction, and what data would confirm/refute each.
- Questions come back as 3–4 *phrasings* per construct (neutral / leading / projective / behavioural / attitudinal) — because the *wording* changes what you measure.
- Analysis comes back with the agreed hypotheses checked first, then a separate "things you didn't ask about but the data is shouting at you" section.
- Story angles come back as 3–4 narrative framings with named target audiences and the headline each implies.

## Chapter 4 — The Architecture

### The shape

```
┌─────────────────────────────────────────────────────────────┐
│  Canvas UI (Next.js + shadcn)                               │
│  ┌────────────────┐  ┌──────────────────────────────────┐   │
│  │ Chat thread    │  │ Artefacts pane                   │   │
│  │ (researcher    │  │  - Brief                         │   │
│  │  ↔ co-pilot)   │  │  - Hypotheses (editable list)    │   │
│  │                │  │  - Questionnaire (with variants) │   │
│  │                │  │  - Personas                      │   │
│  │                │  │  - Analysis                      │   │
│  │                │  │  - Story angles                  │   │
│  └────────────────┘  └──────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────────┐
        ▼                    ▼                        ▼
   ┌──────────┐       ┌─────────────┐        ┌──────────────┐
   │  Claude  │       │  Postgres   │        │  Voyage      │
   │  Haiku/  │◄──────│  (Supabase) │◄───────│  embeddings  │
   │  Sonnet  │       │  + pgvector │        │  (voyage-3)  │
   └──────────┘       └─────────────┘        └──────────────┘
        ▲                    ▲
        │                    │
        └─── Strict-mode ─────┘
             RAG pipeline:
             retrieve → draft →
             verify-each-claim →
             cite or abstain
```

### Why this stack (not the others)

I considered four shapes before locking this one:

| Option | Why I rejected it |
|---|---|
| Streamlit + LangChain | Looks demo-y, weak for canvas UI, LangChain abstractions hide the prompts I most need to control. |
| Next.js + Pinecone + OpenAI | Two paid services, vendor lock-in, no real reason to leave the Anthropic ecosystem if I'm already on Claude for strict abstention. |
| Python FastAPI backend + React frontend | Two languages, two deploys, two CI configs — too much for an aspiring vibe coder solo. |
| **Next.js + Supabase + Claude + Voyage** | One language, one deploy, free tier all the way, scales to commercial without re-platforming. |

### What goes where

- **Next.js App Router** — UI + thin server actions. No separate backend to operate.
- **Supabase Postgres + pgvector** — every project, document, chunk, embedding, hypothesis, question, response, and analysis lives here. One DB, one backup.
- **Anthropic Claude** — all generation. Haiku 4.5 is the default; Sonnet 4.6 only for synthesis-heavy steps (final hypothesis pass, analysis writeup, story angles).
- **Voyage `voyage-3`** — embeddings for retrieval. Anthropic-recommended; cheap.
- **No vector DB SaaS, no LangChain, no agent framework.** Direct SDK calls only. We control the prompts, we control the budget.

### The strict-mode RAG pipeline

This is the most important code in the product. The flow:

1. **Retrieve** — top-k semantic chunks from pgvector (k=12), then a Haiku reranker prunes to top-5 actually relevant chunks.
2. **Draft** — Sonnet drafts an answer in **structured output mode** with this contract:
   ```ts
   {
     claims: Array<{
       text: string,
       citation_ids: string[],   // must reference retrieved chunks; empty array forbidden for factual claims
       confidence: "high" | "medium" | "low"
     }>,
     unanswered_aspects: string[]  // parts of the question the corpus could not support
   }
   ```
3. **Verify** — for each claim, a second Haiku pass checks: "is this claim supported by the cited chunks?" Unsupported claims are dropped, not rewritten.
4. **Render** — the UI refuses to render a claim without a citation. Unanswered aspects show as a labelled "Not in corpus" callout.

Why this beats single-shot prompting: even with a great system prompt, single-shot Claude *will* occasionally extrapolate. Verification is cheap (Haiku, one call per claim, prompt-cached) and catches the long tail.

## Chapter 5 — The Cost Model

Budget: **<$5/month during portfolio phase**.

### Per-project token math (rough)

A single client project running end-to-end through the bot:

| Stage | Model | Input tokens | Output tokens | Notes |
|---|---|---|---|---|
| Brief intake | Haiku | ~2K | ~1K | one-shot |
| Hypothesis generation | Sonnet | ~8K (cached) | ~3K | RAG-augmented |
| Persona recommendation | Haiku | ~4K (cached) | ~2K | |
| Questionnaire (with variants) | Sonnet | ~12K (cached) | ~6K | most expensive step |
| Analysis (quant) | Sonnet | ~15K | ~5K | data ingestion + writeup |
| Analysis (qual coding) | Haiku per transcript | ~5K × N | ~2K × N | scales with N transcripts |
| Story angles | Sonnet | ~6K | ~3K | |
| RAG retrieval (across all stages) | Haiku reranker | ~30K (cached) | ~3K | |

With prompt caching (90% off cached input), per-project cost is roughly **$0.20–$0.60**. At 5–10 projects/month, that's **$1–$6/month**. Tight but achievable.

### The three levers

1. **Default to Haiku.** Sonnet only when synthesis demands it. Haiku 4.5 is shockingly capable for retrieval, classification, and draft work — most steps don't need Sonnet.
2. **Prompt caching everywhere.** System prompts, persona libraries, hypothesis history — anything that repeats across calls. Anthropic's cache cuts cached input cost by 90% with a 5-minute TTL (configurable up to 1 hour).
3. **Batch the embeddings.** Voyage charges by token, not by call — embed entire corpora in one batch when ingesting.

### When to spend more

The moment a paying client uses this, the budget conversation changes. At commercial pricing, ~$1/project is fine if it saves the researcher 10 hours. The architecture above scales without re-platforming — we just stop being so aggressive about Haiku-first.

## Chapter 6 — The Confidentiality Model

Every project carries a **confidentiality level**: `public`, `client-confidential`, or `nda-restricted`. Documents inherit from their project but can be overridden per-doc.

Three guarantees:
- **Cross-project retrieval respects confidentiality.** NDA-restricted docs from Client A *never* surface as retrievals when working on Client B's project.
- **Every retrieved chunk renders with its confidentiality badge.** I can see at a glance whether I'm reading from public benchmark data or a specific client's prior work.
- **Anthropic's API has zero-data-retention available.** For NDA work, we'll enable ZDR on the org so prompts/responses aren't logged on Anthropic's side.

This is a researcher-table-stakes feature, but it's also the thing most "AI for research" tools get badly wrong.

## Chapter 7 — The Prompting Playbook

Strong prompting is what closes loopholes. The playbook (will evolve as we build):

### Rule 1 — Structured outputs over free text

Every generation step uses Anthropic's structured-output mode. Free text invites confabulation; a JSON schema with explicit fields forces the model to either fill them honestly or fail loudly.

### Rule 2 — Abstention is a first-class output

Every prompt explicitly authorises (and rewards) "I don't know." Sample fragment:

> If the retrieved chunks do not support an answer, return `unanswered_aspects` populated and `claims: []`. Do **not** invent claims to appear helpful. Saying "the corpus does not address this" is the correct, valued behaviour.

### Rule 3 — Variants are a feature, not a bug

For questionnaire generation, the prompt explicitly asks for *N variants per construct*, with each variant labelled by *what it measures differently*. The model is told: don't pick the best one, present them with tradeoffs.

### Rule 4 — Cite or shut up

For RAG outputs, every factual claim must include `citation_ids`. The verifier pass drops unverified claims rather than fixing them. The UI refuses to render uncited claims. Three layers of enforcement.

### Rule 5 — Personas are ranked, not chosen

Persona recommendations come back as a ranked list with explicit assumptions ("assumes urban, 25-44, tech-comfortable") and a "what this persona will *under-represent*" note. The researcher chooses; the bot widens the option space.

## Chapter 8 — The Eval Harness

You cannot ship a strict-abstention RAG product without an eval harness. The harness has three test types, all run before any feature is considered done:

1. **Golden Q&A** — questions where the corpus has a clear answer. Fail = bot fails to retrieve + cite correctly.
2. **Hallucination probes** — questions designed to *tempt* the model to fabricate (specific stats, leading framings). Fail = bot returns a claim without a citation, or with a wrong citation.
3. **Abstention probes** — questions the corpus genuinely cannot answer. Fail = bot answers anyway instead of returning empty + `unanswered_aspects`.

The harness lives in `evals/` and runs as a `npm run eval` command. Every PR runs it. We track three metrics over time: retrieval precision, citation accuracy, abstention rate on out-of-corpus questions.

## Chapter 9 — Things I Learned (running log)

> This section is the AI PM portfolio gold. Updated as we build.

- *(2026-04-29)* The cost gap between Haiku 4.5 and Sonnet 4.6 is large enough that "default to Haiku, escalate explicitly" is a real product decision, not a tuning detail. It changes which steps feel snappy vs. thoughtful in the UX.
- *(2026-04-29)* "Strict abstention" is cheaper to enforce via a structured-output schema + a verification pass than via prompt engineering alone. Prompts say "don't hallucinate"; schemas + verifiers *prevent* it.
- *(2026-04-29)* The decision to skip LangChain and call the SDK directly is not minimalism for its own sake — it's because every loophole I want to close lives inside the prompt, and frameworks abstract the prompt away from me.
- *(2026-04-29)* Tiny gotcha worth remembering: Windows File Explorer silently strips leading dots when you create or rename files in the GUI. My first `.env.local` arrived as `env.local`, and Next.js ignored it. The "are my keys configured?" health check caught it in 5 seconds — the dial-tone instinct (D-013) earning its keep on day one.
- *(2026-04-29)* Naming the product **Premise**. The name landed because it's the first thing a researcher brings to any project — and the product widens the option space *from* that premise. The PM lesson: optimise naming for positioning fit, not for distinctiveness.
- *(2026-04-30)* Tooling stability lesson: Turbopack (the new Next.js dev bundler) crashes on Windows when the project path contains spaces — the kind of bug that produces a 500 page with a stack trace deep inside `node_modules`. Switched to the standard webpack-based dev server. Slower by a second on cold starts; rock-solid otherwise. The general AI-PM read: when the *new and faster* tool has rough edges on your specific environment, the *boring and stable* tool buys back hours of debugging and zero-cost cognitive load. Default to boring for foundations.

## Appendix — The Taskforce Roles

For PM portfolio purposes, here's how the roles map:

- **AI Product Manager (Aaron)** — owns vision, audience, success metrics, principle ("propose, don't dispose"), eval acceptance criteria.
- **Researcher (Aaron)** — owns methodology, hypothesis quality bar, question-variant taxonomy, persona library, story-angle templates.
- **LLM builder** — owns model routing, prompt caching, structured outputs, the verification pass, abstention prompting.
- **RAG engineer** — owns chunking strategy, embeddings, retrieval + reranker, citation enforcement, confidentiality filtering.
- **UI/UX** — owns the canvas (chat ↔ artefacts pane), the "options not answers" interaction pattern, the citation-badge UX.
- **Quant/qual analyst** — owns analysis prompts, transcript-coding pipeline, cross-tab generation, statistical sanity checks.
- **Eval lead** — owns the harness, the golden Q&A set, the hallucination/abstention probes, the regression dashboard.
