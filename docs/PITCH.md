# Premise — the launch pitch

> A long-form, opinionated pitch for what Premise is and why it matters. Drafted in Aaron's voice — edit freely before LinkedIn / portfolio / cold-email use. Sized so the first ~300 words work as a standalone LinkedIn post and the rest fits a portfolio long-form page.

---

## The 300-word version (LinkedIn launch post)

I've spent ten years running research projects. Every single one had the same shape: brief → hypotheses → questionnaire → fielding → analysis → story angles for thought leadership. And every single one had the same problem: 50% of those hours were mechanical. Pulling stats from old decks, re-typing variations of the same question, cross-tabbing variables I'd cross-tabbed a hundred times before.

Existing AI tools didn't help. Base LLMs hallucinate stats — fatal in client work. ChatGPT has no memory of my last 100 projects. And every "AI for research" tool I tried wanted to *replace* my judgment instead of *widening* my option space.

So I built **Premise** — an AI co-pilot for market and consumer insights researchers. It does two things no other tool I've seen does together:

**One — it grounds every answer in a corpus you control.** A public library of open research is included out of the box. Sign in, and you spin up your own private corpus: every transcript, every back-deck, every wave of tracking study you've ever run becomes searchable. The bot can only cite what you've put in front of it. Every claim is structurally required to point to a source chunk; below the grounding floor, the bot says so explicitly and names what would close the gap. Zero fabrication is the floor — enforced in the schema and verified by a second pass, not just promised in a prompt. Calibrated honesty sits on top of it.

**Two — it runs the whole research lifecycle, not just Q&A.** You can ask it factual questions (NotebookLM-style — "what did our Tier-2 work in 2024 say about price sensitivity?"). Or you can hand it a brief and let it propose hypotheses, recommend personas, draft a questionnaire (with three differently-framed variants per question so you pick on instinct), analyse the survey data when it comes back, and produce four ranked story angles with the audience, the lede, the evidence chain, and — non-negotiably — what each angle leaves out.

