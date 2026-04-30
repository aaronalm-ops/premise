# Portfolio — copy you can use everywhere

> Multiple lengths and angles for adding Premise to your portfolio, resume, LinkedIn, cold-email, or pitch deck. All written in your voice. Copy what fits the surface; edit freely.

---

## Live deployment

> **Repo (public):** [github.com/aaronalm-ops/premise](https://github.com/aaronalm-ops/premise)
> **Live demo:** _add your Vercel URL here once deployed; share on demand only — see [D-030](DECISIONS.md) on the cost-burn rationale_

## The 50-word version (resume bullet, LinkedIn headline, email signature)

**Premise** — building an AI co-pilot for market and consumer insights researchers. End-to-end workflow grounded in historical research via strict-mode RAG (zero fabrication via schema-enforced citations + verification pass). Stack: Next.js, Anthropic Claude, Supabase pgvector, Voyage embeddings. Designed for <$5/mo runtime. [github.com/aaronalm-ops/premise]

### Variant — for a CV "Side projects" section

> **Premise — AI research co-pilot** *(in progress, 2026)*
> Solo build. Walks researchers through brief → hypotheses → questionnaire → analysis → story angles, grounded in their prior work. Differentiator: zero-fabrication strict-mode RAG enforced via tool-use schemas + verifier pass + UI gate. Next.js, TypeScript, Anthropic Claude, Supabase pgvector. [github.com/aaronalm-ops/premise]

---

## The 200-word version (portfolio site card, "About" page, LinkedIn featured project)

### Premise — AI co-pilot for market and consumer insights researchers

Most "AI for research" tools either replace the researcher's judgment or give them ChatGPT-flavoured platitudes with no memory of their past work. Premise is a co-pilot, not a replacement: it widens the researcher's option space at every stage of a project — brief intake, hypothesis generation, questionnaire design with persona recommendations and multiple question variants, data analysis, and story angles — while grounding every output in the researcher's historical corpus via strict-mode RAG.

The product is engineered against its single biggest failure mode — fabrication. Every claim is structurally required to cite a source chunk; an independent verifier pass drops unsupported claims rather than rewriting them; the UI refuses to render any uncited output. "I don't know" is a first-class output.

I'm building this solo as a learn-by-shipping AI Product Management transition project. Stack: Next.js 15 + TypeScript, Supabase Postgres with pgvector, Anthropic Claude with Haiku-default / Sonnet-on-escalation routing, Voyage embeddings, Vercel. Designed for <$5/month runtime through prompt caching, model routing, and free-tier infrastructure.

Repo (private during build): [github.com/aaronalm-ops/premise](https://github.com/aaronalm-ops/premise) — flipping public after Phase 1.5 ships.

---

## The 600-word version (full case-study page on your portfolio site)

### Premise — building an AI research co-pilot, end-to-end, as a transition into AI Product Management

**The problem.** Every Market/Consumer Insights project I've ever run has the same shape: brief → hypotheses → questionnaire → fielding → analysis → story. Steps 2–6 are where ~80% of my time goes, and ~50% of that time is mechanical: pulling prior research from old decks, retyping similar questions, cross-tabbing variables I've cross-tabbed a hundred times before. Existing AI tools don't help — base LLMs hallucinate stats (a fireable offence in client work), have no memory of past projects, and try to *replace* the researcher's judgment instead of widening their option space.

**The thesis.** A co-pilot built on three commitments: (1) *the chatbot proposes, the researcher disposes* — every output is 3–5 ranked options, never a single auto-decision; (2) *strict abstention* — every claim cites a source chunk or the bot says "I don't know" explicitly; (3) *grounded in the researcher's own corpus* — past work is the moat, not a competitor's training data.

**The strict-abstention architecture.** This is the load-bearing piece, and it taught me the most about AI product engineering. Prompts saying "please don't hallucinate" are soft constraints. To make non-fabrication a *guarantee* rather than a *tendency*, Premise enforces it in three structural layers: (a) Anthropic tool-use forces every model output into a JSON schema where each claim must have non-empty `citation_ids`; (b) a second model pass verifies, per claim, that the cited chunks actually support what the claim says — failures are dropped, not rewritten; (c) the UI refuses to render any claim without a citation. Three layers, each cheap, each catching what the previous missed.

**The cost discipline.** Premise is designed to run for <$5/month during the portfolio phase, achieved through (a) Haiku 4.5 by default with Sonnet 4.6 only for genuine synthesis steps — Haiku is ~15× cheaper for narrow tasks like reranking and fact-verification; (b) Anthropic prompt caching, which cuts cached-input cost by ~90%; (c) free-tier infrastructure (Supabase pgvector for both app data and embeddings, Vercel hosting, Voyage embeddings free tier). The biggest AI-PM lesson here: cost is a product decision, not a tuning detail. A model-routing rule changes which steps feel snappy vs. thoughtful in the UX, and how much the product can charge.

**The build sequence.** I deliberately built RAG first — before any user-facing feature. RAG is the highest-risk, highest-leverage capability: if it doesn't work, the product is dead; if it works, every later feature (hypothesis generation, questionnaire design, analysis, story angles) gets meaningfully better. The instinct to build features in user-flow order is a trap; sequence by risk, not by UX.

**Stack.** Next.js 15 + TypeScript end-to-end (one language, one deploy, solo-maintainable); Supabase Postgres + pgvector (vectors + app data in one place; confidentiality enforced at the SQL boundary, not in app code); Anthropic Claude (Haiku/Sonnet routing, prompt caching, tool-use for structured outputs); Voyage AI for embeddings; Vercel for hosting.

**What's shipped, what's next.** Phase 0 (scaffolding) and Phase 1 (strict-mode RAG core — schema, ingestion CLI, retrieval, rerank, generation, verification, `/api/ask`) are live. Phase 1.5 (UI integration + eval harness with golden Q&A, hallucination probes, and abstention probes) is next. Phases 2–5 cover hypothesis generation, questionnaire design with persona recommendations and question variants, analysis, and story angles. Phase 6 is dogfooding on a real client project — the success criterion is *I can run a real project end-to-end through Premise and save 10+ hours.*

**Repo & docs.** Decision log explaining every choice in plain language: [docs/DECISIONS.md](https://github.com/aaronalm-ops/premise/blob/main/docs/DECISIONS.md). Running case study: [docs/CASE_STUDY.md](https://github.com/aaronalm-ops/premise/blob/main/docs/CASE_STUDY.md). Roadmap: [docs/ROADMAP.md](https://github.com/aaronalm-ops/premise/blob/main/docs/ROADMAP.md).

---

## Talk track — phrases to use in interviews and calls

When someone asks *"what are you building?"*:

> An AI co-pilot for market and consumer insights researchers — brief to story, grounded in their own past work, with strict-mode RAG that won't fabricate stats. Premise is the name. I'm building it as my AI PM transition project — case study, portfolio piece, and eventually a real product.

When someone asks *"what have you learned?"*:

> Three things, in order of how much they changed how I think.
> One: cost is a product decision. Picking which model handles which step changes which parts of the UX feel snappy vs. thoughtful, and how much the product can charge. I default to Haiku and only escalate to Sonnet for genuine synthesis steps — that's a 15× cost difference compounding across thousands of calls.
> Two: when you want a guarantee rather than a tendency, look for structural enforcement, not better prompts. My non-fabrication promise lives in a JSON schema, a verifier pass, and a UI gate — three layers, none of them prompting. Prompts say "please don't"; structure says "you can't."
> Three: sequence by risk, not by user flow. The instinct is to build features in the order users encounter them. Wrong. The thing most likely to kill the product (the RAG layer, in my case) ships first; the polish ships last.

When someone asks *"why this, why now?"*:

> I'm a researcher by trade. I know exactly which 10 hours I spend per project that an AI should handle. I also know exactly how researchers feel when an AI tool gets a stat wrong — I've watched it happen in real client decks. Building Premise means I'm a researcher solving the researcher problem, with AI as the leverage. That's a much stronger product position than "PM who uses AI."

---

## Where to add it

- **Resume**: 50-word version under "Side projects" or "AI projects."
- **LinkedIn**: 200-word version as a Featured project. Add the GitHub URL.
- **Personal site**: 600-word version as a `/projects/premise` case-study page.
- **Cold email to AI PM hiring managers**: lead with the talk-track for "what have you learned" — it's the clearest signal of PM-grade thinking.
- **Twitter/X bio**: "Building Premise — AI co-pilot for insights researchers. Strict-mode RAG, zero fabrication. github.com/aaronalm-ops/premise"

## Things to add as the build progresses

- A 60-second screen recording of the strict-abstention test (ask the bot something the corpus *can't* answer; show it correctly returning `unanswered_aspects`).
- A graph from the eval harness showing abstention rate vs. citation accuracy over time.
- A short blog post per phase, written from the case-study learnings log.
- A "cost per project" line as you start dogfooding ("ran 12 real projects through Premise; total API spend $4.40").
