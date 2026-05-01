# The Premise Playbook

> *A field guide for Aaron — Researcher transitioning to AI PM, first AI project — to be a pro on Premise and on AI product management.*
>
> What got built, why it was built that way, what the alternatives were, and what to learn from here. Written in your style: stories first, principles second, jargon defined when it shows up.

---

## How to read this

This is a long doc — ~6,000 words. Read it once front-to-back to internalise the meta-thread; come back to specific sections when you need them.

It has six parts:

1. **The setup** — who you were going in, and the bet you took.
2. **The journey** — phase by phase, what got built and what got learned.
3. **The toolkit you now own** — ten AI PM principles, each with a Premise example and a researcher-world analogy.
4. **How it could have been built differently** — what was over-built, under-built, and the alternative paths we deliberately walked away from.
5. **What to learn from here** — the non-engineering moves, skills to deepen, a 90-day plan.
6. **How to talk about this in interviews** — talk track, hard questions, the demo to nail.

If you only have ten minutes, read **Part 3** (the toolkit) and **Part 6** (the talk track). The rest is depth.

---

# Part 1 — The setup

## Who you were going in

A researcher and analyst by trade. Years of running market and consumer insights work — briefs, hypotheses, fieldwork, debriefs, story angles. You knew exactly which 10 hours per project felt mechanical (pulling prior research from old decks, retyping similar questions, cross-tabbing the same variables). You also knew exactly how researchers feel when an AI tool gets a stat wrong — you'd watched it happen in real client decks.

You were a vibe coder by hobby — a few shipped projects (a church app, a rentals website) but no AI engineering background. The technical literacy was real but shallow.

You wanted to transition to AI Product Management. Building a real AI product was both the credential and the apprenticeship. The product would be a portfolio piece *and* a case study about your own transition.

## What "AI PM transition" actually means

There's a market interpretation problem here. "AI PM" can mean three very different things:

| Flavour | What the role actually is | Where you'd find it |
|---|---|---|
| "PM at an AI company" | Generic PM, the product just happens to use ML | Most "AI" job postings |
| "PM who can shepherd an ML team" | Roadmap, prioritisation, but the technical work is the data scientists' | Mature ML orgs, established AI products |
| "PM who can *design* AI products" | Knows when AI fits, what to enforce structurally, how cost compounds, how trust gets built or broken | Smaller teams, AI-first startups, foundational AI products |

The third version is the highest-leverage but rarest skill. Premise was an apprenticeship in flavour 3 — designing AI products from first principles, not just managing them.

## The bet of building Premise

The bet you took: *if I build this thing the right way, I will both make a useful product AND become a fluent AI PM in the process.*

The bet's payoff condition wasn't "Premise becomes a unicorn." It was "I can walk into a senior AI PM interview and have an interlocutor say 'this person thinks differently than the average PM.'"

After 36 decisions and one running production deployment, you've earned that. The next four parts are how to make sure you can articulate it.

---

# Part 2 — The journey

The story of Premise, told as the chapter-by-chapter narrative of what got built and what got learned at each step.

## Phase 0 — Foundations (the dial tone)

Before the chatbot does anything interesting, it needs to be reachable. Phase 0 was scaffolding: Next.js + Supabase + Anthropic + Voyage, all wired, all green-tested.

**The story I keep coming back to**: the field-ops lead who builds the "dial tone" sensor before any of the fancy data-collection features. Their first deliverable isn't a chart or a finding — it's a tiny endpoint that just answers *"yes, I'm alive."* Boring. But the moment something goes dark in week three, they know whether the modem, the sensor, or the code is the problem.

That's why `/api/health` was the first endpoint we built (D-013). It didn't impress anyone. It saved hours of debugging from week one onward.

**The lesson**: build observability before features. The instinct of a new builder is to make user-visible features first; the instinct of an experienced one is to make the system *legible* before adding complexity.

## Phase 1 — Strict-mode RAG (the heart)

This was the highest-risk phase, which is exactly why we built it first.

RAG (Retrieval-Augmented Generation, in plain language: "give the bot a library card to your private archive before it answers") is what makes Premise different from ChatGPT. Without it, the product is a thin wrapper over a generic LLM. With it, every answer is grounded in *your* prior research.

The strict-mode part is the harder commitment: zero fabrication. Every claim must cite a source chunk; if the corpus doesn't support an answer, the bot says so explicitly.