Live now: **[premise-one.vercel.app](https://premise-one.vercel.app/)** · Repo: **[github.com/aaronalm-ops/premise](https://github.com/aaronalm-ops/premise)**

I'm building this solo as my transition into AI Product Management. Comments and pushback welcome — the next phase is dogfooding it on a real client engagement.

---

## The full pitch

### What every research project actually looks like

Every Market/Consumer Insights project — agency-side, client-side, freelance — has the same six steps:

1. The brief lands.
2. You write hypotheses to prove or disprove.
3. You design the questionnaire: choose personas, choose the *exact phrasing* of each question (the same question worded differently elicits different responses).
4. The survey fields.
5. You analyse — both the agreed hypotheses *and* the patterns the data is shouting that nobody asked about.
6. You write the story — finding the angle that lands with the audience that matters.

Most of the time goes to steps 2–6. Most of *that* time is mechanical. And the parts that aren't mechanical — the question-wording calls, the angle decisions — are exactly where experienced researcher instinct beats any tool.

The market has had three flavours of AI response to this:

- **Generic LLMs** (ChatGPT, Claude.ai). Fast at draft text. Catastrophic on stats. No memory of your prior work. The hallucination floor is too high for client deliverables.
- **AI "research assistants"** (Perplexity, Elicit, etc.). Built for *academic* research synthesis — peer-reviewed papers, public web. They don't ingest your back-catalogue of client decks, transcripts, and tracking waves. The corpus is wrong.
- **End-to-end "AI research platforms"** (the well-funded category). Sample-on-demand, auto-coding, auto-analysis. Powerful, but built on the *replace-the-researcher* thesis. They auto-pick personas, auto-pick questions, auto-analyse, auto-write. The expert user has no surface to *disagree*.

Premise is the fourth flavour: a co-pilot that widens your option space at every stage, never narrows it for you, and grounds every output in *your* corpus, not the open web.

### What Premise actually is

A single workflow, two ways to use it.

**Mode 1 — Ask anything, get a cited answer or an honest "I don't know."** NotebookLM-style retrieval over the corpus you've assembled. Drop in decks, transcripts, reports, URLs (Mozilla Readability strips them clean); Premise chunks, embeds, indexes. Then ask it questions:

> *"What did our 2024 Q3 work say about price sensitivity among urban millennials?"*
> *"Find the three transcripts where respondents mentioned packaging concerns unprompted."*
> *"Have we ever measured trust drivers for FinTech apps?"*

Every answer is rendered as discrete claims, each with citation chips that hover-preview the exact source chunk. If the corpus can't support an answer, you see an honest abstention — *not* a confident-sounding fabrication. That's enforced in three structural layers: a JSON schema that requires citations on every claim, an independent verifier pass that drops unsupported claims rather than rewriting them, and a UI that refuses to render uncited output. Three layers, none of them prompting. Prompts say "please don't"; structure says "you can't."

**Mode 2 — Hand it the brief, let it run the whole lifecycle.** Paste a brief; Premise walks you through:

- **Hypothesis generation.** Five to seven ranked hypotheses, each with stated assumptions, expected effect direction, and confirmation criteria. Each one cites the prior corpus work that supports or contradicts it. You accept, edit, or reject per hypothesis. The accepted set becomes input to the next step.
- **Persona recommendation.** Audiences proposed, ranked, with a required `under_represents` field that names who this persona set *doesn't* cover. (Senior researchers always know what their persona definitions miss; Premise enforces naming it.)
- **Questionnaire with question variants.** For every question, three differently-framed phrasings drawn from a taxonomy of eight (neutral_direct, leading, projective, behavioural, attitudinal, forced_choice, constant_sum, maxdiff). Each variant is labelled with what it elicits *and* its caveat — because the wording determines what you measure. You pick one variant per question. The bot won't pick for you. That's the product principle: *the chatbot proposes; the researcher disposes.*
- **Analysis.** When the survey returns, upload it. Premise runs through the accepted hypotheses one by one, returns per-hypothesis verdicts (confirmed / refuted / inconclusive) with the supporting cut, plus a separate "things you didn't ask about but the data is shouting" section for emergent patterns, plus an honest study-caveats panel.
- **Story angles for thought leadership.** Three to four narrative angles. Each angle has a named target audience (not "marketers" — *CMOs at consumer-brand parents*, *brand strategists at independent agencies*), a one-line lede, three supporting beats, the full evidence chain back to hypotheses and emergent patterns, a 1–5 priority score for narrative strength, and — schema-required — an `omits` field naming what the angle deliberately leaves out. Accept an angle, and Premise drafts a structured markdown outline (subtitle, intro, body sections, closing) with the omitted material surfaced in the footer so you can address it or own it.

You can dip into Mode 1 from any stage of Mode 2 — ask the corpus a clarifying question mid-questionnaire, mid-analysis, mid-story. Same retrieval pipeline, same citation discipline.

### Why the corpus model is the heart of the product

**A public library, included out of the box.** Curated open research — anonymised case studies, public methodology pieces, syndicated reports we have rights to — that solves the cold-start problem. A new user has a real corpus to query from minute one.

**A private corpus, scoped to you.** Sign in with a magic link. Spin up projects. Each project is tagged with a confidentiality level (`public`, `client-confidential`, `nda-restricted`). Documents inherit that level. Cross-project retrieval respects it: an NDA-restricted document from Project A will never surface in Project B's results. Enforcement lives at the SQL boundary — in the database function `match_chunks`, not in application code that could be refactored away.

The pitch line: *AI that can only cite what you've put in front of it.* The corpus is the moat. Your prior work is what makes the bot useful in a way ChatGPT can't be.

### The engineering posture (for the technically curious)

- **Stack.** Next.js 15 + TypeScript end-to-end; Supabase Postgres + pgvector for app data and embeddings in one place; Anthropic Claude (Haiku default, Sonnet only on genuine synthesis steps — a 15× cost difference); Voyage AI for embeddings; Vercel hosting.
- **No agent frameworks.** Direct Anthropic SDK calls. Every loophole we want to close lives inside our own prompts and our own verifier — not buried under a LangChain abstraction.
- **Strict-mode RAG everywhere.** Three-layer enforcement (schema + verifier + UI gate). 38 named gaps from the first internal audit; 32 closed.
- **Cost ceiling: <$5/month at portfolio scale.** Prompt caching on every repeated call, Haiku-first routing, free-tier infrastructure. Cost telemetry is a live badge in the UI — every API call is recorded with input/output token counts and a dollar figure. A live, public **[cost-at-scale calculator](https://premise-one.vercel.app/cost-calculator)** turns "how much per study?" into a draggable slider rather than a hand-wave.
- **37 numbered decisions logged**, each with a story, a tradeoff, a PM lesson, and a named failure mode. The decision log is the case-study layer.

### What Premise is *not*

Naming the scope on the front foot, because experienced researchers will ask:

- **Not a validated-scale builder.** Premise drafts instruments. Building a measure that reliably loads on a single construct — the kind of work that goes into NPS, SUS, NEO-PI-R — requires item-response theory, factor analysis, and field validation that takes months and stays human-led. Use Premise to draft, pilot, refine — not to ship a tracker without a psychometrician's eye on it.
- **Not a substitute for qualitative interpretation.** The strict-abstention discipline applies to corpus-cited factual retrieval. Interpretive qualitative work — coding latent themes, reading positionality, noticing what respondents *don't* say — has its own discipline and is currently the researcher's domain, not the bot's.
- **Not yet hardened for paying clients.** Confidentiality is enforced at the SQL boundary inside Premise, but the LLM calls themselves run on consumer-grade Anthropic terms today. Before a real NDA-bound engagement goes through the product, enterprise retention terms, organisation-level isolation, audit trails, and GDPR export/deletion flows all need to be in place. They're scoped, not built.

Knowing what a tool isn't is the same kind of discipline as the `omits` field on a story angle.

### Where it stands

All five user-flow phases are shipped end-to-end: brief intake → hypotheses → personas → questionnaire → analysis → story angles. Live at **[premise-one.vercel.app](https://premise-one.vercel.app/)**. Code at **[github.com/aaronalm-ops/premise](https://github.com/aaronalm-ops/premise)**.

Next: I'm running a real client engagement through Premise end-to-end as the dogfooding round. The success criterion is concrete — *save 10+ hours vs. my baseline workflow and find one thing I couldn't have found without it.* The case-study chapter on what I learned dogfooding is the chapter I want most.

### What I'd love feedback on

- **Methodologists**: where does the variant taxonomy break down for you?
- **Senior CMI / insights leaders**: when have you seen "AI co-pilot" tools land or fail with research teams?
- **Brand and comms strategists**: what would *you* want at the story-angle stage that I haven't built?
- **AI PMs and engineers**: which of the 37 decisions would you push back on?
- **Hiring managers**: if you're hiring for AI PM roles, I'd love to talk.

Premise is a portfolio piece, a case study, and — if the dogfooding round goes well — the start of a real product. I'd rather hear "here's where it breaks" than "looks great." Comments are open.

---

## Things to add as the product matures

- A 60-second demo video showing the strict-abstention behaviour (ask for a stat the corpus can't support; show the honest "I don't know").
- A 90-second demo video walking through the brief → story-angles flow end-to-end.
- Real cost-per-project numbers from the dogfooding round (`ran 8 real projects through Premise; total API spend $X`).
- A screenshot of the question-variant picker with the three frames side by side and their caveats — that visual carries more weight than three paragraphs explaining it.
- A "before / after" time tally from the dogfood project: hours saved by step, hours added by step.
- A blog post per phase, drawn from `docs/DECISIONS.md`.

## How to use this file

- **LinkedIn launch post**: copy the 300-word version. Add the live URL and repo link.
- **Portfolio long-form**: use the full pitch as a `/projects/premise` page.
- **Cold email to hiring managers**: open with the "what every research project looks like" section, then the "two ways to use it" framing, then a single direct ask.
- **Conference / podcast pitch**: lead with the failure modes of existing AI research tools (the three flavours), then "the fourth flavour is what Premise is for."