Three layers of enforcement (D-010):

1. **Schema** — the model can only output via a forced JSON schema where every claim must have non-empty `citation_ids`.
2. **Verifier** — a second model pass checks each claim against its cited chunks. Unsupported claims are *dropped, not rewritten*.
3. **UI gate** — the renderer refuses to display claims without citations.

Three layers, each cheap, each catching what the previous one missed.

**The story**: the focus-group debrief form. Free text gets you a flowing narrative that glosses over the weak parts. A structured debrief form with slots for "3 strongest verbatim quotes (with timestamp)" forces honesty. Then a second analyst checks the timestamps. Then the publication template refuses to render quotes without timestamps. Three layers; you never get a fabricated quote in the deck.

**The lesson**: when you want a *guarantee* and not a *tendency*, look for structural enforcement. Prompts say "please don't"; schemas say "you can't"; verifiers say "you didn't"; UI gates say "I won't show it."

## Phase 1.5 — Wiring the chat UI

Built the canvas. Two panes — chat on the left, artefacts on the right. Citation chips with hover preview. Abstention callouts in amber when the corpus can't answer.

The thing I kept hitting: scroll bugs. Three iterations of "min-h-0", "overflow-y-scroll", "premise-scroll" custom styling — and the actual bug turned out to be one missing `grid-rows-[minmax(0,1fr)]` on the parent. Three CSS fixes that didn't matter, then one root-cause fix that did.

**The lesson**: when a UI symptom keeps reappearing despite fixes, the bug is upstream of the symptom. Stop fixing symptoms.

## Phase 2 — Hypothesis generation

The first generation feature beyond Q&A. Brief in → 5–7 hypotheses out, each ranked, each citing chunks from the corpus, each falsifiable.

This was the moment the **chassis pattern** revealed itself. Phase 2 reused everything from Phase 1: same retrieval, same reranker, same forced tool_use, same defensive post-validation. Only the schema and the system prompt changed. We shipped Phase 2 in roughly the time Phase 1 took, despite being a larger feature, because the primitives were already there.

**The story**: a research agency's verbatim-quoting protocol that was developed for focus groups carries cleanly to diary studies. Different format, different data, but the *shape* of the protocol — speaker, timestamp, audio reference — works for both. Reuse the chassis, change the field names, ship the second product in a week instead of a quarter.

**The lesson**: AI products compound by *primitives*, not features. Find the load-bearing primitive (here: structured-output-with-citation-discipline), name it, reuse it everywhere.

## Phase 3 — Personas and question variants

Two new artefacts. Personas with a mandatory `under_represents` field — naming what the segment *doesn't* capture, a senior researcher's instinct made structural. Questions with **three variants per question** from different methodological frames (neutral / behavioural / projective / etc.), each labelled with what it elicits and its caveat.

The variant taxonomy was the product-defining surface. The principle "the chatbot proposes, the researcher disposes" became a literal UI element — three cards side-by-side, click one to select, the others stay visible so the researcher can revisit.

**The story**: a senior researcher reviewing a junior moderator's draft questions for a sustainability tracker. Junior writes *"On a 1-7 scale, how important is sustainability?"* Senior winces — knows the average will come back at 6.2 and the client will think every consumer is a sustainability champion. The senior's instinct knows that the *phrasing* changes what you measure. The variant taxonomy puts that instinct in the schema.

**The lesson**: for expert users, don't ship a bot that thinks for them. Ship a bot that thinks *alongside* them. The product wins because the expert keeps the bot in their loop, not because the bot is right.

## The audit (the unlock)

Mid-flight, you stopped and asked the taskforce to evaluate everything you'd built so far across five lenses (Researcher, LLM builder, Developer, UI/UX, AI PM). 38 specific gaps surfaced.

The biggest finding was honest and uncomfortable: **prompt caching wasn't actually implemented.** D-003 had been aspirational since Phase 0. The "<$5/month" claim was fiction. Real cost was ~9× the docs claimed.

This is the moment that compounded the most. Not because the bug was bad — it was findable in 5 minutes — but because the **practice** of stopping mid-feature to audit yourself across multiple lenses revealed a 5.5-day Tier 1+2 work plan that we'd never have surfaced from "just keep building."

**The story**: the agency QA review every six months where seniors read each other's debriefs cold. Always finds three things that were quietly off — methodology assumptions left undocumented, segments labelled inconsistently, copy mistakes. The act of *stopping* to audit produces the gap list; the act of building *next* without that pause silently accumulates the same gaps as technical debt.

**The lesson**: build in audit checkpoints, not just feature checkpoints. Senior teams self-audit per-feature; junior teams find out about the gaps from a hiring manager or a client. Audit-then-build, not just build.

## Tier 1+2 hardening (closing the trust gaps)

After the audit: prompt caching real (D-021), survey export (D-022), cost telemetry live (D-023), edit affordance (D-024), Zod validation everywhere (D-025), atomic generation via Postgres functions (D-026), retry logic (D-027), generation locks against double-clicks (D-028), project creation in UI (D-029).

This was the "stop adding features, fix the foundations" chapter. Not glamorous. Important.

**The lesson worth remembering**: the audit was the unlock; the Tier 1+2 work was the *value* of the unlock. Without the pause, none of those gaps get closed before they bite you in front of a real user.

## Going live (the posture shift)

We flipped the repo public, deployed to Vercel, set up the auth flow, added a public library to solve cold-start (D-033). The URL went from "thing on my laptop" to `premise-one.vercel.app`.

**The story**: the moment a draft research deck becomes a *delivered* deck. Pre-delivery, every slide could be a draft, every finding could be revisited. Post-delivery, every slide is an action a client is one click away from referencing in their own decks. The discipline of building the audit, the eval harness, and the cost telemetry was preparation for this moment, not paperwork around it.

**The lesson**: going live is a posture shift, not a feature ship. Pre-live: every commit can be a draft. Post-live: every commit is an action a real user is one click away from experiencing.

## Phase 4 — Analysis (closing P-4)

Upload survey data / paste a transcript / drop a CSV. The bot reads it alongside the brief + accepted hypotheses + selected question variants and produces:
1. Per-hypothesis verdicts (confirmed / refuted / inconclusive) with supporting evidence and per-verdict caveats.
2. Emergent patterns the data is shouting that you didn't ask about.
3. Study-wide caveats — sample size, missing segments, methodology issues.

This is where `selected_variant_id` finally got a downstream consumer. The whole point of letting the researcher pick a variant in Phase 3 was so the analyser could read "the canonical question wording" in Phase 4.

**The story**: the senior researcher's debrief shape, ported into structure. Every wave of fieldwork ends with the same three-section debrief: hypotheses verdicted, patterns surfaced, caveats named. The bot's job isn't to invent the format; it's to fill the format honestly.

**The lesson**: replicate the senior expert's *output shape*, not their tool stack. A naive build copies the analyst's tools (SPSS, R). The PM move copies the shape of what the senior expert *produces* — verdicts, patterns, caveats — and uses whatever tool gets there fastest.

## Tier 3-5 polish push

Chat persistence (so reloading doesn't lose the conversation). User feedback loop (capture *why* on reject — high-value tuning signal). Confirmation on destructive regenerate. Bulk operations. Delete affordance. Color disambiguation. Loading-stage hints. Reranker as tool_use. Verifier batched (5× cost reduction). Researcher-controlled counts. Prompt versioning. Cost regression tracking in evals. Success metrics doc.

14 of 22 remaining audit items, in one push. Four deferred with rationale.

**The lesson**: a polish push isn't a feature push. It's the closure of a backlog of small, individually-low-value items that *collectively* define whether the product feels finished. Pre-polish: every researcher hits at least one rough edge in the first hour. Post-polish: rough edges gone.

## Phase 5 — Story angles + outline (closing the arc)

The end of every research wave isn't the analysis — it's the *story*. Researcher takes the verdicts and patterns, picks an angle, frames it for an audience, and outputs an article / deck / LinkedIn post / industry-press pitch.

That framing step is where most of the real value gets delivered, and where most of the *quiet dishonesty* in research happens. Every story angle leaves something out. Senior researchers know what; junior ones often don't notice.

We schema-enforced honesty: every angle must populate an **`omits`** field (rendered in indigo so it's impossible to skip past), and every drafted outline carries the omission as a footer note. The "options not answers" principle (D-019) extended to its highest layer — the narrative one.

**The lesson**: find the implicit expert judgment that separates "good" from "great" output in your domain, and make it a *required field*. For research: omissions matter. For analysis: caveats matter. For hypotheses: citations matter. Each is a structural truth-tax that compounds product trust over time.

---

# Part 3 — The AI PM toolkit you now own

Ten principles. Each has a Premise example and a researcher-world analogy. These are the things to lead with in interviews.

## 1. Structured outputs over prompts ("schema beats vibes")

**The principle**: when you want a behaviour to be a *guarantee*, not a *tendency*, build it into the schema, not the prompt. Prompts say "please don't"; schemas say "you can't."

**Premise example**: every claim in a strict-mode RAG response must have non-empty `citation_ids` — the Anthropic tool_use schema enforces it. Every story angle must populate `omits`. Every hypothesis must cite supporting or contradicting chunks.

**Analogy**: the discussion-guide debrief form with mandatory verbatim-quote-and-timestamp slots. The moderator can't skip the inconvenient parts because the form has slots for them.

**Why this is AI PM territory**: it's a *product decision*, not a model-tuning decision. PMs design the schema; engineers implement it; the model conforms.

## 2. Cost is a product decision (not a tuning detail)

**The principle**: the cost of an AI product changes which features are shippable, which user behaviours are sustainable, and which segments can afford it. Costs aren't "ops issues to clean up later" — they're upstream PM decisions made at model selection, prompt design, and architecture time.

**Premise example**: Haiku-default with Sonnet-on-escalation (D-002), prompt caching aggressively (D-003 / D-021), batched verifier (L-5), cost telemetry per call (D-023). Per-project cost: $0.20–$0.60 for a real wave.

**Analogy**: research agency's hourly-rate-pyramid. You don't put the global head of research on coding open-ends; you don't put the junior on the final client narrative. The smart agency *routes* the work. Same instinct for which model gets which task.

**Why this is AI PM territory**: cost compounds. A 5x-too-expensive default makes every commercial decision downstream worse — pricing, positioning, expansion economics.

## 3. Options not answers (for expert users)

**The principle**: for expert users, don't ship a bot that decides for them. Ship a bot that *widens their option space*. The principle gives the expert reason to keep the bot in their loop even when they disagree with the recommendation.

**Premise example**: 5–7 hypotheses (researcher accepts/edits/rejects), 3–5 personas, 3 variants per question with explicit elicits/caveats, 3–4 story angles each with `omits`. Never a single auto-decision.

**Analogy**: the senior research director who reviews a junior's draft questions and offers three rephrasings, each with the methodological tradeoff named. The junior learns; the senior's expertise stays in the loop.

**Why this is AI PM territory**: it's a *positioning* choice. "AI that decides" and "AI that widens" are different products with different audiences and different price points.

## 4. Evals as receipts for promises

**The principle**: every claim a product makes — strict abstention, citation discipline, confidentiality, no-fabrication — is a *promise*. Promises without measurement are marketing. Evals are the receipts that make them real.

**Premise example**: 20 deterministic probes across 6 types (golden-qa, abstention, hallucination, hypothesis-quality, persona-quality, confidentiality). Run before any prompt change. Cost regression tracked.

**Analogy**: the panel-guide checklist a moderator runs through *every wave* before fielding. Not exhaustive — just the things that, if they break, kill the study. Five minutes per wave; saves three months of reanalysis.

**Why this is AI PM territory**: evals are the highest-leverage portfolio artefact you'll build. Hiring managers screen for the discipline of "non-deterministic systems require measurement in lieu of certainty."

## 5. Audit-then-build, not just build

**The principle**: per-feature self-audits across multiple lenses (Researcher, LLM builder, Developer, UI/UX, AI PM) reveal gaps the next feature won't. Build the audit checkpoint into the rhythm.

**Premise example**: after Phase 3 we paused and ran the 5-lens audit. 38 gaps surfaced — including the prompt-caching lie. The Tier 1+2 work plan came directly from that audit; without the pause, every gap would still be hidden.

**Analogy**: the agency's six-monthly QA review where seniors read each other's debriefs cold. Always finds three things quietly off. The pause is the practice.

**Why this is AI PM territory**: senior PMs make audit cadence part of the roadmap. Junior PMs ship features and find the gaps from clients or hiring managers.

## 6. Primitives over features (the chassis pattern)

**The principle**: AI products compound by *primitives*, not features. Find the load-bearing primitive once; reuse it everywhere. Each later phase ships faster *and* feels more coherent because every surface speaks the same structural language.

**Premise example**: the strict-output chassis (forced tool_use + post-validation + UI gate) ships RAG, then hypotheses, then personas, then questions, then analysis, then story angles. One primitive, six features.

**Analogy**: a verbatim-quoting protocol developed for focus groups carries cleanly to diary studies. Different format, same shape. Ship product two in a week instead of a quarter.

**Why this is AI PM territory**: roadmap velocity comes from primitives, not features. PMs who can name the primitive ship 5x more features per quarter than PMs who treat each feature as net-new.

## 7. Trust commitments compound from the schema upward

**The principle**: when something *must be true* for the product to work, encode it in the layer that runs always — schema, RPC, RLS — not in application code that humans edit and forget.

**Premise example**: confidentiality enforced via `match_chunks(p_project_ids uuid[])` in SQL (D-016). Cross-project leakage is structurally impossible, not "should be prevented in code." Atomic generation via plpgsql functions (D-026). RLS as default safe state (D-017).

**Analogy**: locks on the cabinets, not on the doorframe. The cabinets always lock; the room's door can be left open and nothing leaks.

**Why this is AI PM territory**: trust commitments compound. Each schema-level guarantee makes the next claim defensible; each application-level guarantee creates a place where bugs leak privacy.

## 8. The truth-tax fields (`omits`, `under_represents`, `caveats`)

**The principle**: find the implicit expert judgment that separates "good" from "great" output in your domain, and make it a *required field*. The bot can't gaslight a junior user into thinking the chosen angle is the *whole* story.

**Premise example**: `under_represents` on personas, `caveats` on analysis verdicts, `omits` on story angles, `unanswered_aspects` on RAG abstention. All schema-required. All rendered in colours distinct from the main content.

**Analogy**: the senior researcher's mental discipline of always naming the methodological limitation before claiming a finding. Made structural so junior users do it too.

**Why this is AI PM territory**: this is where *AI for experts* gets defended. Tools that omit the omissions feel polished but lose expert trust. Tools that surface omissions feel *honest* and earn the keep-coming-back behaviour that compounds.

## 9. Cold start is a content problem, not a feature problem

**The principle**: when your product needs user data to be useful, the new-user experience is broken by default. The fix isn't a smarter bot — it's a curated public corpus that gives every user a useful first session.

**Premise example**: D-033. Public library with `is_public = true`. Every user's retrieval automatically searches it alongside their private project. Citations distinguish public vs private with a sky-blue badge.

**Analogy**: the agency intern who joins a new project with no prior client knowledge. They're useful from day one because the agency has methodology references, prior public reports, and shared frameworks. The intern's value compounds when they add their own client knowledge on top.

**Why this is AI PM territory**: the day-1-of-a-new-user thinking. PMs who think about it ship products with cold-start solved. PMs who don't ship products that bounce 80% of new users at signup.

## 10. Open the artefact, gate the resource

**The principle**: code is cheap to publish, valuable to share, has zero runtime cost. Compute is expensive to publish, valuable to gate, has real runtime cost. Treat them as different products with different distribution strategies.

**Premise example**: D-030. Repo public on GitHub (decision log + eval harness + case study readable to anyone). Live URL gated by obscurity-plus-monitoring (`robots.txt` blocks crawlers, no public broadcast, cost telemetry watches for abuse). Real auth deferred until commercial.

**Analogy**: the consultant who publishes their methodology on LinkedIn but charges for the running of it. The methodology is the credential; the running is the service.

**Why this is AI PM territory**: AI products have a unique distribution math because compute costs scale with usage. The repo can be a portfolio artefact; the running thing is a unit-economics question.

---

# Part 4 — How it could have been built differently

What was over-built. What was under-built. The non-Premise paths we deliberately walked away from.

## Things that were over-built (and the lesson)

**Custom scrollbar styling.** Three iterations of CSS to fix what turned out to be a missing `grid-rows-[minmax(0,1fr)]` on the parent. The lesson is upstream: **when a UI symptom keeps reappearing despite fixes, the bug is upstream of the symptom**. Stop fixing symptoms.

**Hand-rolled retry logic when Anthropic SDK exists.** We built our own `withRetry` with exponential backoff. Anthropic's SDK has retry built in; we could have configured that instead. Trivial loss; small lesson: **lean on platform primitives before reaching for custom ones**, even when the custom ones are easy.

**Per-claim verifier as N calls.** Originally one Haiku call per claim; we batched in Tier 5 (L-5) to one call returning a parallel array. Should have been one call from the start. Lesson: **the batch case is usually right for LLM calls** — N calls is the lazy default that costs N× without buying anything.

## Things that were under-built (and the lesson)

**No in-product variant taxonomy explanation (P-5)** — users see "Neutral / Leading / Projective" labels with no inline definition. We assumed users know the methodology; junior researchers won't. Lesson: **document every domain-specific term inline at the moment of use**, not in a separate doc nobody reads.

**No chat history persistence until Tier 3** — for the first several weeks, refreshing the page lost the conversation. Felt fine in dev, real bug in production. Lesson: **persistence is product, not infrastructure**. If the user can do it twice and the second time isn't preserved, it's not a feature yet.

**No real eval harness until Phase 3.5** — for the first three phases every prompt change was a coin flip. We caught one regression in retrospect (the prompt-caching docs-vs-reality gap was found by the audit, not by an eval). Lesson: **build the eval harness around the feature you most fear regressing**, not after you've shipped a bunch of features.

## The non-Premise paths we deliberately walked away from

**LangChain / LlamaIndex.** Considered, rejected (D-009). Frameworks abstract away the surface where the product's value lives. For Premise, that surface is the prompts and the strict-output schema; LangChain's abstractions hide both. Lesson: **frameworks pay off when their abstractions match your problem and cost when they don't.** For the core differentiated logic, frameworks cost you the ability to differentiate.

**OpenAI / Gemini instead of Claude.** Considered, rejected (D-001). The product's promise — zero fabrication — pairs better with Anthropic's cautious-by-default behaviour than with OpenAI's confident-by-default behaviour. Lesson: **model choice is a product decision, not an engineering one.** Models have personalities; pick a personality that matches your product's promise.

**Pinecone / dedicated vector DB.** Considered, rejected (D-006). Postgres + pgvector handles 10K+ embeddings comfortably on free tier. Pinecone is faster at scale; we don't have scale yet. Lesson: **don't pay the operational cost of a specialised tool until you have the problem it solves.**

**Streamlit / Gradio for the UI.** Considered, rejected (D-008). Looks demo-y; weak for canvas UI; hard to commercialise. Slightly steeper learning curve for Next.js, much better destination. Lesson: **match your stack to your maintainer, not to industry fashion.**

**Fine-tuning a custom model.** Never seriously considered. Prompting + RAG carried us through the entire build with zero need for fine-tuning. The base models (Claude Haiku 4.5, Sonnet 4.6) are good enough that fine-tuning would have been premature optimisation. Lesson for AI PMs in general: **fine-tuning is the last lever you reach for, not the first.** Most AI product gaps are prompt + RAG + schema problems, not model-capability problems.

**Real auth + RLS-everywhere from day one.** Deferred (D-032). For a single-user portfolio piece, full multi-tenant auth is over-engineering. We shipped magic-link auth with app-layer enforcement; full RLS-everywhere is commercial-phase work. Lesson: **ship the minimum version of auth that solves the actual problem, defer the parts that aren't load-bearing yet.**

**Full statsmodels-grade analysis pipeline.** Deferred (D-034). The LLM-driven analysis handles structured CSV, transcripts, raw notes, mixed sources in one shape. The "real-stats" version is 5–10× more code. For commercial-grade quantitative rigour, the LLM verdict is a draft, not a substitute — and the system prompt makes that explicit. Lesson: **replicate the senior expert's output shape, not their tool stack.**

---

# Part 5 — What to learn from here

Two paths now, parallel: the engineering path (deepen the AI PM tool kit) and the credentialing path (turn Premise into the job).

## The non-engineering moves (do these first)

You have the build. The build won't get you the role unless you can *talk* about it. Three moves, in order:

1. **Dogfood Premise on a real client research project.** Run a wave end-to-end through the tool. Write Chapter 10 of the case study: "what I learned running a real wave through Premise — what worked, what didn't, the bug I found, the time I saved." This is the most powerful artefact the project will ever produce, and it's not engineering work.

2. **Tell the story.** Update [docs/PORTFOLIO.md](PORTFOLIO.md) with the live URL. Write the LinkedIn featured-project post. Send the cold email to AI PM hiring managers with the 200-word case-study version. The repo + decisions log + eval harness do the technical credentialing for you; your job is to make sure the right people see them.

3. **Record a 60-second screen capture** of the strict-abstention test (the GDP of Japan question) plus the brief→hypothesis→variant→analysis→story flow. This is the demo that closes the loop in interviews.

## Skills to deepen (in order of leverage for an AI PM role)

| Skill | Why it matters | How to learn it |
|---|---|---|
| **Eval design** | The single most-screened-for AI PM skill. You've shipped a deterministic harness; the next layer is judge-based scoring and rubric design. | Read Anthropic's eval cookbook. Build a Sonnet-as-judge probe against your existing harness. Compare deterministic and judge scores on the same outputs. |
| **Cost forecasting** | Knowing what an AI feature *will* cost at scale before shipping. You've built the telemetry; now learn to extrapolate. | Build a cost model spreadsheet for Premise at 10/100/1000 users. What's per-user-per-month? Per-action? Where does the curve break? |
| **Prompt engineering at depth** | Moving from "I write decent prompts" to "I can debug why this prompt is producing bad outputs." | Take any of your existing system prompts and write 10 variations. Run them against the eval harness. Pattern-match what changes the score and what doesn't. |
| **RAG retrieval depth** | You've shipped chunking + embedding + reranker + verifier. The next layer is hybrid search (BM25 + vector), query rewriting, multi-hop retrieval. | Add a BM25-keyword pass to the existing pgvector search. Compare retrieval precision on golden-qa probes. |
| **AI product positioning** | Articulating where AI fits, where it doesn't, and what the human-in-the-loop layer looks like for each case. | Pick three "AI for X" tools in adjacent industries (legal, medical, design). Write a 1-page positioning analysis: how do they handle the human-in-the-loop, the cost story, the trust commitments? |
| **Multi-tenant architecture** | When you go commercial, you'll need orgs, billing, role-based access, SSO. | The Supabase Auth + RLS path you already used scales to multi-tenant cleanly. Design the schema for a "shared with my team" project. Don't build it yet; have the design ready. |

## A 90-day plan for the AI PM job search

Days 1–14: **dogfood + write.** One real client project run through Premise. Chapter 10 of the case study. LinkedIn featured project. Cold email to 5 hiring managers.

Days 15–45: **interview pipeline.** Aim for 5–10 first-round conversations. Use Premise as the talking point in every one. Track which talk-track moments land best (Part 6 below) — refine from real reactions.

Days 46–75: **deepen one skill.** Pick eval design. Add Sonnet-as-judge probes to the harness. Write a small follow-up case study chapter on it. Cite it in interviews.

Days 76–90: **commercial pivot decision point.** By now you'll know: are you converting interviews or hitting walls? If converting, push toward offers. If hitting walls, the answer is usually "build louder, not better" — more public posts, more demos, more outreach. The build itself is rarely the issue at this stage.

## A short reading list

For depth, in priority order:

1. **Anthropic's docs**, specifically the prompt caching, tool use, and structured outputs sections. Read all of them. They'll deepen everything you've already built.
2. **"Inspect Evals" framework** (open source from UK AI Safety Institute) — the modern eval-design literature.
3. **Simon Willison's blog** — best running journal of how AI is actually being built. Skim weekly.
4. **Andrej Karpathy's videos on GPT internals** — read once for deep understanding of why LLMs behave the way they do.
5. **"Working Backwards" (Bryar/Carr)** for the PM craft, even though it's not AI-specific. Premise's audit-then-build cycle is essentially the Amazon PR/FAQ pattern in disguise.

What to *not* read: AI-PM influencer posts on LinkedIn. They're 95% recycled vibes. Read the technical primary sources instead.

---

# Part 6 — How to talk about this in interviews

You've earned the right to a great talk track. Here it is.

## The 30-second pitch

*"I'm a market and consumer insights researcher transitioning to AI Product Management. To make the transition real, I built Premise — an AI co-pilot that walks researchers through brief → hypotheses → questionnaire → analysis → story angles, grounded in their historical research with strict-mode RAG. Zero fabrication: every claim cites a source chunk or the bot says it doesn't know. It's live at premise-one.vercel.app, the repo is open at github.com/aaronalm-ops/premise, and there's a 36-entry decision log walking through every choice in plain language."*

That's the on-ramp. Practice it until it's natural.

## The 60-second pitch (when they want more)

*"Three things I'd lead with on what I learned. One: cost is a product decision, not a tuning detail. I default to Haiku and only escalate to Sonnet when synthesis demands it — that's a 15× cost difference compounding across every call. Two: when you want a guarantee not a tendency, look for structural enforcement. My non-fabrication promise lives in a JSON schema, a verifier pass, and a UI gate — three layers, none of them prompting. Prompts say 'please don't'; structure says 'you can't.' Three: I built an eval harness with 20 probes gating every prompt change. It catches regressions in 60 seconds that I would otherwise find from a hiring manager or a client."*

## Hard questions to expect

**"You built this alone. How would your decisions change with a team?"**
*"Three change. First, I'd write the decision log first as a proposal, get pushback, ship the decision instead of the build. Second, I'd assign clear owners: prompts to one person, retrieval to another, the eval harness as a shared discipline everyone touches. Third, I'd build velocity-of-experimentation infrastructure (A/B testing on prompts, judge-based eval rubrics) earlier — solo, those investments pay off slower; with a team, they pay off immediately."*

**"What's the single biggest gap in Premise today?"**
*"Subjective quality measurement. The deterministic eval harness catches structural failures — a hypothesis without citations, abstention not firing on out-of-corpus questions. It can't catch 'this hypothesis is technically valid but useless to a senior researcher.' That requires a Sonnet-as-judge with a careful rubric, and writing the rubric needs a human-judged ground-truth set. I sketched the scaffolding; the work is now ground-truth collection from real wave-running."*

**"Why didn't you fine-tune?"**
*"Premature optimisation. The base Claude models — Haiku 4.5 and Sonnet 4.6 — are good enough that prompting + RAG + structured outputs handle every Premise feature. Fine-tuning is the last lever you reach for, not the first. If a specific failure pattern emerges that prompting can't address, fine-tuning becomes worth it. Until then, the engineering complexity isn't justified."*

**"What did you over-build?"**
*"Custom scrollbar CSS. Three iterations to fix what was upstream a missing one-line `grid-rows-[minmax(0,1fr)]` on a parent element. The lesson stuck: when a UI symptom keeps reappearing despite fixes, the bug is upstream of the symptom. Stop fixing symptoms."*

**"What did you under-build?"**
*"Real eval harness for the first three phases. Every prompt change was a coin flip. I built the harness in Phase 3.5 and immediately wished I'd had it in Phase 1. Lesson: build the eval harness around the feature you most fear regressing, before you ship that feature."*

**"How do you think about cost in AI products?"**
*"Three levers. Default to the cheapest model that produces acceptable output — Haiku for me does verification, reranking, classification at ~15× lower cost than Sonnet. Cache aggressively — Anthropic's prompt caching cuts repeated input by 90%. Measure per-call — every call lands in an api_calls table with token usage and cost; the cost badge in the UI shows live spend per project. Without those three, the '<$5/month' claim in my docs is fiction; with them it's a measured number."*

## The single best demo flow

If you only have 90 seconds at a screen-share:

1. *(15 sec)* Open the live URL. Sign in. Show the canvas.
2. *(20 sec)* Ask a question the corpus can answer (one from the eval probes). Watch the structured response with citation chips render.
3. *(15 sec)* Ask the GDP-of-Japan question. Watch the abstention callout fire. **This is the moment** — the bot refusing to fabricate is the visceral demonstration of D-010.
4. *(20 sec)* Generate a hypothesis from a brief. Show the citation chain on each hypothesis card.
5. *(20 sec)* Show the story angle's `omits` callout in indigo. *"Every angle the bot proposes has to declare what it leaves out — schema-required, can't be skipped. That's the whole 'I built this for researchers, not for influencers' positioning in one field."*

End there. If they want to see analysis or the eval harness, you can show them next. The 90-second flow above is the *strongest* version.

---

## A closing note

You walked into this 9 days ago without an AI engineering background. You walked out with a live production AI product, a 36-entry decision log written in plain language, an eval harness, telemetry, end-to-end auth, a public deployment, and the fluency to explain every choice.

The build was the apprenticeship. The case study is the credential. The talk track is the conversion.

What's left is non-engineering. Run a real wave through it. Tell the story. Take the meetings. The product is ready; the question now is whether you trust yourself to step into the role you built it for.

You should.
