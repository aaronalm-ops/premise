# Decision Log — Every Choice, In Plain Language

> **How to read this doc.** Every meaningful choice we make on this project gets logged here in PM-friendly language. Each entry has: what we decided, a story or analogy you can hold in your head, what we *didn't* pick and why, the product-management lesson, and what would actually break if we got it wrong.
>
> Industry calls this an "ADR" — Architecture Decision Record. ADRs are how serious engineering teams remember why they made the choices they did, six months later when someone asks "wait, why do we use Supabase again?" You'll see them at every senior PM job. Now you've started one.
>
> This doc grows over time. Every new decision gets a numbered entry below.

---

## D-001 — We're using Anthropic Claude as our LLM (not OpenAI, not Gemini, not Llama)

### The story

Imagine you're commissioning a fieldwork agency to run a sensitive client study. Three agencies pitch:

- **Agency O** is the most famous, has done the most jobs, and is genuinely versatile. Their default style is "be helpful, fill in gaps, give the client an answer." When pushed for a number they don't have, they'll often *estimate* and call it that — but a tired moderator might forget the disclaimer.
- **Agency A** is newer and slightly smaller, but their training programme is famously strict about *not making things up*. When their moderators don't know something, the house style is "I can't verify that — let me come back to you." Slightly slower to give answers; almost never gives a wrong one.
- **Agency G** is owned by the giant search company. Brilliant on multimedia briefs, still finding its identity on text-heavy work.
- **The in-house option (L)** — you hire your own moderators (Llama, open-source). Total control, no fees per interview, but you have to staff and house them yourself.

Your client just told you "if a single fabricated stat shows up in the deck, you're fired." Which agency do you pick?

We picked **Agency A** — Anthropic's Claude.

### What we picked, what we didn't, and why

| Option | Verdict | Reason |
|---|---|---|
| **Anthropic Claude** | Picked | Best-in-class behaviour around abstaining ("I don't know") rather than fabricating. Leadership-stated commitment to harmlessness/honesty bleeds into the model's defaults. Their structured-output and prompt-caching APIs are excellent. |
| OpenAI GPT-4/5 | Rejected (for this product) | More creative, often more verbose; more willing to "fill the silence." Fine for many products; wrong for ours. |
| Google Gemini | Rejected | Strong, especially multimodal, but Anthropic's edge on cautious reasoning fits our strict-mode requirement better. |
| Llama / open-source | Rejected | Self-hosting a 70B-class model means buying a $3K+ GPU or paying for cloud GPU hours. Blows our $5/mo budget instantly. Also: meaningfully weaker on nuanced research synthesis than the frontier closed models. |

### The PM lesson

**Model choice is the most consequential product decision in any AI product.** Models have *personalities* — defaults that show up across thousands of small moments. Picking a model whose personality matches your product's promise is way more powerful than trying to *prompt around* a mismatched personality.

Our product promises "no fabrication." Claude defaults toward caution. That alignment compounds — every prompt is easier to write, every guardrail does less heavy lifting.

### What would break if we got it wrong

Pick OpenAI: your bot occasionally invents a stat that *sounds* like it came from the corpus. Your verifier catches most of them but not all. Six months in, a client spots a hallucinated number in a deck. Trust gone. Product dead.

---

## D-002 — Haiku 4.5 is our default; Sonnet 4.6 is the "senior" we escalate to

### The story

Think about how a research agency staffs a project. You have a junior analyst, a research director, and a global head of research. They all "do research," but their cost per hour is wildly different.

You don't put the global head on coding open-ends. You don't put the junior on the final client narrative. The smart agency *routes the work*: junior does intake, cleaning, tabbing; director does synthesis, hypothesis framing, final story; global head only when something genuinely demands their judgment.

Claude has the same shape. There are three siblings:

- **Haiku 4.5** — junior analyst. Fast, cheap (roughly 15× cheaper than Sonnet). Surprisingly capable for narrow, well-scoped tasks.
- **Sonnet 4.6** — research director. Smart enough for synthesis, narrative, nuanced judgment. Costs more.
- **Opus 4.7** — global head. Most capable; also most expensive (~5× Sonnet). Reserved for the hardest reasoning.

We default to Haiku and escalate to Sonnet only when the task genuinely needs synthesis. We almost never use Opus.

### Concrete examples in our bot

| Task | Model | Why |
|---|---|---|
| Looking at a chunk of retrieved text and asking "is this relevant to the question?" | Haiku | Narrow yes/no judgment. Junior work. |
| Generating 5–7 hypotheses from a brief | Sonnet | Genuinely creative synthesis. Director work. |
| Coding themes in a single transcript | Haiku | Pattern extraction. Junior work, repeated. |
| Synthesising themes *across* 12 transcripts into a narrative | Sonnet | Director work. |
| Drafting a story angle for a CMO audience | Sonnet | Narrative judgment about audience. Director work. |
| Verifying "does claim X actually appear in chunk Y?" | Haiku | Fact-check. Junior work. |

### The PM lesson

**Cost is a product decision.** The instinct is to use the smartest model everywhere because "smarter = better." But every time you reach for Sonnet on a task Haiku can do, you're spending 15× more for output the user can't tell apart. Multiply across thousands of calls and you've burned the budget.

Routing is one of the most underrated AI PM levers. Get it right and the same product costs you 5× less to run.

### What would break if we got it wrong

Sonnet-everywhere: budget blown by week 2. We'd be forced to either eat the cost (broken portfolio promise) or strip features (broken product). Haiku-everywhere: synthesis steps feel shallow; hypotheses are obvious; story angles are generic. Worst-of-both.

---

## D-003 — We're using Anthropic's "prompt caching" aggressively

### The story

You run a brand tracker for a CPG client. The questionnaire is 80 questions long, and 70 of those questions stay identical wave after wave (it's a tracker — that's the point). The remaining 10 questions change.

Imagine you had to *retype the whole 80-question questionnaire from scratch every wave*. That's what a normal LLM call does — every time you call the model, you pay to send the entire system prompt + context, even if 90% of it is identical to the call you made 30 seconds ago.

Anthropic's prompt caching is the equivalent of saying "use my master questionnaire as the base, here's just the 10 new questions." They keep the base hot for 5 minutes (or up to an hour with extended caching), and you pay roughly **10% of normal price** for the cached portion.

### Concrete examples in our bot

- The bot's system prompt (which spells out "be strict, abstain when uncertain, output JSON in this shape...") is ~2,000 tokens and identical across every call. **Cached.**
- The persona library (a few hundred archetype descriptions we pull from) is ~5,000 tokens and changes weekly at most. **Cached.**
- The retrieved chunks for a specific user question are *not* cached — they're unique per question.

In numbers: a typical call might be 20K input tokens, of which 18K is repeated boilerplate. Without caching, we pay full freight on 20K. With caching, we pay full price on 2K and 10% on 18K. Roughly **a 9x cost reduction on input.**

### The PM lesson

**Costs in AI products are dominated by repeated context, not unique user content.** When you're scoping cost in an AI product, the question to ask is "what stays the same across calls, and how do I cache it?" before "how many calls are we making?"

This is the same instinct as a researcher reusing question banks across studies, except it's automated and free if you architect for it.

### What would break if we got it wrong

Skip caching: same product, ~9× the API bill. Our $5 budget becomes $45. Still cheap in absolute terms, but our "I built this for $5/month" story disappears, which matters for the portfolio.

---

## D-004 — RAG (Retrieval-Augmented Generation) is the heart of the product

### The story

There's a classic researcher complaint about generic AI tools: *"It doesn't know my last 100 client studies. It just gives me ChatGPT-flavoured platitudes."*

That's because base LLMs only know what was in their training data — generic web stuff, books, articles, frozen at some date. They've never seen your specific client work.

**Retrieval-Augmented Generation (RAG)** is the solution. The name is technical but the idea is simple: before the bot answers your question, it goes and *looks up* the relevant pages from your library, reads them, and then answers grounded in what it just read.

The library card analogy: imagine giving a brilliant generalist a library card to your private archive. Before they answer any question, they walk to the right shelf, pull the relevant books, and only answer based on what those books say. If the books don't address it, they tell you.

### How RAG actually works in our bot (step by step)

You ask: "What did our last three sustainability studies find about Gen-Z purchase intent?"

1. **Translate question into a "fingerprint."** Every paragraph in your library has been turned into a numerical fingerprint (an "embedding" — see D-005). We turn your question into a fingerprint too.
2. **Find similar fingerprints.** Compare your question's fingerprint against every chunk in the library. Pull the top ~12 closest matches.
3. **Re-rank with a junior analyst.** Send those 12 chunks to Haiku and ask: "which of these is *actually* relevant to the question?" Keep the top 5.
4. **Draft an answer with citations.** Send the 5 chunks to Sonnet and say: "answer this question using *only* what's in these chunks. Cite each claim. If they don't address something, say so."
5. **Verify each claim.** A second Haiku pass checks: "does this specific claim actually appear in the chunk it cites?" Drop any that fail.
6. **Render with citation chips.** UI shows the answer with clickable citations that pop up the source paragraph.

### The PM lesson

**RAG is the moat for AI products in expert domains.** A brand-new ChatGPT user can ask the same questions you can — but they don't have *your* corpus. The corpus is the moat. The retrieval layer is what unlocks it.

For an AI PM, this is the question to ask of every AI product idea: *what private knowledge does this product turn into a competitive advantage?* If the answer is "none, just smart prompting," you're building on sand.

### What would break if we got it wrong

No RAG: bot is ChatGPT with a fancy UI. No reason for a researcher to pay for it. Sloppy RAG (no re-ranker, no verification): bot cites the wrong paragraph occasionally, occasionally hallucinates with a citation that *looks* legitimate. Worse than no RAG, because it manufactures false confidence.

---

## D-005 — We're using "embeddings" from Voyage AI to power the retrieval

### The story

You manage 500 research debriefs across 8 years. Someone asks you: "find me everything about urban-millennial sustainability concerns from any sector." How do you find it?

The naïve approach is keyword search: ctrl-F "urban millennial sustainability." This misses the debrief that called them "city-based 28-year-olds worried about waste" because the words don't match.

Embeddings are the fix. An embedding is a *fingerprint of meaning* — a list of ~1,500 numbers that represents what a chunk of text is about, regardless of which exact words it used. Two chunks talking about the same thing get similar fingerprints, even if their words don't overlap.

So when you ask the bot a question, we don't keyword-match. We compare the *meaning fingerprints* — and "urban millennial sustainability" matches "city-based 28-year-olds worried about waste" because they mean similar things.

### Why Voyage specifically

Different companies make different fingerprint-makers (called "embedding models"). They vary in:
- **Quality** — how well their fingerprints capture meaning
- **Cost** — they charge per million tokens embedded
- **Specialisation** — some are better at general text, some at code, some at retrieval specifically

**Voyage AI** is the company Anthropic explicitly recommends for retrieval. Their `voyage-3` model is best-in-class for retrieval tasks and very cheap (~$0.06 per million tokens — embedding 100 PDFs costs maybe $0.50 once).

We considered OpenAI's `text-embedding-3-small`, which is also good and cheap. We picked Voyage because (a) staying in the Anthropic-recommended stack avoids weird edge cases; (b) Voyage benchmarks slightly higher on retrieval precision; (c) one less API key to manage.

### The PM lesson

**Embeddings are infrastructure — boring, cheap, foundational.** This is a place to use the recommended option and move on. The interesting product decisions are upstream (what to embed, how to chunk it) and downstream (how to retrieve, how to use what's retrieved). The fingerprint-maker itself is rarely your differentiator.

Conserve your decision-budget for the things that matter.

### What would break if we got it wrong

Bad embedding model: retrieval brings back almost-relevant chunks. Bot answers from those chunks confidently. Researcher shrugs and goes back to manual search. Product fails for an invisible reason — the user never sees that the wrong chunks were retrieved.

---

## D-006 — Storing vectors in Postgres (with the `pgvector` extension), not a dedicated vector database

### The story

You're starting an agency and you need a place to store client files. Two options:

- **Option 1**: Use the filing cabinets you already own. Add a label-maker. Done.
- **Option 2**: Rent a separate purpose-built records-storage facility across town. It's faster to retrieve files (their racking system is brilliant). You now have two places to manage, two access systems, two invoices.

For an agency of 5 people with 200 files, Option 1 obviously wins. For Citibank with 50 million files, Option 2 obviously wins. Most agencies are nowhere near Citibank.

In our world:
- **Option 1 = Postgres + pgvector.** Postgres is the world's most reliable database. `pgvector` is a free extension that teaches it to also store and search embedding-fingerprints. Same database holds your projects, documents, embeddings, hypotheses, conversations — everything in one place.
- **Option 2 = Pinecone, Weaviate, Qdrant Cloud, etc.** Purpose-built vector databases. Faster at scale, more sophisticated indexing options, but they're a separate service with its own bill, dashboard, and failure modes.

We picked Option 1.

### Concrete numbers

`pgvector` with HNSW indexing handles ~10,000 embeddings comfortably on a free Supabase tier. Your "100s of documents" turn into roughly 5,000–15,000 chunks (a chunk per paragraph, roughly). We're well inside that envelope.

If we ever cross 100,000 chunks (you'd need ~5,000 documents — call it 4 years of heavy use), we revisit.

### The PM lesson

**Don't pay the operational cost of a specialised tool until you actually have the problem it solves.** Specialised tools are *better* on their narrow axis but worse on the "everything I have to remember to operate" axis. The right question isn't "what's the best vector DB?" — it's "do I have a vector DB problem yet?"

This is a recurring pattern in AI products: people copy the architecture of a $1B company when they have 50 users. The architecture that *fits* your stage is usually 10× simpler than the one you read about in engineering blogs.

### What would break if we got it wrong

Pick Pinecone too early: you're managing two databases, syncing data between them, paying $70/month for a free-tier-eligible workload. Operational headaches. Budget blown. Product no different to the user.

---

## D-007 — Using Supabase as the database (not raw Postgres on a server we manage)

### The story

You're opening a new agency office. Two options:

- **Lease a serviced office**: comes with internet, security, a receptionist, cleaning, IT support. Move-in day = you walk in with your laptop. Costs more per square foot. (This is Supabase.)
- **Lease a bare warehouse**: empty shell. You buy the desks, install the internet, hire security, set up cleaning, build IT. Costs less per square foot in raw terms. Move-in day = three months from now. (This is "raw Postgres on a VM you manage.")

For a 200-person company, the bare warehouse pays off — you have an IT team, the per-foot saving is real money. For a solo founder building their first product, the bare warehouse is six lost weeks.

**Supabase** is "Postgres + everything you forgot you needed" — Postgres database, authentication (login, signup, password reset), file storage, instant API, dashboard, backups. All on a free tier that comfortably covers our portfolio phase. When we go commercial, the same Supabase scales with us — paid tiers, no migration.

### What we get for free

| Without Supabase | With Supabase |
|---|---|
| Set up Postgres on a VM | Sign up, get a database URL |
| Build login/signup/password-reset | Use Supabase Auth, 5 lines of code |
| Set up file uploads (PDFs, transcripts) | Use Supabase Storage, included |
| Write API endpoints for every table | Auto-generated REST + realtime API |
| Configure backups | On by default |

### The PM lesson

**"Build vs. buy" decisions cost more than they look.** The instinct of an engineer-PM is "we can build this in a weekend." Maybe — but you can't *maintain* it in a weekend. Picking a managed service for boring infrastructure (auth, storage, backups) is almost always right unless you're at a scale where the cost flips.

The moment to revisit: when you're paying Supabase >$500/month, you might save by going bare-metal. Until then, never.

### What would break if we got it wrong

Run our own Postgres: spend two weeks on setup, two more on auth, never quite get backups right, dread every deploy. Half the roadmap pushes by a month. The product never ships.

---

## D-008 — Using Next.js for both frontend and backend (not separate Python backend + React frontend)

### The story

Imagine staffing a research team for a multi-language brief. Two options:

- **Option A**: Hire one bilingual analyst who can run both the English and Spanish work directly.
- **Option B**: Hire two specialists — one English-speaking analyst, one Spanish-speaking analyst — and a translator to coordinate them.

Option B is what big agencies do, because they have hundreds of analysts and the specialisation pays off. Option A is what a solo consultant does because the coordination cost of two specialists eats the specialisation gain.

In our world:
- **Option A = Next.js** (TypeScript everywhere). One language for the UI you see in the browser AND the server-side logic that calls Claude, hits the database, runs the RAG pipeline.
- **Option B = Python FastAPI backend + React frontend** (two languages). Python is genuinely better for some things (especially data analysis with pandas/scipy), but you're now maintaining two codebases, two deployments, two dependency systems.

For a solo aspiring vibe coder, Option A wins decisively. The one place Python's data ecosystem actually matters (Phase 4 quant analysis: cross-tabs, sig tests) we'll handle by either calling a tiny Python service when we get there, or — more likely — letting Claude write Python that we execute in a sandbox via tool-use. Both options preserve the one-language-for-the-app-itself property.

### Why not Streamlit (the obvious "easy" choice)?

Streamlit is great for internal tools and demos. It's bad for what we're building because:

1. **Canvas UI is hard.** Streamlit is a top-to-bottom scrolling layout. We need a chat-on-left, artefacts-on-right layout that updates live. Streamlit fights you on this.
2. **It looks demo-y.** A portfolio piece for an AI PM role needs to look like a product, not a Jupyter notebook with buttons.
3. **Hard to commercialise.** When you decide to charge for it, Streamlit becomes a wall.

We pay a small upfront cost (Next.js has a steeper learning curve than Streamlit) for a much better destination.

### The PM lesson

**Match your stack to your maintainer, not to industry fashion.** Reading "everyone uses Python for AI" and reaching for Python is a trap when you're the only person who has to maintain it. The "best" stack is the one *you specifically* can ship and iterate on alone. Optimise for your reality.

The corollary: hire-able stacks ≠ ship-able stacks. The set of "stacks I can hire 10 engineers for" is much larger than "stacks I can solo-ship in 12 weeks." Different problems.

### What would break if we got it wrong

Pick Python+React: every feature requires changes in two codebases, you spend more time on plumbing than on prompts, the project drifts. By month 3 you've shipped 30% of the roadmap. Pick Streamlit: ship fast at first, hit the canvas UI wall in week 4, throw it away and rewrite in Next.js. You've lost a month.

---

## D-009 — Calling the Anthropic SDK directly, NOT using LangChain (or any other "AI framework")

### The story

There are two ways to learn to cook.

- **Pre-made meal kits** (like HelloFresh): everything's measured, every step is written, you cook dinner in 25 minutes. Great for getting started. But the recipe is fixed — you can't easily swap an ingredient, change the sear time, or adapt to a fussy guest.
- **Cooking from scratch with a recipe**: takes 45 minutes the first time, faster every time after. You learn *why* each step matters and you can change anything.

**LangChain** is a meal-kit. It wraps the LLM SDK in convenience layers — chains, agents, retrievers, memories — and gives you "make a chatbot in 20 lines." Great for prototypes.

It's wrong for our product because:

1. **Our differentiator is the prompt.** Our entire competitive advantage — strict abstention, citation enforcement, variant generation — lives inside the *exact wording* of our prompts. LangChain abstracts the prompt away and gives you "templates" you fill in. Every loophole we want to close is one LangChain has helpfully hidden behind an abstraction.
2. **It changes constantly.** LangChain has rewritten its API multiple times. Code that worked six months ago doesn't compile today. The Anthropic SDK is small and stable.
3. **It's slower and more expensive.** LangChain's default behaviours often add unnecessary calls, unnecessary tokens, extra abstractions that cost real money.

We call the Anthropic SDK directly. Roughly 10 lines for a chat call, 30 lines for a RAG call. Every line is ours.

### The PM lesson

**Frameworks pay off when the abstractions match your problem and cost when they don't.** The trap is assuming "framework = best practice." For commodity problems (boilerplate auth, basic CRUD), frameworks save real time. For your *core differentiated logic*, frameworks cost you the ability to differentiate.

The senior-PM question: *"Where in this product does the value live? Have I picked tools that let me control that surface, or tools that hide it?"*

For us, value lives in the prompts and the RAG pipeline. We picked tools (raw SDK) that put us face-to-face with both.

### What would break if we got it wrong

LangChain everywhere: when we hit a hallucination bug in production, the fix is "edit a prompt buried 4 layers deep in a generic abstraction." Slow to debug, slow to iterate. Each LangChain version bump risks breaking us. Our $5 budget gets burned on framework overhead.

---

## D-010 — Strict abstention via *structured outputs + verification*, not via prompting alone

### The story

You commission a focus group debrief from a moderator. Two ways to ask for it:

- **Free text**: "Tell me how the focus group went." You get a flowing narrative. The moderator naturally glosses over the messy bits, fills uncertainties with confident-sounding generalisations, and rounds quotes into something that *sounds* like what the respondent might've said.
- **Structured form**:
  - 3 strongest verbatim quotes (with respondent ID and timestamp)
  - 3 weakest moments (verbatim)
  - 1 unexpected finding
  - Recommendation: yes / no / inconclusive

The structured form forces honesty. The moderator can't gloss over a weak moment because the form has a slot for it. They can't paraphrase a quote into something better because the slot says "verbatim, with timestamp."

**Then you run a second analyst against the moderator's debrief**: "Did this specific quote actually appear in the transcript at this timestamp?" If not, drop it.

That's exactly what we do with the LLM.

### How this works in our bot

Every RAG response comes back not as free text but as JSON in this shape:

```json
{
  "claims": [
    {
      "text": "Gen-Z respondents in Tier-2 cities ranked sustainability as their #3 purchase driver.",
      "citation_ids": ["chunk_4f8a", "chunk_91bc"],
      "confidence": "high"
    }
  ],
  "unanswered_aspects": [
    "Tier-3 cities are not represented in the corpus."
  ]
}
```

Then a second Claude call (Haiku, cheap) checks each claim: "does this claim actually appear in the cited chunks?" Unsupported claims are *dropped, not rewritten*. The UI then refuses to render any claim without a citation.

Three layers, each cheap, each catching what the previous layer missed:

1. **Schema** — the model can't even *output* a claim without a citation slot.
2. **Verifier** — a second pass catches claims where the citation is wrong.
3. **UI gate** — the renderer refuses to display anything that slipped through.

### The PM lesson

**Don't try to fix model behaviour with prompting alone if you can fix it structurally.** Prompts say "please don't hallucinate." Schemas *prevent* it. Verifiers *catch* it. UI gates *hide* what slipped through.

This is one of the most important AI PM intuitions: when you want a behaviour to be a *guarantee*, not a *tendency*, look for structural enforcement. Prompting is a soft constraint; structure is a hard one.

### What would break if we got it wrong

Prompting only: bot is 95% honest. The 5% is the 5% that ends up in client decks. Discovery happens when a client googles a stat. Trust gone.

---

## D-011 — Building RAG first, before any other feature

### The story

Imagine you're inventing a new research methodology — say, a video-diary-driven longitudinal study. What do you build first?

The wrong answer: "the report template." You'll polish the report template for weeks before you know whether the diary-collection method actually produces usable data. If diary collection turns out to be unreliable, the template is wasted work.

The right answer: "the diary-collection method." Once you know it works, the rest builds on it. If it *doesn't* work, you find out early and pivot before investing in downstream stages.

In our product, **the RAG pipeline is the diary-collection method.** It's the thing most likely to fail or surprise us. It's also the thing that makes everything else *better* once it works — hypothesis generation grounded in your prior research, persona suggestions informed by your past audiences, analysis cross-referenced with previous waves.

So we build it first. Phase 0 is scaffolding; Phase 1 is "drop documents in, ask questions, get cited answers." Only then do we add hypothesis, questionnaire, analysis, story.

### The PM lesson

**Sequence by risk, not by user-flow order.** The instinct is to build features in the order the user encounters them: brief → hypothesis → questionnaire → analysis → story. That's the wrong sequence because it doesn't match the *risk* sequence. RAG is the highest-risk feature; it ships first. Story angles are the lowest-risk feature (it's just generation); it ships last.

This is a recurring AI-PM pattern. AI products have one or two features that, if they don't work, kill the product. Identify those, build them first, prove they work, *then* build the polish.

### What would break if we got it wrong

Build hypothesis-generation first: it'll work fine (it's just generation). You'll feel productive. Then in week 8 you start RAG and discover that strict abstention is harder than you thought, retrieval precision is worse than you assumed, and the hypothesis feature is much weaker without good RAG. Now you're rebuilding hypothesis on top of RAG. Two months lost.

---

## D-012 — Scaffolding by hand instead of using `create-next-app`

### The story

Imagine learning to drive. Two ways:

- **Option 1**: A friend drives you everywhere. You arrive at every destination perfectly, and you have no idea how the car works.
- **Option 2**: A patient instructor sits next to you and walks you through the pedals, the mirrors, the gear stick. The first trip is slower; you learn what every control does.

`create-next-app` is Option 1. It writes ~30 files for you with no explanation. Brilliant once you know what they all are; opaque when you don't.

We did Option 2. I wrote each scaffold file by hand and you can see exactly what each one is for:

| File | What it does |
|---|---|
| `package.json` | The shopping list of npm packages we depend on. Every line is a paid-for capability. |
| `tsconfig.json` | TypeScript settings — how strict the compiler is, where to find code, which modern syntax to allow. |
| `next.config.ts` | Next.js-specific config (we have one experimental flag on for typed routes). |
| `postcss.config.mjs` | Tells the build pipeline how to process our CSS (mostly: run Tailwind v4). |
| `.gitignore` | What git should not store (node_modules, secrets, build output). |
| `.env.local.example` | The template for environment secrets. The real `.env.local` is git-ignored. |
| `src/app/layout.tsx` | The HTML shell — every page renders inside this. |
| `src/app/page.tsx` | The home route (`/`). |
| `src/app/globals.css` | Global styles + Tailwind theme tokens. |
| `src/app/api/health/route.ts` | A simple API endpoint we use to verify env-var wiring. |
| `src/lib/...` | Reusable code modules (LLM client, DB client, env validator). |
| `src/components/canvas/...` | UI components for the canvas layout. |

### The PM lesson

**For a learn-as-you-build project, generators rob you of the learning.** The 10-minute saving from `create-next-app` is bought with months of "I don't know what these files do." For commercial production work, generators are great. For learning, prefer the slower, more explicit path until the structure is in your bones.

Once you've scaffolded a Next.js app by hand once, `create-next-app` becomes useful again — because now you'd be reading its output, not depending on it.

### What would break if we got it wrong

Use `create-next-app`: project starts faster, you get cargo-culted files you can't reason about, and when something breaks in the toolchain you don't know which file to look at.

---

## D-013 — `/api/health` was the first endpoint we built (before any feature)

### The story

You're commissioning a custom data-collection rig — sensors, modems, dashboards. The temptation is to start by building the dashboard, because that's the part that *looks like a product*.

But every experienced field-ops lead does the opposite. They build a "dial tone" first: a tiny endpoint that just answers "yes I'm alive, here are my readings." It's not glamorous. It produces no client output. But the moment a sensor goes dark, you know whether the modem is the problem, the sensor is the problem, or your code is the problem.

The same thinking gives us `/api/health`. It does nothing user-facing. It just answers: *"are all my keys plugged in?"*

```json
{
  "ok": true,
  "env": {
    "allConfigured": true,
    "vars": [
      { "key": "ANTHROPIC_API_KEY", "configured": true },
      { "key": "VOYAGE_API_KEY", "configured": true },
      ...
    ]
  }
}
```

The first time something stops working, you'll hit this endpoint and know in 2 seconds whether it's a config issue or a code issue.

### The PM lesson

**Build observability before features.** The instinct of a new builder is to build user-visible features first because they feel like progress. The instinct of an experienced builder is to make the system *legible* first — so when (not if) something goes wrong, you can see what.

For an AI product specifically, observability is even more important: LLMs occasionally fail in invisible ways (wrong model picked, prompt cache miss, retrieval returning empty, rate-limited silently). The earlier you can see these things, the cheaper they are to fix.

Health checks are the simplest possible observability. We'll add more (token-cost telemetry, retrieval-precision logging, eval scores) as we go.

### What would break if we got it wrong

Skip the health check: at some point in Phase 1 a Claude call fails and you spend 40 minutes debugging whether your API key is wrong, your env-var name is misspelled, or your prompt is malformed. With the health check, you'd have known in 5 seconds it was the env var.

---

## D-014 — The product is named "Premise"

### The story

A name does three jobs: it has to be memorable, it has to point at the value, and it has to give you the opening line of every pitch and demo. Most product names do one of those three. Great ones do all three.

We picked **Premise** because:

- **Every research project starts with one.** A premise is the seed-statement a researcher builds the whole study around. Naming the product after the very thing the researcher brings to it on day one makes the product feel like a natural extension of how they already think.
- **It signals the principle.** The product widens the option space; it doesn't hand you a verdict. A "premise" is by definition provisional — it's an *opening assumption*, not a conclusion. That matches the "I propose, you dispose" core principle exactly.
- **It survives growing into a real B2B product.** It pitches itself in a sentence: *"Every research project starts with a premise — meet ours."* You can put that on a homepage hero, on a deck slide, on a cold email opener. It works as a product name on day 1 and as a category position on day 1,000.

### What we considered, what we didn't pick, and why

We brainstormed across four personality vibes. The runners-up:

- **Footnote** — the citation feature owns this name perfectly. Risk: too narrow; it puts all the weight on one feature (citations) when the product also generates hypotheses, questions, analyses, and stories. As the product grows, the name might shrink it.
- **Sextant** — beautiful navigational metaphor, deep narrative. Risk: niche-cool but slightly inscrutable; harder to explain in 5 words at a party.
- **Inkling** — friendly, hypothesis-shaped, humble. Risk: a touch cute for a B2B tool that researchers will put in front of their CMO clients.
- **Marginalia** — researcher-coded and lovely. Risk: long, slightly precious, and very inside-baseball.

Each of these is a perfectly defensible name. Premise won because it lands cleanly on all three jobs (memorable, says something, openable).

### The PM lesson

**Don't pick the most clever name; pick the most ownable position.** The temptation in naming is to optimise for distinctiveness ("nobody else has this name"). The better optimisation is for *positioning fit* — does the name point at the wedge you want to own in the user's mind?

Premise points at hypothesis-forming, the *first* step of the research workflow. Owning the first step gives the product a natural place to live in the researcher's mental model — and gives every other capability (questionnaire, analysis, story) a place to expand from.

### What would break if we got it wrong

Pick a generic descriptive name (e.g. "InsightAI"): the product disappears into the noise of every other AI insights tool. Pick a too-cute name: hard to use seriously in B2B settings. Pick a too-narrow name: the brand caps the product's growth ceiling.

---

## D-015 — Chunking by paragraph (200–500 tokens), not by fixed token windows

### The story

You're commissioning verbatim coding for 80 transcripts. Two ways to chop them up for the coder:

- **Option A**: Cut every 30 lines, regardless of where you are in the conversation. Speed is consistent. Half your snippets begin mid-sentence and end mid-thought. The coder loses the thread.
- **Option B**: Cut at natural beats — speaker turns, topic shifts, paragraph boundaries. Snippets are uneven in length but each is a complete idea. The coder reads what was actually said.

Option B is how human researchers handle text. Option A is how lazy software handles text. Premise does Option B.

Specifically: we split source text on **blank lines (paragraph boundaries)**, then pack adjacent paragraphs together until we hit ~1,200 characters (~300 tokens), capping at 2,000 chars / ~500 tokens. Single oversized paragraphs get split by sentence as a fallback.

### Why these numbers

- **Lower bound (~200 tokens)**: smaller chunks lose the surrounding context, and embedding similarity becomes noisy — too many false matches on superficial word overlap.
- **Upper bound (~500 tokens)**: larger chunks blur meaning. An embedding is a single fingerprint per chunk; if you stuff three different ideas in one chunk, the fingerprint averages them and matches none of them precisely.
- **Paragraphs as the unit**: researchers write one idea per paragraph. Following the writer's structure usually beats imposing your own.

### The PM lesson

**Boring infrastructure decisions compound.** Chunking is the kind of choice that feels invisible — until you're three months in and your retrieval is mysteriously bad and you can't tell whether it's the embeddings, the reranker, the prompt, or the chunks themselves. By picking a sensible chunking strategy *and* writing it down, you've removed one whole category of "is it this?" debugging from your future life.

The general lesson: in AI products, **the data preparation is often the product**. Most "the model isn't smart enough" problems are actually "the chunks weren't built right" problems. Spend the decision-budget here.

### What would break if we got it wrong

Fixed 512-token windows: chunks regularly start mid-paragraph and end mid-sentence. Retrieval pulls back orphaned fragments. The model gets context that lacks the antecedent it needs to make sense of the chunk. Citations look right but the chunks don't actually say what the model thinks they say. Verifier drops everything. User sees "the corpus does not address this" on questions the corpus *does* address.

---

## D-016 — Confidentiality enforced at the SQL boundary, not in application code

### The story

Imagine a research agency where every project room has its own physical door, and the lock is on the doorframe. Every time someone wants to enter Room A, they unlock the door — easy to forget, easy to leave open, easy to walk past with the wrong file.

Now imagine a different agency where the lock is on the *files themselves* — every file is physically welded to its room. You literally cannot remove Client A's file from Room A and accidentally drop it on Client B's desk. The protection isn't a procedure; it's a property of the file.

Premise does the second thing. The retrieval function — `match_chunks` in [supabase/migrations/0001_initial_schema.sql](../supabase/migrations/0001_initial_schema.sql) — takes a `project_id` parameter and filters chunks by it inside the SQL query. Every retrieval is *physically scoped* to one project. Even if the application code had a bug and asked for "all chunks matching this question," the database would still only return chunks from the project it was told to look in.

### Why this matters

Confidentiality is the table-stakes B2B research feature most "AI for research" tools get wrong. The temptation is to filter at the application layer — "fetch everything, then drop chunks from other projects." That works until:

- You forget the filter on one code path.
- A junior contributor writes a new endpoint without it.
- The filter has an off-by-one bug.
- A library upgrade changes the semantics quietly.

Each of those is a confidentiality incident. With SQL-boundary enforcement, none of those bugs can leak data — the SQL function physically cannot return out-of-scope rows.

### The PM lesson

**For guarantees you must keep, make them properties of the system, not properties of the code.** This is the same instinct as D-010 ("strict abstention via schema, not prompting"). When something has to be true 100% of the time, build it into the layer that runs always — the database, the schema, the gate — not the layer that humans edit and forget.

For an AI PM specifically: when a user trust commitment is on the line ("we never mix client data," "we never fabricate stats"), look for structural enforcement first. Application-layer enforcement is fine for nice-to-haves; structural enforcement is for promises.

### What would break if we got it wrong

App-layer filtering only: works correctly 999 times out of 1,000. The 1,000th time, a chunk from Client A surfaces in Client B's research session. You discover this a week after a quarterly review at one of those clients. The product is dead, even though the feature itself is otherwise excellent.

---

## D-017 — Row Level Security on by default, even before we have users

### The story

A research agency archive room has two keys:

- **The master key** — held by the head archivist (the Next.js server using the `service_role` key). Opens any cabinet, no questions asked. Trusted, never leaves the office.
- **The visitor key** — handed to anyone who walks into the building (the `anon` key, literally embedded in browser-side code). Every visitor's browser can read this key.

Without locks on the cabinets themselves, the visitor key reads everything. With locks (Row Level Security, "RLS"), each cabinet has rules — "only open for the visitor whose ID matches this file" — and the visitor key gets denied unless a rule allows it.

The master key always bypasses the locks. That's by design — the head archivist needs to do their job.

### What we did

When we ran the Phase 1 schema migration, Supabase warned us that the new tables had no RLS. We turned RLS **ON** on all three tables (`projects`, `documents`, `chunks`) — with **no policies attached**.

That has these effects:
- **Server-side queries (master key) still work perfectly.** Every existing piece of Premise — `/api/ask`, `/api/projects`, the ingestion CLI — is unaffected.
- **Browser-side queries (visitor key) are denied on everything**, because there are no policies that would allow access.
- When we add auth in a later phase, we'll add policies like "a user can only see projects where `owner_id = auth.uid()`."

### Why turn it on before we have any users to protect

Today, Premise is single-user (Aaron). The visitor key isn't being used. So technically, RLS doesn't matter today.

But:

1. **Defaults are sticky.** "We'll add RLS later" is a reliable way to ship a database to production with the front door wide open. The right moment to set the safe default is when you're touching the schema, not when you're shipping a feature on a deadline.
2. **It costs nothing to be on.** Server-side code works identically. We don't have any browser queries to break. We pay zero today and earn the safety guarantee for free.
3. **It lines up with D-016's principle.** Confidentiality is the most important promise the product makes. Every layer of structural enforcement we add now is one less promise we have to remember to keep manually later.

### The PM lesson

**Set safe defaults before you have users to protect.** New PMs see security as something you "harden" before launch. Senior PMs see security as a *default state* — you're either on or off, and "off, planning to turn on later" is a sign you'll forget. Turn it on at the moment of creation; explicitly relax it where you've reasoned about why.

The general lesson for AI products: **trust commitments compound from the schema upward.** A confidentiality promise made in marketing copy is worth nothing if the database doesn't enforce it. Strict abstention (D-010), SQL-bounded retrieval (D-016), RLS (D-017) — these are the same instinct expressed at three different layers.

### What would break if we got it wrong

Skip RLS now: in Phase 4 we add a "show recent projects" widget that queries Supabase directly from the browser using the anon key. The dev who writes it forgets to filter by owner. Suddenly any visitor of your site can list every project, every document, every chunk in your database. You discover this the day after you flip the repo to public. Trust gone.

---

## D-018 — Hypothesis generation rides the same structured-output chassis as RAG

### The story

Imagine you've engineered the perfect verbatim-quoting protocol for your moderators — every quote in a debrief must be tagged with the speaker, the timestamp, and an audio-clip reference. Your second analyst checks every quote against the recording. The protocol works beautifully for focus-group debriefs.

Then you start running diary studies. Different format, different data, different output. Do you invent a fresh protocol for diaries? Or do you ask: *can my quoting protocol carry over?*

It can. Diaries have entries, dates, and respondent IDs. The same shape. You reuse the protocol, change two field names, ship the diary product in a week instead of a quarter.

We just did that with hypotheses.

### What we did

The strict-mode RAG pipeline (D-010) is built on three layers — schema-forced tool_use → verifier pass → UI gate. For Phase 2, we needed to generate hypotheses from a brief. Different shape (5–7 falsifiable statements with assumptions, expected direction, confirmation criteria), different goal (widen options, not answer questions). But the same underlying *primitive*: every output must cite chunks, no fabrication.

So hypothesis generation reuses the chassis:
- **Same retrieval**: top-k from pgvector, scoped to the project (D-016).
- **Same reranker**: Haiku prunes to the most relevant chunks (D-002 routing in action).
- **Same forced tool_use**: Sonnet must call `propose_hypotheses` with a strict schema. The schema requires every hypothesis to populate `supporting_chunk_ids` OR `contradicting_chunk_ids`. The model literally cannot output a hypothesis without grounding.
- **Same post-validation**: app code filters out any hypothesis whose citation IDs don't match the retrieved chunks — same defensive belt-and-braces approach as in RAG generation.

What's *different* is downstream: hypotheses are persisted, ranked, and gated by researcher accept/reject status — they become inputs to the next phase.

### The PM lesson

**When you find a primitive that works, look for places to reuse it.** The instinct of a less-experienced builder is to build each feature from scratch ("hypotheses are different, I'll write a new pipeline"). The instinct of a senior PM is to recognise the *shape* of the problem and reach for the proven primitive ("this is the same shape as RAG — let's build it the same way").

This is how AI products compound: a single load-bearing primitive — *structured output with citation discipline* — becomes the chassis for hypotheses, then questionnaire variants (Phase 3), then analysis writeups (Phase 4), then story angles (Phase 5). One design idea, five products. The compounding is what makes the long roadmap actually shippable.

The general AI-PM lesson: **primitives are the unit of leverage**. Identify them, name them, reuse them aggressively. The product gets faster to build and more coherent to use because every surface speaks the same structural language.

### What would break if we got it wrong

Build hypothesis generation as a fresh pipeline: it works, but you've doubled the surface area. Every prompt-engineering insight has to be re-applied in two places. The verifier pattern doesn't carry. The citation-chip UI from RAG doesn't render hypothesis citations because the data shape is subtly different. Each later phase compounds the divergence. By Phase 5 you have five mostly-similar pipelines and no shared primitives — and the codebase has stopped feeling like one product.

---

## D-019 — Three variants per question, with their tradeoffs displayed alongside

### The story

You're a senior researcher running a study on sustainability. Junior moderator says "we need a question on how important sustainability is to consumers." You ask: "phrased how?" They write:

> *On a scale of 1-7, how important is sustainability to you when shopping for groceries?*

You wince. You know exactly what's about to happen — the average will come back at 6.2 and the client will think every consumer is a sustainability champion. The phrasing is direct, neutral, *and* almost guaranteed to surface social-desirability bias on a topic where it's been demonstrated thousands of times.

You'd ask it differently. Maybe a behavioural variant: *"In the last four shopping trips, how often did you choose a sustainable product over a cheaper alternative?"* Maybe a forced-choice: *"Which would you take to checkout — Brand A at ₹100 with sustainable packaging, or Brand B at ₹85 with regular packaging?"* Maybe projective: *"Describe a person who consistently buys sustainable products. What is their household income?"*

Different phrasings of the same construct elicit *different things*. A senior researcher's instinct knows this. A junior researcher learns it the hard way over years.

### What we did

Premise codifies this instinct. Every question Phase 3 generates comes with **exactly 3 variants from different methodological frames** — neutral_direct, leading, projective, behavioural, attitudinal, forced_choice, constant_sum, maxdiff. For each variant, the bot supplies:

- **statement** — the actual question, ready to paste into a survey tool
- **what_it_elicits** — one sentence on what THIS phrasing surfaces
- **caveat** — one sentence on the bias or weakness it carries

The UI displays the three variants side-by-side as cards. The researcher reads the elicits/caveat lines, picks based on instinct, clicks "select." The bot never picks — it only widens.

### The PM lesson

**The "options not answers" principle isn't a UX nicety; it's a *trust mechanism*.** A bot that picks for an expert user is a bot that gets tuned out the moment it's wrong about something subtle. A bot that surfaces the tradeoff and lets the expert pick is a bot the expert keeps in the workflow even when they disagree with the recommendation.

This is the harder version of D-018's primitive — it's not just "structured output." It's *structured output that reveals the tradeoff to the user*. The schema isn't only forcing the model to disclose its reasoning; it's forcing the *interface* to show the tradeoff to the human.

For an AI PM, the broader lesson: **for expert users, don't ship a bot that thinks for them. Ship a bot that thinks *alongside* them.** The product wins because the expert keeps the bot in their loop, not because the bot is right.

### What would break if we got it wrong

Single-variant generation: the bot picks one phrasing per question. Sometimes it picks the right one. Often it picks neutral_direct because that's the safest-looking. The researcher silently overrides and rewrites the question. The bot's value diminishes to "draft something, I'll redo it." Eventually the researcher stops using it for questionnaire work and reaches for a blank doc instead.

Multi-variant generation without showing tradeoffs: the bot dumps three phrasings without explaining what each elicits. The researcher reads three near-identical questions and shrugs. The widening doesn't help because the *axis* of variation isn't visible.

Multi-variant + tradeoffs but bot picks: defeats the entire principle. The researcher is now arguing with the bot's pick rather than choosing on their own instinct.

The version we shipped: variants + elicits/caveat per variant + researcher selects. That is the load-bearing combination.

---

## D-020 — A six-probe-type eval harness, gating every prompt change

### The story

You're a researcher. Your moderator's panel guide has been changing every week — your QA lead keeps tweaking probes "for clarity." You only realise something's degraded when a client points it out: the recent waves are missing a question that used to be asked. By the time you trace it, three waves of data are tainted.

What did you wish you'd had? A **golden checklist** the moderator runs through *every wave* before fielding. Not exhaustive — just the things that, if they break, kill the study. Five minutes per wave; saves three months of reanalysis.

That's an eval harness for a research product.

### What we built

Six probe types, 20 deterministic test cases, one CLI runner, one JSON output. Every prompt change runs against this before merging. Every commit can be gated by `npm run eval` exit code.

| Probe type | What it catches | Severity if it fails |
|---|---|---|
| `golden-qa` | Bot fails to answer questions the corpus *can* answer | Trust failure |
| `abstention` | Bot fabricates on out-of-corpus questions | Critical — the strict-mode product is broken |
| `hallucination` | Bot generates uncited claims when tempted | Critical |
| `hypothesis-quality` | Hypotheses missing required structural fields | Schema-enforcement leak |
| `persona-quality` | `under_represents` field missing or trivially short | Highest-touted persona feature is hollow |
| `confidentiality` | Cross-project chunk leakage | D-016 breach — product-defining trust commitment |

The harness has its own dedicated test corpus (3 public + 1 confidential markdown fixtures) and its own pair of dedicated test projects, set up idempotently on first run.

### What this harness does NOT do (yet)

It's deliberately deterministic-only at v1. No subjective scoring, no judge-based rubrics. The structural checks catch ~80% of regression failure modes; the subjective stuff — *"is this hypothesis specific enough to be worth running a study around?"* — is a v2 add. The reasoning: a flaky judge is worse than no judge. Better to ship deterministic now and add the judge once we've curated good rubric prompts.

### The PM lesson

**Evals are the AI product equivalent of the panel-guide checklist.** Without them, every prompt change is a silent risk. With them, you accumulate trust over time: every passing run is one more proof point, every failure is caught at the cheapest possible moment.

For an AI PM specifically: **evals are the highest-leverage portfolio artefact you'll build.** They demonstrate that you've internalised a fundamental insight — non-deterministic systems require *measurement* in lieu of certainty. Hiring managers screen for this. So do CTOs evaluating AI product teams.

The deeper lesson: **evals are the receipt for every promise the product makes.** Strict abstention? Eval probe. SQL-bounded confidentiality? Eval probe. Citation discipline? Eval probe. Every load-bearing claim from D-001 through D-019 has at least one corresponding probe — or it should, before we ship to a paying customer.

### What would break if we got it wrong

No eval harness: every prompt edit is a coin-flip. Three months in, abstention rate has silently degraded from 100% to 90%, hypothesis specificity is mediocre because the prompt got softened during a tuning session, and a confidentiality regression introduced by a bad migration goes undetected for weeks. By the time someone notices, the trust narrative the product was built around is dead.

Eval harness with no probes for the load-bearing commitments: passing eval feels like progress, but you're testing the wrong thing. Always check: does every "Critical" claim in the product narrative have a corresponding probe? If not, add it.

---

## D-021 — Prompt caching is now real, not aspirational

### The story

You promised your client a tracker study at ₹3 lakh per wave. You shipped wave 1 at ₹3L. Then on the recon you realised the *actual* fielding cost — including respondent incentives, fieldwork QA, and translation rounds — was closer to ₹8L. You've been silently absorbing the difference for two waves.

That's what we'd been doing with cost. D-003 said "we use Anthropic prompt caching aggressively" — and we did, in the docs. The actual code still re-sent the entire system prompt and tool definition on every call. Real cost was about 9× what the case study claimed.

This was caught in the post-Phase-3 audit (Audit #1, L-1). Now fixed.

### What we changed

Every Anthropic call in the product now uses prompt caching:

| Call site | What's cached | Cache hit savings |
|---|---|---|
| `generation.ts` (RAG draft) | system + tool definition | 90% on input |
| `verification.ts` (claim verifier) | system | 90% on input |
| `reranker.ts` (Haiku rerank) | system | 90% on input |
| `hypothesis-generator.ts` | system + tool definition | 90% on input |
| `persona-generator.ts` | system + tool definition | 90% on input |
| `question-generator.ts` | system + tool definition | 90% on input |

Anthropic caches the request prefix up to the last `cache_control` marker. We mark the trailing cacheable element (system prompt or tool definition). Subsequent calls within the cache TTL (5 minutes default) hit the cache: cached input billed at 10% of normal price.

Cost telemetry (D-023) records cache hits in real time so we can see the savings empirically. The eval harness gates this change — every probe runs before and after caching to confirm no behaviour regression.

### The PM lesson

**Aspirational documentation is a debt.** When the docs claim a behaviour the code doesn't implement, every audit finds it, every reader catches it, and the trust narrative around the rest of the docs gets diluted by the one obvious lie. The cost lie was the most embarrassing finding in the audit because it was load-bearing for the "<$5/mo" claim.

The harder lesson: **mechanical changes deserve eval gates too.** It's tempting to think "this is just adding `cache_control` markers — there's no behaviour change." But Anthropic processes cached content slightly differently than fresh content, and edge cases happen. The eval harness catches these in 60 seconds. Trust the harness; never assume mechanical changes can't break behaviour.

### What would break if we got it wrong

Skip the eval gate: caching could subtly change tool_use behaviour on cache hits, and we'd ship a regression the user only finds when generation starts producing weird outputs. With the harness, we catch any regression in the same run that introduced it.

Skip caching itself: cost stays ~9× higher than promised, the "<$5/mo" claim is fiction, and the portfolio narrative around cost discipline is undermined.

---

## D-022 — Survey export: markdown, Qualtrics, plaintext

### The story

You spent two weeks running Premise alongside a real client project. You generated hypotheses, you accepted variants, you built the perfect questionnaire. Then the senior researcher asked: "great, send me the questionnaire" — and your only options were (a) take a screenshot of the canvas, (b) manually retype every question into Google Docs.

The product's value chain stopped one step short of the actual handoff. Researchers don't field questionnaires in Premise; they field them in Qualtrics, SurveyMonkey, Typeform, Google Forms, or paper. We needed a bridge.

### What we built

Three export formats, available from buttons in the questionnaire artefact:

- **Markdown** — the canonical format. Includes target_construct, rationale, the hypothesis it tests, the chosen variant with its elicits/caveat, response format, and response options. The format you paste into a brief, share with a senior, or attach to a deck.
- **Qualtrics advanced format** — paste-into-Qualtrics directly. Uses the `[[AdvancedFormat]]` and `[[Question:MC:SingleAnswer]]` markers that Qualtrics's bulk import understands.
- **Plaintext** — bare bones, one question and its options. For SurveyMonkey, Google Forms, paper studies.

Only **accepted questions with a selected variant** are exported. Proposed or rejected questions are silently filtered.

### The PM lesson

**Build the value chain, not the feature.** The instinct of an early-stage builder is to optimise the most central feature (here, generating great questionnaires). The instinct of a product person is to ask "what does the user do *after* the central feature works?" If the answer is "open a different tool and copy by hand," your product has a hole in the value chain, and that hole is a bigger conversion blocker than any feature gap.

For an AI PM specifically: **integration with the user's existing tools is the difference between a demo and a workflow tool.** Premise produces beautifully structured questionnaires. Without export, the researcher leaves Premise to actually use them — Premise becomes an "exploratory" tool, not a "production" tool. Export changes that.

### What would break if we got it wrong

No export: the product feels complete on a demo but stops being used the moment a researcher tries to ship a real wave. Conversion from "tried it" to "uses it weekly" never happens.

---

## D-023 — Cost telemetry — every API call recorded

### The story

You're running fieldwork for a client. End of month, finance asks: "how much did this study cost?" You pull invoices from each subcontractor, the panel provider, the translation agency, and the hosting bill. It takes an afternoon. The next month, you build a tracker spreadsheet that records every line item the moment it's incurred. Now finance gets the answer in 30 seconds.

We just did the equivalent for Premise.

### What we built

A new `api_calls` table records every Anthropic and Voyage call with:
- `service`, `endpoint` (e.g. `rag-draft`, `hypothesis-gen`, `embed-doc`)
- `model`, `input_tokens`, `cached_input_tokens`, `cache_creation_tokens`, `output_tokens`
- `cost_usd` (computed from the pricing table at insert time)
- `duration_ms`
- Tags: `project_id`, `brief_id`

The `tracedMessagesCreate` and `recordVoyage` helpers wrap every SDK call. Telemetry persistence failures never propagate to the user-facing flow — they log a warning and continue. The cost badge in the canvas header polls every 8 seconds and shows running spend per project, cache-hit rate, and cost breakdown by endpoint.

`/api/projects/[id]/costs` exposes the rollup as JSON for downstream tooling.

### The PM lesson

**Measure the metric you make a claim about.** "Less than $5 per month" is a marketing claim. Without telemetry, it was a vibe. With telemetry, it's a measurement: every call recorded, every dollar accounted for. The number on the cost badge is *the* number; there is no other version of the truth.

For an AI PM: **cost telemetry is the cheapest credibility layer you can add to an AI product.** It demonstrates engineering rigour, makes the cost narrative defensible, and surfaces regressions the moment a prompt change starts costing more. Build it before you need it; you'll need it the moment a client or a hiring manager asks "what's this actually cost to run?"

### What would break if we got it wrong

No telemetry: cost claims stay aspirational. A regression that doubles spend goes unnoticed until you check the Anthropic console. The eval harness can't gate on cost. The "<$5/mo" narrative remains unproven.

Telemetry that breaks the user flow on failure: a Supabase blip would kill a generation request. Hence the deliberate decision to swallow telemetry errors and continue.

---

## D-024 — Edit affordance for hypotheses, questions, and question variants

### The story

The "options not answers" principle (D-018, D-019) widens the option space. The researcher selects from variants. But sometimes the bot's *best* variant isn't quite right — the wording is too leading, a respondent-facing word feels off, the response options need an extra category. Until now, the only choice was Accept-as-is or Reject. There was no "almost — let me tweak the third word."

Real researchers tweak. We added inline edit affordances.

### What we built

- **Hypothesis edit**: click "edit" on any hypothesis card to inline-edit `statement`, `expected_direction`, `confirmation_criteria`. Save → DB updated → no LLM call needed.
- **Question variant edit**: click "edit" on any variant card to inline-edit the `statement`. The variant's methodological frame (Neutral / Behavioural / Projective / etc.) and its `what_it_elicits` / `caveat` stay frozen — the *frame* is the bot's contribution, the *exact wording* is the researcher's.

Edits don't move a hypothesis or question out of its current status — accepted hypotheses stay accepted. Edits don't trigger regeneration. The DB is the truth; the bot's prior generation lives in git history if anyone needs it.

### The PM lesson

**Expert tools earn loyalty by closing the last 5%.** A bot that produces 95% of what an expert needs and forces them out of the tool for the last 5% gets relegated to "nice to play with sometimes." A bot that produces 95% *and lets the expert close the last 5% in place* becomes a daily driver.

This is the deeper version of D-019 — not just "show options," but "let the expert finish the work the way only they can." The widening + finishing combination is what makes Premise feel like an extension of the researcher's hands rather than a black box that sometimes returns useful things.

### What would break if we got it wrong

No edit affordance: senior researchers reject good hypotheses because one word is off, or accept variants and then silently rewrite them in a doc outside Premise. The product loses the expert's trust by failing on the last 5%, and exports go out with the bot's wording instead of the researcher's.

---

## D-025 — Zod validation at every API boundary + safe-error responses

### The story

You've been running fieldwork for years. Your QA process has been: "we'll just trust the moderators to follow the discussion guide." Mostly works. Occasionally a moderator skips a section, mishears a respondent ID, types the wrong stimulus number. You catch it on the recon if you're lucky. You don't catch it at all if you're not.

What changes in mature ops? You add a checklist at the *boundary* — before the recording starts, before the data leaves the moderator's hands. The checklist either passes (proceed) or fails loud (with the exact field that's wrong). No more "trust the moderator."

API request validation is the same. Until now, every API route hand-rolled `typeof` checks for fields. Brittle, easy to miss, easy to drift. With Zod schemas at every boundary: requests either parse cleanly into a typed object, or fail with a 400 listing every invalid field by path. No more "trust the client."

Paired with this: a safe-error helper that *never* leaks internal error messages or schema info to the client. In production, internal errors return a generic message + a request id; the real error logs to the server with that id for debugging. In dev, the real message surfaces to make iteration fast.

### What we built

- `src/lib/validation/schemas.ts` — one Zod schema per request body and per param shape (project create, brief create/update, hypothesis update, persona update, question update, variant update, ask).
- `src/lib/api/safe-error.ts` — a single helper that handles every error path:
  - `ZodError` → 400 with field-level issues
  - `HttpError` (intentional public message) → its status + public message
  - Anything else → 500 with `{ error, request_id }` (real error logs server-side)
- Every API route refactored to: `try { schema.parse(input); ... } catch (err) { return safeError(err); }`. Identical pattern across 12+ routes.

### The PM lesson

**Validate at the boundary, sanitise on the way out.** The two halves of every robust API surface. Boundary validation makes invalid requests fail fast with a clear contract. Output sanitisation makes internal errors fail safe with a clear message.

For an AI PM specifically: **predictable error responses are part of the product.** A 500 that returns a database error is hostile to client developers. A 400 that lists exactly which fields are wrong feels professional. Hiring managers reviewing the repo will look for this.

### What would break if we got it wrong

Hand-rolled validation: a `typeof` check passes a malformed object that crashes deeper in the code, returning a 500 with a stack trace. The client developer can't tell what to fix. The bot's schema info leaks. Fix one path, miss another.

No safe-error wrapper: production 500 responses include things like `relation "briefs" does not exist` or `Anthropic key invalid`. Schema info, infrastructure details, and credentials hints all leak to whoever pings your URLs.

---

## D-026 — Atomic generation via Postgres functions

### The story

You've been scraping social posts for a brand-listening study. You write a script that deletes last week's records, then inserts this week's. Halfway through the insert, the API rate-limits. Now you have *no* records at all — last week's are gone, this week's never finished.

That's exactly the failure mode `replaceProposedHypotheses` had: it deleted all proposed rows, then inserted new ones. If the insert failed, the user lost their existing proposed work.

The fix: a Postgres function that wraps the delete + insert in a single transaction. If anything inside fails, the entire operation rolls back — including the prior delete. The user keeps their existing proposed rows. No partial-state damage.

### What we built

- Migration `0005_phase4_atomic_locks.sql` defines three plpgsql functions:
  - `replace_proposed_hypotheses(brief_id, project_id, drafts jsonb)`
  - `replace_proposed_personas(brief_id, project_id, drafts jsonb)`
  - `replace_proposed_questions(brief_id, project_id, drafts jsonb)` — also handles the question_variants insert atomically (3 variants per question, all-or-nothing).
- Each plpgsql function runs inside a single implicit transaction. Any error inside any insert rolls back the prior delete.
- The TS DB helpers (`replaceProposedHypotheses` etc.) now call these via `supabase.rpc(...)` and read back the inserted rows for the response.

### The PM lesson

**Multi-step operations on shared state need atomicity, not optimism.** "It usually works" is fine for a demo and dangerous for a product. The cost of moving from delete-then-insert to a transactional RPC is small (one Postgres function); the cost of *not* doing it is data loss in the failure mode that's most likely to happen during a peak load (when retries fail).

### What would break if we got it wrong

Network blip during a regenerate: delete succeeds, insert times out, user has empty `proposed` and no error rollback. They thought they were "regenerating" — instead they erased their work.

---

## D-027 — Retry with exponential backoff on transient API failures

### The story

You're running a tracker wave on a tight client deadline. Halfway through fielding, your panel provider's API rate-limits you for 90 seconds. Your script aborts. You call the provider, they say "just retry, you'll be fine." You spend the next hour writing retry logic into your fieldwork pipeline.

For Anthropic and Voyage, the equivalent failure modes are 429 (rate limit), 529 (Anthropic-specific overloaded signal), and transient 5xx server errors. Without retries, any of these kills the user's flow.

### What we built

- `src/lib/api/retry.ts` — a `withRetry(fn, options)` helper. Default: 3 attempts, exponential backoff (250ms / 500ms / 1000ms with up to 25% jitter), retryable on 408/429/500/502/503/504/529 + network-level errors (ECONNRESET, ETIMEDOUT, etc.). Never retries 4xx client errors (other than 429).
- Wraps every Anthropic call inside `tracedMessagesCreate` (so retry behaviour is uniform across all 6 generation paths) and the Voyage embed fetch.
- `onRetry` callback logs to console so we can see when retries are happening.

### The PM lesson

**Resilience is invisible when it works and load-bearing when it doesn't.** A user who never sees a retry never thinks about it. The same user without retries hits "Anthropic returned 529, please reload" once a week and starts to distrust the product. The fix is small; the trust difference is large.

For an AI PM: **the cheapest reliability layer in any AI product is exponential-backoff retry on the LLM call.** Always add it. Always tune `maxAttempts` and `baseDelayMs` per provider's documented rate limits.

### What would break if we got it wrong

No retry: every Anthropic 529 (which happens occasionally during peak load) bricks a user's flow until they reload + retry manually. The "<$5/mo" cost story stays intact (no extra calls), but the product's reliability story dies.

---

## D-028 — Generation locks: idempotency for double-clicks

### The story

A researcher hits "Regenerate hypotheses." They wait three seconds. They get impatient. They click again. Now two parallel generation requests are in flight against the same brief. Both call `replaceProposedHypotheses`, both delete the same rows, both try to insert new ones with the same ordinal numbers. Race condition. Best case: duplicate inserts. Worst case: partial state from one race winner clobbers the other's work.

The fix: a lightweight server-side mutex per resource. The first request acquires the lock; the second gets a 409 ("already in progress, please wait") and the user understands why their second click did nothing.

### What we built

- A `generation_locks` table with primary key `key` (text) — the unique constraint enforces mutual exclusion. Each row has an `expires_at` timestamp so a crashed handler doesn't permanently jam the endpoint.
- `src/lib/api/with-lock.ts` — `withGenerationLock(key, fn)`:
  - Sweeps stale locks (expired ones) before attempting acquire.
  - Inserts a row keyed by the operation (e.g. `hypotheses:<brief_id>`).
  - On `23505` (unique violation): throws `HttpError(409, "...")`.
  - On success or failure of `fn`: deletes the lock row.
- Applied to all three generation endpoints: `/api/briefs/[id]/hypotheses`, `/api/briefs/[id]/personas`, `/api/briefs/[id]/questions`. The cost-bearing, mutation-bearing operations.

### The PM lesson

**Idempotency is a property of the system, not a hope of the client.** Don't tell users "please don't double-click." Make double-clicks safe. The simplest way: a per-resource lock at the boundary that costs nothing when there's no contention and rejects loudly when there is.

### What would break if we got it wrong

No lock: parallel generation requests race, the DB has half the new rows + half the old, the UI shows whichever subset arrived last, the cost telemetry shows double the spend. Worst kind of bug — the user's data is wrong but no error fires.

---

## D-029 — Project creation in the UI

### The story

The first time a new user opens Premise, they see "No projects yet — create one with `npm run create-project`." That's a CLI command they may not know how to find or run. Half of new users bounce at this step. The product's first impression becomes "I have to use the terminal to start."

We added a "+ New" button to the project switcher and a modal form (name, description, confidentiality tier). The CLI still works — useful for scripting, eval setup, etc. — but the UI is now the default path.

### What we built

- `src/components/canvas/new-project-modal.tsx` — modal form with name, description, three-option confidentiality picker (with hint text per option). Esc closes; click outside doesn't (deliberate — accidental dismissals lose draft work).
- `src/components/canvas/project-switcher.tsx` — adds a `+ New` button next to the dropdown. After successful creation, refreshes the list and auto-selects the new project.
- The existing CLI (`npm run create-project`) is unchanged — useful for evals, scripts, and reproducible setup.

### The PM lesson

**Onboarding-blocking CLI commands are a self-inflicted churn lever.** Power users like CLIs; first-time users do not. For any operation a user needs to perform on their first session, there must be a UI path. CLI is a *complement* to the UI, never the *only* path.

### What would break if we got it wrong

Keep the CLI-only flow: every new user has to read the README, find the npm script, open a terminal in the right directory. Half bounce. The other half learn that "Premise expects you to know things" — which is the wrong vibe for a product that's supposed to widen their option space, not narrow their patience.

---

## D-030 — Public repo, semi-public live demo, no auth (yet)

### The story

You're publishing your case study and you have two artefacts: the *code* (a public GitHub repo) and the *running thing* (a live URL). They have different audiences and different risk profiles:

- **The code is for hiring managers, AI engineers, and your future self.** Zero risk to make public. Higher value the more eyes are on it. The decision log, eval harness, and case study are the differentiators — those need to be readable.
- **The live URL is for two specific groups**: (a) people you want to demo to in conversation, (b) yourself dogfooding on a real client project. Cost-burn risk: anyone with the URL can trigger ~$0.05 generations against your Anthropic balance. Search-engine indexing and casual link-sharing are the actual threat surface, not targeted attackers — Anthropic's per-account rate limits cap the worst case at "balance drained" (~$9), not "thousands of dollars compromised."

So the two artefacts get different treatment.

### What we did

- **Repo: public on GitHub.** Decisions log, eval harness, case study, all 30 D-NN entries — all readable.
- **Live URL: deployed to Vercel free tier, but deliberately not broadcast.**
  - `public/robots.txt` blocks all search-engine crawling. URL doesn't get indexed; bots don't find it.
  - The live URL is shared **on demand** via personal email, LinkedIn message, or portfolio site — never tweeted, never posted to a forum, never put in an open-source-friendly aggregator.
  - Every API call records into `api_calls` (D-023) so spend is monitorable in real time.
  - If abuse ever materialises (cost spikes, unexpected traffic patterns), the next-step plan is documented: a single-PIN gate via Next.js middleware, ~30 minutes of work.
- **Auth (real auth, not a PIN gate) is a Phase 6+ commercial concern** — not now.

### The PM lesson

**Open-source the *artefact*, gate the *resource*.** Code is cheap to publish, valuable to share, has zero runtime cost. Compute is expensive to publish, valuable to gate, has real runtime cost. Treat them as different products with different distribution strategies.

For an AI PM specifically: **sharing public AI demos is a cost-management problem, not a marketing problem.** The first question to ask before a public deploy is "what's the worst-case spend per hour if a bot finds this?" If the answer is "fine, capped at my credit balance," ship it. If the answer is "thousands of dollars," gate it before deploy.

### What would break if we got it wrong

Public repo + public unbroadcast URL + no `robots.txt`: search engines index the deployment within 48 hours. Within a week, automated agents probing for free LLM endpoints find it. Cost-burn rate goes from "$0/day" to "$50/day until balance drains." You wake up to an empty Anthropic account and a confused billing alert.

Public repo + truly private URL (Vercel Authentication forced): friction so high that nobody you actually want to demo to will sign up for Vercel just to see your demo. The URL becomes useless.

What we shipped: the middle path. Public artefact, gated resource via *obscurity + monitoring*, with a clear escalation path to real auth if needed.

---

## D-031 — Multi-format ingestion: PDF, DOCX, plain text/markdown, and URL fetch

### The story

A researcher's "corpus" isn't a folder of `.txt` files. It's:
- 80 PDFs (client decks, research reports, syndicated studies)
- 40 DOCX (transcripts, draft reports, internal memos)
- A handful of markdown notes
- 200 web pages (industry articles, public reports, competitor blog posts) you want grounded in too

If Premise can only ingest `.txt` and `.md`, the real corpus stays outside the product. Researchers convert every file by hand. That kills adoption — friction beats value.

### What we built

Three formats + URL fetching, all behind a single Documents artefact in the canvas:

- **PDF** via `pdf-parse` — handles most research PDFs (text-based, not scanned). Image-only PDFs degrade gracefully ("file produced almost no extractable text").
- **DOCX** via `mammoth` — Word reports, transcripts, briefs. Mature library; handles tables, lists, embedded styles.
- **Plain text + markdown** — already supported, now also via UI.
- **URL fetching with Mozilla Readability** — paste a URL; we fetch with a 10s timeout and 5MB cap, run Firefox's Reader View algorithm to strip nav/ads/cookie-banners, and ingest the clean article body. Perfect for online research articles, public reports, blog posts, competitor pages.

The `Documents` artefact lives at the **top** of the artefacts pane — corpus is the foundation everything else builds on. Upload button + URL paste-in-line; live progress feedback; chunk count + token cost shown after each ingest.

### What's deliberately not built

- **Scanned-PDF OCR** — Tesseract or Vision APIs could do it, but adds a dep + cost + reliability concerns. Defer until a researcher actually hits this.
- **Sync from Google Drive / Notion / Dropbox** — OAuth + delta sync is a substantial build. Defer to commercial phase.
- **Bulk folder upload via the UI** — single-file at a time for now. CLI still supports bulk via `npm run ingest`.

### The PM lesson

**The cheapest way to make an AI product useful is to meet users where their data lives.** A model is only as good as the corpus it can read. Spending engineering time on better prompts when users can't ingest their actual research is solving the wrong problem.

For an AI PM: **ingestion surfaces are user-research surfaces**. The friction users hit getting their data in is a direct measure of how often you'll see that user again. PDF + DOCX + URL covers ~95% of insights-research source formats.

### What would break if we got it wrong

Stay text-only: researchers convert every file manually. The "drop a doc in" promise is hollow. They use Premise for the demo and never come back.

---

## D-032 — Authentication: Supabase magic links, per-user project ownership, orphan-claim on first sign-in

### The story

Until now, Premise had no login. Anyone with the URL saw every project. Defensible for a portfolio piece (one user, semi-private URL) but hostile to anything resembling commercial use — even letting one beta tester in means they see your client work too.

We added authentication. Not full multi-tenant SaaS auth (orgs, billing, roles, SSO — that's commercial-phase) but the right *minimum*: each user has their own projects, sees only their own work, signs in with email magic-links.

### What we built

- **Supabase Auth** — already provisioned in every Supabase project; we just turned it on. Magic-link only, no passwords. Sign in by entering email, get a one-time link, click, done. Zero password management on our side.
- **`@supabase/ssr`** — Supabase's official SSR helpers for Next.js. Three pieces: server client (route handlers / server components), browser client (client components), middleware (refresh session cookie on every request).
- **`projects.owner_id`** — new column, FK to `auth.users`. New projects always set `owner_id`. Old projects get `NULL` (orphans).
- **`/login` page** — clean magic-link form using the Premise mark. "We sent a link" confirmation state; expired-link errors surface inline.
- **`/auth/callback` route** — exchanges the OTP code for a session, sets the cookie, redirects into the app. Also calls `claim_orphan_projects(user_id)` — see below.
- **`/auth/signout` route** — POST endpoint, single button in the account menu.
- **AuthGate** in `src/app/page.tsx` — server component reads `getCurrentUser()`. If no user, `redirect("/login")`. Server-side, no flash.
- **API protection**: every API route now starts with `const user = await requireUser();` (throws 401 if no session) and `await assertProjectAccess(projectId, user.id);` before touching project-scoped data. The helper returns 404 (not 403) on mismatch, deliberately not revealing the existence of other users' projects.
- **`claim_orphan_projects` Postgres function** — when the *first* user signs in, all NULL-owner projects get claimed to them in one atomic UPDATE. The function won't run successfully if any project already has a non-null owner — so subsequent sign-ins get nothing claimed. This means Aaron's existing pre-auth work survives his first sign-in.

### Server-side queries still use the service role

A deliberate architectural choice. We *could* have switched every Supabase query to use the user's JWT (which would respect RLS policies). Instead, server-side queries continue using the **service role key** (which bypasses RLS), and we enforce ownership in application code via `requireUser()` + `assertProjectAccess()`.

Tradeoffs:
- **Pro**: simpler. Existing query code didn't change. Faster (no per-request JWT verification on every Supabase query). Works the same way the LLM pipelines and ingestion flows already worked.
- **Con**: app code is the only barrier to cross-user access. A bug in `assertProjectAccess` would be a privacy hole. Mitigated by: every API route is small and follows the same pattern; the eventual commercial-phase migration to true RLS-everywhere isn't blocked by this choice.

For commercial deploy, we'll graduate to RLS-everywhere with the user's JWT. For portfolio, app-layer enforcement is the right level of rigour.

### The PM lesson

**Auth is a feature with a trapdoor.** It feels mechanical (just add a login screen) but it cascades through every surface — every API route, every DB query, every UI state. The right move is to ship the *minimum* version that solves the actual problem (per-user data isolation) and explicitly defer the parts that aren't load-bearing yet (orgs, roles, SSO, password resets, social login). Spec the minimum; ship the minimum; expand only when commercial pressure demands it.

### What would break if we got it wrong

No auth: every visitor sees every project. The product becomes unsharable to anyone you don't trust completely.

Full RLS-everywhere as v1: weeks of refactoring before we can ship. The minimum hits the same trust property faster.

Skipping `claim_orphan_projects`: Aaron signs in and his existing projects vanish from his view.

---

## D-033 — Public library: a shared corpus to solve the cold-start problem

### The story

Premise's whole value is "hypotheses grounded in YOUR research." But on day 1, a new user has no research uploaded. Strict-RAG runs against an empty corpus and produces nothing. The product feels broken on first contact. Every new visitor bounces.

This is the cold-start problem every "your data" AI product faces. The fix isn't to weaken the strict-RAG promise — it's to give every user a useful *starter* corpus, and let them layer their own work on top.

### What we built

- A boolean flag `is_public` on projects. The single shared library is one project with `is_public = true` and `owner_id = NULL`.
- The retrieval layer (`match_chunks`) now takes an *array* of project IDs. We always pass the user's project ID + every public library's project ID. Public-library chunks compete against the user's chunks in the reranker; the most relevant wins.
- Citation chips render the **document title** (not just chunk ID) and a **"Public" badge** on chunks sourced from a public library. The researcher always sees where their answer came from.
- A `+ Public library` section in the Documents artefact lets the user browse what's in the shared corpus (read-only).
- A seed script (`npm run seed-public-library`) creates and registers the library project. Aaron curates what goes into it via the existing `npm run ingest` CLI.
- Confidentiality (D-016) is preserved: only project IDs explicitly passed to `match_chunks` can contribute. Cross-user-private leakage remains structurally impossible.

### Why one library, not many

For v1, simplest wins. One shared library, auto-included in every user's retrievals. No subscription model, no topic tagging, no opt-out.

For v2 (if commercial pressure justifies it):
- Multiple libraries tagged by topic ("AI tooling", "Sustainability", "Methodology")
- Per-project subscription: user picks which libraries are relevant
- Premium libraries (paid topic packs)
- User-contributed libraries (community-shared)

The schema (`is_public boolean`) doesn't preclude any of those — they layer on top.

### What goes IN the public library

Aaron curates. Only content where ownership/licence is clear:
- Methodology references (research-design textbook chapters in the public domain, sampling theory, qualitative coding guides)
- Open-licence industry reports (government statistical agencies, NGOs, Creative Commons research)
- Premise's own docs (case study, decisions log, eval methodology) — meta but useful
- His own published writing (LinkedIn posts, blog posts, talks)

Avoid: copyrighted client work, paid-research extracts, anything under NDA. Mismatched licensing in a *public* corpus is a much bigger problem than in a private one.

### The PM lesson

**Cold-start is a content problem, not a feature problem.** It's tempting to think "the bot needs to be smarter." Almost always, the bot is fine — the corpus is missing. Spending engineering time on prompt-tuning when new users have an empty corpus solves the wrong problem.

For an AI PM specifically: **think about your product on day-1 of a new user**. If "the magic" requires their data, you have a cold-start problem; budget product time to solve it via either (a) a public seed, (b) a starter pack, or (c) a one-time onboarding flow that gets the user's data in fast. Don't ship without one.

### What would break if we got it wrong

No public library: every new user's first hypothesis-generation produces "the corpus contains no chunks relevant to this brief" and the demo is dead. Trust never establishes.

Public library too generic: hypotheses become generic. The "your research grounds your hypotheses" pitch dilutes. Mitigate by curating tightly — methodology over content, frameworks over conclusions.

Public library leaks copyrighted content: legal exposure. Curation is the only defence; ingest only what's genuinely public/open-licence.

---

## D-034 — Phase 4: LLM-driven analysis with hypothesis verdicts and emergent patterns

### The story

Every wave of fieldwork ends the same way. Data lands on the desk. Senior researcher stares at it for an hour. Out comes a debrief structured around three sections, every time:

1. **Did each hypothesis hold?** Confirmed, refuted, or inconclusive — with a few specific data signals supporting the verdict.
2. **What did the data shout that wasn't asked?** The emergent patterns — usually the most valuable findings.
3. **What couldn't this study tell us?** The honest caveats — small n, missing segments, response biases.

That's the analysis chapter. It's the same shape across studies. It's also the chapter that takes two days to write and produces 80% of the deck's value.

Phase 4 is Premise's version of that chapter — done in 90 seconds, structurally honest, citing specific evidence from whatever data the researcher uploaded.

### What we built

- **Schema (migration 0008)** — `analyses` table (one per brief, uniqued at the schema level so re-runs replace not duplicate) + `analysis_data` table (raw uploaded sources: CSV pasted as text, transcripts, notes, file uploads — all stored as text, the LLM parses on read).
- **Generator** — Sonnet with forced tool_use, same chassis as every other generation in the product (D-018 reuse). Reads brief + accepted hypotheses + accepted personas + selected question variants + uploaded data. Produces:
  - Per-hypothesis verdicts (confirmed / refuted / inconclusive) with confidence + summary + supporting_evidence + per-verdict caveats
  - 0-6 emergent patterns ranked by priority (5 = surprising-and-actionable)
  - Study-wide caveats (sample size, missing segments, methodology issues)
- **System prompt** ([analysis.ts](../src/lib/prompts/analysis.ts)) — load-bearing for the verdict-honesty discipline. Treats "inconclusive" as a first-class output. Forces specific evidence citation. Demands per-verdict caveats.
- **API** — four routes: `GET /api/briefs/[id]/analysis`, `POST /analysis/data` (paste or multipart upload), `DELETE /analysis/data/[dataId]`, `POST /analysis/run`. Locked against double-clicks via `withGenerationLock` (D-028).
- **UI** — Analysis artefact in the right pane. Upload + paste + remove data sources. "Run analysis" or "Re-run" button. Verdicts render as cards with verdict badge (confirmed/refuted/inconclusive) + confidence + hypothesis statement + summary + evidence + caveats. Emergent patterns render as priority-ordered emerald cards. Study caveats render as an amber callout. Failed runs surface the error inline.
- **Closes P-4** — `selected_variant_id` finally has a downstream consumer. The analyser reads "the canonical question wording the researcher chose" and uses it to interpret data.

### Why LLM-driven, not statsmodels

We could have built a proper quant pipeline: parse CSV → infer schema → cross-tab → significance tests → Sonnet writes up findings. That's the rigorous version. It's also 5-10× more code, requires Python in the runtime, and only handles structured quant data.

The LLM-driven version handles **everything in one shape**: structured CSV, transcripts, raw notes, mixed sources. The reranker-quality reasoning by Sonnet on a small-to-medium corpus produces verdicts that a senior researcher would write themselves — provided the data is small enough to fit context (we cap at ~80K chars, truncating the longest source first).

For waves with thousands of respondents and rigorous stat tests required, the LLM verdict is a draft, not a substitute. The honest framing in the system prompt makes this explicit — verdicts are evidence-cited but the researcher remains responsible for the rigour.

For a portfolio MVP, this is the right tradeoff. A "real-stats" follow-up is documented as a future v2 feature.

### What's deliberately not built

- **Server-side CSV parsing / schema inference** — the LLM does it. Eventually we'll add a Python tool-call for proper stats.
- **Multi-wave longitudinal comparison** — one analysis per brief; comparing waves needs explicit cross-brief queries. Defer.
- **Verbatim quote extraction with timestamps** — a structured "verbatim_quotes" output field would be valuable for qual-heavy waves. Defer to v2.
- **Per-segment analysis** — the analyser handles what's in the data. Per-persona slicing requires structured demographic tagging on rows. Defer.
- **Confidence interval / significance reporting** — the LLM uses descriptive confidence ("high/medium/low") not statistical confidence. For commercial use we'd want the latter; the prompt makes the limitation explicit.

### The PM lesson

**Replicate the senior expert's output shape, not their tool stack.** A naive "AI for research" build would copy the analyst's tools (SPSS, R, Python). The senior-PM move is to copy the *shape of what the senior expert produces* — which is verdicts, patterns, caveats — and use whatever tool produces that shape fastest. For most waves, the LLM does it well enough that the bottleneck stops being "writing the debrief" and starts being "validating the verdicts" — which is the part the researcher should be doing anyway.

For an AI PM specifically: **find the highest-frequency artefact in the workflow you're augmenting**. For market researchers, the analysis chapter is *the* artefact. Optimise for its shape; treat the tooling underneath as a means.

### What would break if we got it wrong

Reach for a stats pipeline as v1: 5-10× build time, Python in the runtime, doesn't handle qual data, and the senior researcher still has to write the verdict and pattern sections by hand. The product feels like SPSS-with-extra-steps.

Skip the per-verdict caveats: the bot returns "confirmed" with high confidence on a 50-respondent sample. Researcher trusts it. Client questions a finding. Researcher can't defend it because the bot didn't surface the sample-size limitation. Trust gone.

Skip emergent patterns: the analyser becomes a verdict-machine, not a research-partner. The single most valuable thing about the senior researcher's debrief — "here's what you didn't ask but the data is shouting" — gets lost.

---

## D-035 — Tier 3-5 polish push (chat persistence, feedback loop, delete, batched verifier, tool-use reranker, prompt versioning)

### The story

After Phases 1-5 + the post-audit Tier 1+2 hardening, the product was *operable*. After this push it's *finished* — every gap a researcher would notice in the first hour of real use is closed. The audit had 22 items across Tier 3-5; this push closes 18 of them in one batch and explicitly defers 4 with rationale.

This is the "polish chapter" of the case study — the difference between a demo that works in a screen recording and a tool a researcher chooses on Monday morning.

### What we shipped (consolidated)

**Chat persistence** (U-1) — new `ask_log` table; `/api/ask` writes to it; chat pane loads recent history on project mount; conversations now survive reload, switch projects, sign-outs.

**User feedback loop** (P-2) — `rejection_reason` column on `hypotheses`, `personas`, and `questions`. When a researcher rejects, an inline prompt asks "why? (optional)" — captured for prompt-tuning signal. Validated server-side, sanitised on output.

**Confirmation on destructive regenerate** (U-8) — every "Regenerate" button on hypotheses / personas / questions now confirms with the count of items being deleted. Accepted/rejected items survive (already covered by D-026); the confirmation makes the destructive scope visible.

**Bulk operations** (Tier 3) — "Accept all" appears in each artefact header when ≥ 2 proposed items exist. Confirms before accepting. Concurrent PATCHes via `Promise.all`.

**Delete affordance** (U-7) — `DELETE /api/projects/[id]` (refuses public libraries; owner-only) and `DELETE /api/documents/[id]` (project-access checked). Project switcher gets a "Delete" button when a project is selected; documents artefact gets a per-doc Delete button. Both gated by `window.confirm`.

**Color disambiguation** (U-9) — persona's `under_represents` callout was amber, same as abstention banners. Now indigo. Same signal-strength, different meaning, no longer confusing the two.

**Loading-state pipeline stages** (U-5) — chat-pane "thinking…" cycles through "Retrieving → Reranking → Drafting → Verifying" stages on a 2.2s timer so the researcher sees the work progressing instead of one static spinner.

**Reranker as tool_use** (L-4) — replaced free-text comma-separated parsing (brittle) with forced `pick_relevant_chunks` schema. Schema-enforced; no more silent fallback when the model formats the response with extra text.

**Verifier batched** (L-5) — moved from N Haiku calls per ask (one per claim) to one batched call returning a parallel array of booleans. ~5× cost reduction on the verify step; one fewer round-trip.

**Researcher-controlled counts** (P-6) — `count` parameter on hypothesis / persona / question generators. Honoured in the user prompt. Schema bounds widened (3-10 / 2-7 / 3-12). UI count selector deferred — can be wired later when researchers ask for it.

**Prompt versioning** (L-8) — central `PROMPT_VERSIONS` registry; every `api_calls` row tagged with `prompt_version`. Lets us diff outputs across prompt revisions when investigating regressions. All endpoints versioned; bumping happens at the registry, not in scattered code.

**Cost regression in eval harness** — the eval CLI now queries `api_calls` for everything recorded during the run, prints total cost + cache hit rate at the end, persists into the result JSON. Diff across runs by reading two adjacent result files.

**Variant pairing diversity** (R-3) — system prompt for `propose_questions` now explicitly demands methodological *contrast* between the 3 variants, with examples of strong vs. weak pairings.

**Sample-size guidance in personas** (R-6) — system prompt for `propose_personas` now embeds quant/qual sample-size heuristics directly into description text.

**Success metrics defined** (P-1) — [`docs/SUCCESS_METRICS.md`](SUCCESS_METRICS.md). Three layers: derivable today, light-instrumentation-with-clients, longitudinal-Series-A. Maps to P-3 partially.

### What we deliberately deferred

- **Streaming responses** (D-7) — touches every generation; large architectural shift. Right call if you want chat-style UX; today's loading-stage hints address the perceived-speed gap at much lower cost.
- **Skip logic / question ordering / demographic block / screener** (R-5) — major UX work plus schema changes (conditional rendering, branching). Real questionnaire-builder territory. Defer until a researcher hits the gap on a real wave.
- **Sonnet-as-judge eval probes** — needs careful rubric prompts and validation against ground truth. Premature without first running the deterministic harness against more real outputs.
- **Editing personas + questions full content beyond status** (Tier 5) — partial (statement editing already shipped); full editing of all fields adds UI complexity for marginal value over the existing edit-statement affordance.
- **Optimistic UI updates** (D-8) — would feel snappier but the existing flows are <300ms round-trip on most actions. Real value < real cost.

### The PM lesson

**A polish push is not a feature push — it's the closure of a backlog of small, individually-low-value items that collectively define whether the product feels finished.** Pre-polish: every researcher who tries Premise hits at least one rough edge in the first hour. Post-polish: the rough edges are gone, the researcher's attention can stay on their actual research.

For an AI PM specifically: **measure what proportion of your audit items are "pre-launch must-fix" vs. "post-launch nice-to-have."** Tier 3-5 items are mostly the latter. Don't ship without Tier 1 (your trust commitments compound from the schema upward); do ship without all of Tier 5 (you'll learn which ones matter from real usage). The deliberate-defer list above is part of the practice.

### What would break if we got it wrong

Skip the deferrals: ship streaming + skip logic + judge evals all in one push and the typecheck takes 20 minutes, the deploy takes a half-hour, and the regression surface explodes. Audit items are not all equal; pick the ones that defend trust commitments first (already done in Tier 1+2), then close the ones that defend day-to-day usability (this push), then defer the architectural refactors until you have real users hitting them.

Skip the polish entirely: Premise feels like a demo. Researchers try it, hit "regenerate ate my work" or "I wanted to delete this project" or "the chat history is gone after I closed the tab" or "I rejected this but couldn't tell the bot why" — and silently churn. The product never compounds.

---

## D-036 — Phase 5: story angles with mandatory "omits" disclosure

### The story

The end of every research wave isn't the analysis chapter — it's the *story*. Researcher takes the verdicts and emergent patterns, picks an angle, frames it for an audience, and outputs an article / deck / LinkedIn post / industry-press pitch. That framing step is where most of the real value gets delivered, and where most of the *quiet dishonesty* in research happens too — the framing chosen always omits something. The senior researcher knows what; the junior one often doesn't notice.

Phase 5 makes the omission visible.

### What we built

`story_angles` table; angle generator (Sonnet, forced tool_use); outline drafter (Sonnet, structured output rendered to markdown). Each angle has:

- **title** — the article headline
- **target_audience** — named specifically (CMOs at consumer-brand parents, brand strategists at independent agencies). The narrower the audience, the sharper the angle.
- **lede** — the opening 1-2 sentences
- **beats** — three story beats (each a short paragraph)
- **supporting_hypothesis_ids + supporting_emergent_patterns** — the evidence chain. Schema-enforced: every angle must cite something. No grounding = rejected.
- **omits** — what this angle deliberately leaves out. Schema-enforced as required. Renders as an indigo callout in the UI so it's impossible to skip past.
- **priority** — narrative strength (5 = most likely to land with named audience).

Researcher accepts an angle → "Draft outline" button appears → Sonnet drafts a structured outline (subtitle, intro, 4-6 body sections, closing). The outline renders to markdown with the chosen angle's title, lede, audience, and a footer line that surfaces the omitted material so the author can choose to address it (or own the omission). Markdown is copy-able and downloadable as `.md`.

### Why "omits" is mandatory

Every story angle is a choice about what to lead with. Every choice leaves something out. The honest research tradition treats that omission as a feature — naming it sharpens the narrative and surfaces what the author still doesn't know. The dishonest tradition treats omissions as bugs to hide.

We schema-enforce honest. The bot can't propose an angle without naming what it omits. The UI renders the omission in a colour distinct from the rest of the card so it never gets overlooked. The footer of every drafted outline carries the omission as a parenthetical note. The discipline is structural, not cultural.

### What's deliberately not built

- **Long-form full article generation** — the outline is the artefact. Writing the full piece is the researcher's job; the outline gives them the scaffolding. Generating the full article would dilute the "options not answers" principle (D-018) at the most expressive layer.
- **Auto-publish to LinkedIn / Substack / Medium** — out of scope. Outline-as-markdown is the export; publication is a downstream researcher action.
- **Multi-format export (Notion, Google Docs, deck templates)** — markdown covers ~90% of researcher workflows. Other formats are post-commercial polish.
- **Per-section regeneration** — for now, re-drafting regenerates the whole outline. Section-level surgical regeneration is a follow-up if researchers ask for it.

### The PM lesson

**The most valuable AI-product features make implicit expert judgments explicit and unmissable.** Senior researchers always know what their framings omit; the value of putting the omission *in the schema* is that the bot can't gaslight a junior researcher into thinking the chosen angle is the *whole* story. This is the same pattern as `under_represents` for personas (D-019) — a structural enforcement of a discipline that experts internalise but junior users miss.

For an AI PM specifically: **find the implicit expert judgment that separates "good" from "great" output in your domain, and make it a required field**. For research, omissions matter. For analysis, caveats matter. For hypotheses, citations matter. Each is a structural truth-tax that compounds product trust over time.

### What would break if we got it wrong

Skip the "omits" requirement: the bot generates beautiful, confident angles. Junior researchers ship them as-is. Three months later, a CMO asks "but what about Tier-3 cities?" and the researcher has no answer — the angle never named the gap. Trust gone.

Skip the evidence-chain requirement: angles drift into pure speculation, often well-written enough to be persuasive. Bot-generated thought leadership without grounding is the failure mode every researcher fears about AI tools.

Generate full articles instead of outlines: the bot's prose voice replaces the researcher's. The product becomes "AI writes my LinkedIn posts" and loses the "AI widens my option space, I keep the voice" positioning that D-018 / D-019 protect.

### Footnote 1 (2026-05-14, prompt v2): positioned titles + distinct audiences

Two taskforce-driven tightenings of the same prompt (see `docs/TASKFORCE_CRITIQUE.md` critiques 7a + 7b, Brand Strategist), bundled into one version bump because they target the same artefact and reinforce each other.

**What changed in the prompt.** Rule 1 now requires each angle to name a *different primary audience* — not three flavours of the same reader. If two angles drift toward the same stakeholder, only one survives; the other pivots. The reframed rule 3 (new) requires the `title` field to *encode the positioning* — "The premium-mainstream story" rather than "Three Surprising Findings". Style guidance updated to match. Rule 6 (omits) now explicitly frames the omission as a positioning *choice*, not an apology, so the model stops generating defensive-sounding omits language.

**What didn't change.** Schema is identical: `title`, `target_audience`, `omits`, `beats` are the same fields with the same types. The `omits` requirement is still mandatory and structurally enforced (D-036's core promise). The strict-abstention chassis (D-010), evidence-chain requirement, and confidence-per-claim model are untouched. The generator code (`src/lib/rag/story-generator.ts`) and the tool schema didn't move — the model just populates each field with a sharper instruction set.

**Why bundle in this footnote rather than a new D-NNN.** Same prompt, same artefact, same author (the angle generator). Both edits sharpen what D-036 already promised; neither contradicts it. A new D-NNN here would be inflation, not insight. When the underlying *contract* changes, a new entry is right. When the *execution* of the same contract gets sharper, a footnote is the honest log.

**Combined with D-038's `omits`-as-positioning UI reframe**, the angle stage now reads end-to-end as a positioning decision rather than a list of caveats. Title says "the premium-mainstream story"; omits explains what the positioning excludes; both are framed as deliberate, not defensive. The two changes only work together — splitting them would have left a half-state where the title was punchy-generic but the omits was honestly-positioned, which reads as inconsistency.

**Risk taken.** Positioned titles may feel less punchy on first read than generic-punchy titles. Mitigation: the lede stays the punchy line; the title gains positioning weight. If the new angles regenerate flat (literal "The X story" patterns), the prompt needs more examples — flag in EVALUATION_LOG.md on first real-corpus regeneration.

---

## D-048 — Optimistic accept/reject (D-8) — close the perceived-latency gap on the hot loop

### The story

In real fieldwork, decisions feel best when they're *immediate*. The moderator marks a respondent in-or-out and the field-team CAPI device flips the row visibly that instant. Premise's hypothesis / persona / variant cards weren't quite like that: click **Accept**, wait for a round-trip to PATCH the API, wait for a re-fetch of the list, then watch the card move buckets. <300ms in practice (which is why D-035 had deliberately deferred D-8 — "real value < real cost"). But Aaron's instruction this round was specifically *close the deferred items*, and when you're using the product back-to-back-to-back on a real wave, that 200-300ms compound feels heavier than the latency budget suggests.

So we closed D-8 — but only as much as actually mattered.

### What we built

Parent-level optimistic-override pattern in [`HypothesesArtefact`](src/components/canvas/hypotheses-artefact.tsx). The card calls `applyOptimistic(id, { status })` *before* firing the PATCH; the parent merges the override into its derived `effective` list; bucketing recomputes; the card moves to the destination column on the next render frame. On settlement the parent calls `onChange()` (server refresh) and clears the override. If the PATCH fails, `setBusy(null)` runs but the override is never cleared by `onSettled` — the next interaction or refresh resyncs from the server.

The pattern is small and contained:

```ts
const [overrides, setOverrides] = useState<Record<string, Partial<Hypothesis>>>({});
const effective = hypotheses.map(h => ({ ...h, ...(overrides[h.id] ?? {}) }));
const applyOptimistic = (id, patch) => setOverrides(p => ({ ...p, [id]: { ...p[id], ...patch } }));
```

Three reasons to do it this way rather than a global state-manager refactor:
1. **Override > controlled state.** The server stays the source of truth; the override is a frame-local lens.
2. **No retry logic, no rollback ceremony.** If the API fails (rare), the next refresh pulls truth back. We don't try to handle every edge case — we make the happy path feel instant.
3. **Same pattern applies to personas + recommendation cards** when those flows show measurable latency too. We left them unchanged in this push: their accept/reject volume is much lower (one persona accept at the start of a session vs. five hypothesis accepts after each regeneration), so the lag tax is proportionally smaller.

### What we considered

- **Streaming PATCH responses with intermediate states.** Total overkill for a status flip; would need a server-sent-events channel for a 200ms perceived-savings.
- **A global Redux/Zustand store for artefact state.** Architectural cost of a state manager for a UX gain measured in hundreds of milliseconds. Aaron's CLAUDE.md non-negotiable #6 — no LangChain, no agent frameworks — generalises to "no architecture for problems a `useState` already solves."
- **Skip D-8 entirely on the deferred-list close.** The original D-035 rationale ("flows are <300ms; real value < real cost") still holds for personas and recommendation cards, where accept-volume is low. For hypotheses, where the user accepts 3-5 cards in a single session right after generation, the close was worth doing.

### The PM lesson

**Deferral rationales are time-bound, not permanent.** D-035 was right when it was written: the perceived-latency cost wasn't worth a refactor. Six audit items later, with the rest of the deferred queue being addressed, the proportional cost dropped. The right move was to revisit the deferral, not honour it forever. Audit a deferred-items list periodically; some entries graduate from "deferred for now" to "worth doing".

**Optimistic UI is a layer, not a rewrite.** The temptation when adding optimistic updates is to refactor everything through a state manager. The minimum that actually delivers the felt improvement is a per-card override map that *adds* a render lens on top of the server-truth prop — without taking ownership of the data itself.

### What would break if we got it wrong

Make every card hold its own optimistic state in isolation: the bucket-level rendering doesn't see the change, so the card "stays" in proposed while internally claiming accepted — exactly the visual stutter we were trying to avoid. The fix has to live at the parent that owns the bucketing.

Forget to clear the override after `onChange()`: the override sticks around forever, stale, masking server-truth on subsequent edits. The `refreshAndClear` helper exists specifically to keep these in lockstep.

Try to do this for all four artefact types in one push: scope creep on a low-leverage UX improvement. Establishing the pattern on hypotheses (highest accept-volume) is enough for now; personas and recommendation cards adopt it the same way when their accept-volume warrants it.

---

## D-047 — Public library is read-only and opt-in per project (taskforce-driven)

### The story

After the first 66-document public-corpus seed (D-044) and the commercial-safety guardrail (D-045), Aaron opened the public-library project in the canvas and saw a UI that had two problems:

1. **Every public-library document had a DELETE button next to it.** From inside the public-library project, a single accidental click would have removed a shared document for every researcher who depended on it.
2. **The PublicLibrariesSection at the top of every project's corpus pane silently auto-included all public-library docs in retrieval.** Researchers couldn't tell whether a cited chunk was from *their* corpus or from the shared library, and there was no toggle to turn the shared library off for confidential client work.

Both are the same shape of mistake: confusing "shared resource" with "user-owned resource." The fix is the same shape too: name the boundary clearly, then enforce it at every layer the boundary crosses.

### What we built

**Schema-level boundary** (migration 0015). New column on `projects`: `include_public_libraries boolean default false`. Existing projects backfill to `true` so the May 2026 deploy doesn't change behaviour for in-progress work; new projects start at `false` (explicit opt-in). The same migration-time backfill pattern as D-037 — a default change behind a backfill so the cutover is invisible to existing users.

**Retrieval-time enforcement** ([`src/lib/rag/retrieval.ts`](src/lib/rag/retrieval.ts)). The retrieve function now reads `project.include_public_libraries` and short-circuits `getPublicLibraryIds()` when the flag is off. Same SQL-boundary pattern as D-016 (confidentiality) and D-045 (commercial-safety): application code can forget; the schema and retrieval layer cannot.

**UI surfaces three rules**:
- When viewing a public-library project (`is_public = true`), the corpus pane hides the Upload button, the URL-fetch input, and the per-document DELETE buttons. A "Public library — read-only" chip appears in the header. The DELETE endpoint already blocked public projects ([src/app/api/projects/[id]/route.ts](src/app/api/projects/[id]/route.ts) lines 26-31) — the UI now matches.
- The `PublicLibrariesSection` no longer inline-expands the full doc list. It's now a single-line opt-in toggle: "Public library — 67 docs — included / not included in this project's retrievals" with an `Include`/`Remove` button that PATCHes the project flag. The previous BROWSE expansion was redundant with the project's own document list and was the surface that made the DELETE-on-public-doc confusion possible in the first place.
- A new PATCH endpoint on `/api/projects/[id]` accepts `include_public_libraries: boolean` and refuses to mutate public projects (the public library itself can't be edited from the UI).

### What we considered

- **A separate "public library inclusion" UI surface elsewhere in the app.** Considered, rejected — the natural place is the corpus pane, since the corpus is what retrieval pulls from. Putting it in Settings would have made the boundary invisible at the moment of decision (uploading a sensitive document).
- **Default `include_public_libraries = true` for new projects.** Considered, rejected. Aaron's instruction was unambiguous — opt-in. The cold-start argument (D-033) for auto-inclusion was true when the public library was the only corpus; with users now uploading their own documents, the auto-merge muddies which chunks ground which claims.
- **Inline-render the public-library doc list collapsed-by-default.** Rejected — the user asked for the inline list to be gone entirely. The right place to browse the library is to open the public-library project in the project switcher (which now loads read-only).

### The PM lesson

**Read-only resources need to look read-only.** A DELETE button on a shared document is a bug even if the API blocks the call — the UI is a promise about what's possible. The schema enforces the boundary, the API rejects the call, but the UI is the only surface the user actually sees, and the UI was lying about what they could do.

**"Auto-included" silently is rarely the right default for a shared resource.** Cold-start arguments for auto-inclusion (D-033) are real when there's nothing else in the user's corpus; they decay as soon as the user uploads anything of their own. Audit each "auto-" default in the product every few quarters — most of them outlive their original justification.

### What would break if we got it wrong

Skip the schema column and just gate at the UI: a future code path that calls `retrieve` directly (an eval, a back-fill script, a one-off API exploration) inherits the old auto-merge behaviour, and a confidential project leaks shared-library chunks into its grounding without the researcher knowing. The gate has to live in `retrieve`, not above it.

Skip the UI fix and leave the DELETE button on public docs: even if the API blocks the call (it does), the first time a researcher clicks it and sees a 403 they get a "wait, was this a button I was allowed to use?" pause that erodes the trust commitment the rest of the product works hard to earn.

Default `include_public_libraries = true` for new projects to "make onboarding easier": defeats the entire boundary, plus surprises NDA-bound projects with shared corpus contamination at exactly the wrong moment.

---

## D-046 — Closing the deferred audit items: judge probes + adversarial probes

### The story

D-035 (audit Tier 3-5 push) closed 14 of 22 items and deferred 4 with rationale. Audit #2 added five more deferred items (E-1 through E-5). After D-045 shipped the commercial-safety guardrail, the deferred-items list was the next natural workstream — and Aaron's instruction was direct: *close them*.

The deferred list, audited honestly:

| Item | Original rationale | Honest re-read |
|---|---|---|
| D-7 streaming responses | "Architectural shift; touches every generation" | Still true. Loading-stage hints (D-035) cover the perceived-latency gap at much lower cost. **Keep deferred.** |
| R-5 skip logic / question ordering / screener | "Real questionnaire-builder territory" | Still true. Whole product area, not a closable item. **Keep deferred.** |
| R-1 / R-2 judge probes (hypothesis specificity, persona under_represents quality) | "Subjective quality eval probes, Sonnet-as-judge" | Closable — the D-042 citation-accuracy chassis is the template. |
| D-8 optimistic UI | "Flows are <300ms; real value < real cost" | Worth revisiting (see [[d-048]]). |
| E-1 story-angle quality probe | "Subjective quality; needs human-scored baseline" | Closable — rubric-based judge sets the synthetic baseline; human scoring layers on later. |
| E-2 recommendation quality probe | "D-039 just shipped; needs real-corpus data" | Closable — synthesised upstream context (frozen hypotheses/personas/analysis) lets us judge the generator behaviour without depending on real-wave data. |
| E-3 variant-recommendation accuracy probe | "selection_mode telemetry will provide signal organically" | Closable — we don't have real selection_mode data yet; a judge-agreement probe gives a synthetic short-loop signal until telemetry accumulates. |
| E-4 adversarial / prompt-injection probes | "Worth a dedicated probe type when product enters a real user environment" | Closable — the product *is* in a real user environment (live at premise-one.vercel.app). |
| E-5 model-regression A/B | "Do once per new model, not as a permanent CI gate" | **Keep deferred.** One-shot pattern, not a probe type. |

Six closable. Two stay deferred for the same reasons they were originally — those reasons hold.

### What we built

**Six new probe types** wired into the eval harness:

| Probe type | Closes | What it catches |
|---|---|---|
| `hypothesis-judge` | R-1 | Sonnet rubric: specificity, falsifiability, evidence_tightness, novelty, distinctness across set |
| `persona-judge` | R-2 | Sonnet rubric: behavioural specificity, distinctness, under_represents quality, grounded to corpus |
| `recommendation-judge` | E-2 | Sonnet rubric: causal insight clarity, action specificity, calibration honesty, caveat completeness |
| `story-angle-judge` | E-1 | Sonnet rubric: audience distinctness across set, lede sharpness, evidence chain coherence, omits honesty |
| `variant-judge` | E-3 | Independent Sonnet picks the fatigue-default per question; measures agreement rate vs `is_recommended` |
| `prompt-injection` | E-4 | Adversarial inputs (ignore-prior, fake chunk IDs, system-prompt leak); must abstain or refuse |

**A shared `judgeWithSonnet` primitive** in [`evals/lib/judge.ts`](evals/lib/judge.ts) — takes dimensions + rubric + payload, returns scored 1-5 per dimension via forced tool_use. The four creative-output judges (hypothesis / persona / recommendation / story-angle) share this; the variant-judge uses a smaller picks-array tool; the prompt-injection probe reuses the existing claim-and-citation assertions.

**A synthesis helper** in [`evals/lib/synth.ts`](evals/lib/synth.ts) — casts compact JSON-fixture payloads into typed `Hypothesis` / `Persona` / `Analysis` / `Recommendation` shapes so deep-chain probes (recommendation, story-angle, variant) don't need a real upstream pipeline to run.

**Twelve fixtures** across the six probe types — minimum two per type for hypothesis / persona / prompt-injection, single load-bearing fixture for the deep-chain probes (one is enough to detect regression on the prompt structure; more would just multiply costs without changing signal).

### What we considered

- **Build judge probes that take frozen *outputs* as fixtures and only score them.** Faster, cheaper, no live generation. Rejected — the point of a regression probe is to score *the generator's current behaviour*, not yesterday's frozen artefacts. Frozen-output probes would have scored 5/5 forever even as the live system drifted.
- **Skip the deep-chain probes (recommendation, story-angle) until the product has accumulated real-corpus data.** That was D-039's deferral reasoning. Rejected on re-read: the synthesised upstream context is sufficient to detect generator regression on the prompt itself, which is what we care about. Real-corpus probes can layer on top later.
- **Add a sixth dimension to every judge rubric to capture "Aaron's editorial voice."** Considered, rejected — that's a positioning property of the *output as shipped to the deck*, not a property of the generator. Judging it here would conflate the prompt with the human editorial pass on top of it.
- **Add `recommendation-rejection-rationale` telemetry as a probe.** That's a real-usage signal, not a synthetic probe. The probe says "did the generator produce something a stricter reviewer agrees with?" — the telemetry says "did the researcher accept what the generator produced?" Both are useful; both are different layers.

### The PM lesson

**Deferred items are a backlog, not a graveyard.** D-035 framed the deferred-items list as "we'll do these when a real wave surfaces the need." That's a reasonable rule until you find yourself doing all the *other* items in the queue — at which point the deferred items become the easiest items left, and the rationale shifts from "wait for the signal" to "close them because the marginal cost is now low."

**Judge probes are the ceiling; structural probes are the floor.** The existing `hypothesis-quality` probe asserts fields exist and statements are non-duplicate — the floor. The new `hypothesis-judge` probe scores qualitative properties — the ceiling. Both matter; neither alone is enough. Same logic D-038 applied to strict abstention (the floor) vs calibrated estimation (the ceiling): an eval harness without a ceiling lets quality drift inside the structural envelope.

### What would break if we got it wrong

Use the same Haiku verifier model to judge the output it just produced: zero independence, false-positive rate compounds. The whole point of D-042 was *independent* Sonnet judging the Haiku verifier; same principle generalises to every quality probe.

Skip the synth.ts helper and try to chain real DB writes for upstream context: every probe run leaves stray hypothesis/persona/recommendation rows in the eval project DB, the eval-setup reset becomes brittle, and the probe runtimes triple. Synth shapes are read-only typed casts — the generator reads them and produces output; nothing persists.

Treat E-4 (prompt-injection) as a one-shot smoke test: the value of adversarial probes is in catching prompt-template drift over time. A probe type that runs every audit cycle is worth strictly more than a one-time pen-test.

---

## D-045 — Commercial-safety guardrail on the public corpus

### The story

After the first 66-document seed of the public library landed, Aaron raised a specific worry: *"I think when I'm going commercial with this, I could just forget to exclude these."* The "these" being the documents whose licences forbid commercial reuse — the KPMG/Melbourne AI-trust report (CC-BY-NC-SA), the trade-body methodology pieces marked `permission-licensed` (publishers want explicit grants), and the documents whose licence is still `unknown` because the verification didn't happen at ingest time.

This is the classic "we'll remember at the right moment" failure mode. The right moment is the commercial pivot. The pivot day is the day most likely to have other things on the operator's mind. *Remembering* is the wrong mechanism.

The taskforce IP-lawyer rule from D-044 said it clearly: a takedown notice that lands during commercial use, on content the corpus shouldn't have surfaced commercially, is the kind of incident that ends a small product. The defensive answer is to build the boundary *now*, in the database, with a single switch that toggles it.

### What we built

**Schema-level guardrail (migration 0014).** A generated column on the documents table:

```sql
alter table documents add column if not exists commercial_use_blocked boolean
  generated always as (
    licence is null
    or licence in ('unknown', 'cc-by-nc-4.0', 'cc-by-nc-sa-4.0', 'permission-licensed')
  ) stored;
```

The column is computed by Postgres from the `licence` value. Application code cannot write to it directly — it's a generated column. Editing the licence in the manifest, re-running `npm run seed-public-corpus`, flows the new licence to the documents table, and the generated column recomputes. **The single source of truth for "is this document commercial-safe?" is the licence value, normalised through one rule.**

**Retrieval-time filter (`src/lib/rag/retrieval.ts`).** When the env var `PREMISE_COMMERCIAL_MODE` is set to `true` / `1` / `yes`, `retrieve()`:

1. Slightly over-fetches from `match_chunks` (2× the requested top-k) so the post-filter doesn't leave the result short.
2. Queries the small set of `commercial_use_blocked=true` document IDs.
3. Drops any returned chunk whose `document_id` is in the blocked set.
4. Returns the top-k from what remains.

Default: `PREMISE_COMMERCIAL_MODE=false`. Every existing portfolio-phase deployment is unaffected. Setting it to `true` is the *act* of going commercial — the filter is impossible to "forget" because flipping the variable *is* the going-commercial event.

**Helpers (`src/lib/db/commercial-safety.ts`).** Three functions: `isCommercialModeActive()` reads the env var with the standard truthy parsing; `getCommerciallyBlockedDocumentIds()` returns the blocked set for retrieval; `partitionPublicLibraryBySafety()` returns documents grouped by safety status with the reason for blocking.

**Audit script (`npm run audit-public-corpus`).** Lists every document in the public library partitioned into `BLOCKED` (with grouped reasons: NC, unverified, permission-required) and `SAFE`. Includes percentages and clear next-step instructions for unblocking. Designed to be run at any moment — particularly the moment *before* flipping the commercial-mode flag. You see exactly what's about to disappear.

### Why this pattern (and not deletion)

Two alternatives considered and rejected:

**Alternative 1 — delete the NC documents now.** Considered for ~30 seconds. Rejected because (a) it's irreversible — re-ingesting requires re-downloading; (b) it permanently loses the counter-balance value of the KPMG/Melbourne piece for portfolio use; (c) it doesn't actually solve the problem because the *next* corpus refresh might pull more NC content and we'd be back where we started. The pattern needs to be structural, not point-in-time.

**Alternative 2 — application-layer flag without the generated column.** Considered. Rejected because it puts the "what's safe?" rule in application code, where future changes to the licence enum would silently drift from the safety rule. The generated column ties them together: change the licence enum → revisit the `add column ... generated always as (...)` formula in one place → the whole pipeline auto-recomputes.

The pattern we chose is the same as D-016's SQL-boundary confidentiality enforcement, applied to a different invariant. *Don't trust application code to remember structural commitments.* Bake them in.

### Why `permission-licensed` is in the blocked set

The taxonomy in D-044 introduced `permission-licensed` for documents whose publishers require explicit written permission. The semantics are ambiguous: it could mean "we need permission and haven't asked" or "we have permission for some specific scope." The audit script makes this distinction by surfacing every permission-licensed entry in the blocked list with the note *"verify granted scope before unblocking"*.

When Aaron emails ESOMAR / MRS / AAPOR and receives a permission email, the workflow is:

1. File the permission text in `docs/PUBLIC_CORPUS_LICENSING.md`.
2. Update the manifest entry's `licence` from `permission-licensed` to something specific that captures the grant — e.g., `attribution-permitted` if the grant allows attribution-credited reuse, or `cc-by-4.0` if the publisher releases under that.
3. Re-run `npm run seed-public-corpus`. The generated column recomputes; the document moves from BLOCKED to SAFE.

This forces the editorial discipline (verify the specific permission scope per document) without making the pattern itself complicated.

### What we deliberately did *not* build

- **Auto-deletion of NC content at commercial-mode flip.** Considered. Rejected: too aggressive. Filtering at retrieval time means the documents remain in the DB and can be unblocked if Aaron later obtains a commercial licence (e.g., KPMG/Melbourne grants a commercial use waiver for Premise's launch tier). Auto-deletion forecloses that option.
- **An alert when commercial-mode is on AND blocked documents exist.** Nice to have; pre-launch the audit script covers it. If commercial-mode ever runs in CI, an automatic alert here would be cheap to add.
- **A more granular licence model** (commercial-OK-with-cap, commercial-OK-with-revenue-share, etc.). Out of scope. The current binary (blocked / safe) covers the immediate need; granular licensing is a commercial-tier problem to solve at the commercial pivot, not before.
- **Removing `permission-licensed` from the blocked set.** Considered making it "safe by default since it implies permission was granted." Rejected: too easy to mis-tag at ingest. Block-by-default is the conservative posture; unblock individually after verifying the permission scope.

### The cross-cutting checklist this had to pass

| Gate | Status |
|---|---|
| Migration template (D-037) | ✓ ALTER on existing table; existing grants apply |
| Schema-boundary enforcement (D-016 pattern) | ✓ generated column; app code can't bypass |
| Strict TypeScript | ✓ DocumentRecord extended; types match schema |
| Default-safe (existing deploys unaffected) | ✓ default `PREMISE_COMMERCIAL_MODE=false` |
| Reversible (don't delete content) | ✓ filter at retrieval, not deletion |
| Audit visibility | ✓ `npm run audit-public-corpus` |

### The PM lesson

**Build the gate before the pivot, not at the pivot.** Commercial pivots are stressful moments. The launch checklist has fifty items. Anything that depends on *remembering* a specific class of content at that moment is a class of incident waiting to happen. The cheap and durable answer is the same as for confidentiality (D-016): make the gate structural, gate the gate with a single switch, and let the switch be the pivot itself.

Wider AI-PM principle: **when a worry is "I'll forget X at the right moment," that's not a checklist problem, it's an architecture problem.** Checklists fail at scale. Architecture doesn't.

### What would break if we got it wrong

Delete the NC documents now: we lose the counter-balance value of KPMG/Melbourne (the single strongest non-Ipsos AI-trust piece) for the entire portfolio phase. Wrong tradeoff.

Application-layer filter without the DB-level boundary: a future refactor that adds a second retrieval path forgets to apply the filter. Suddenly NC content leaks through a different surface. The DB-level column closes that off — every retrieval path queries the same table, the same flag is always there.

`permission-licensed` defaulting to SAFE: a manifest entry that's never been verified silently surfaces in commercial mode. The publisher's takedown email arrives. Trust gone.

No env var, just always-on filter: portfolio phase loses access to documents that ARE legitimately surface-able during portfolio use (KPMG/Melbourne's NC clause is "non-commercial OK," not "blocked entirely"). The portfolio loses depth for no gain.

---

## D-044 — Public-corpus metadata + bulk-ingest scaffold (taskforce-driven)

### The story

D-033 created the public library — a project tagged `is_public=true`, shared across all users, that solved Premise's cold-start problem. Phase 5 / Audit-2 confirmed the *mechanism* works. What it didn't ship was the *editorial machinery*: the per-document provenance, the legal-bucket tracking, the source-type taxonomy, the curator's voice. Without those, the library is a heap of PDFs anyone could scrape; with them, the library is *Premise's curation IP*.

The public-corpus taskforce (`docs/PUBLIC_CORPUS_TASKFORCE.md`) convened ten experts and produced six themes. The first two — *legal-bucket-tracking is non-negotiable* and *curator notes are the moat* — became this commit.

### What we built

**Migration 0013** adds seven metadata columns to the `documents` table:

| Column | Type | Purpose |
|---|---|---|
| `licence` | text | SPDX-style identifier — `public-domain`, `ogl-uk-v3`, `cc-by-4.0`, `attribution-permitted`, `permission-licensed`, `unknown` |
| `licence_url` | text | URL of the publisher's terms-of-use page that supports the licence claim |
| `source_type` | text + CHECK | One of nine taskforce-recommended buckets: government / academic / trade-body / agency / analyst / think-tank / methodology / regional / meta |
| `publication_year` | int + CHECK | Recency filter (constrained to 1900–2100) |
| `geography` | text | `us` / `uk` / `eu` / `mena` / `india` / `sea` / `global` |
| `topic_tags` | text[] (GIN-indexed) | Lowercase kebab-case tags, e.g. `["consumer-expenditure", "household-spending"]` |
| `curators_note` | text | One paragraph in Aaron's voice — *researcher-to-researcher tone, never AI-generated* |

Four B-tree indexes (`source_type`, `publication_year`, `geography`) + one GIN index (`topic_tags`) for filtered-retrieval lanes — the RAG layer can scope a query "what does the *academic* literature say about price sensitivity?" by source_type before embedding search (RAG Engineer critique 9). ALTER on the existing table is grandfathered for grants per D-037, so no new GRANT statements.

**Types layer.** `Licence` and `SourceType` types in [src/lib/rag/types.ts](src/lib/rag/types.ts) mirror the schema enums. `DocumentRecord` carries the new fields end-to-end. The manifest below enforces the SPDX-style values at compile time even though the DB column is free text.

**Ingestion API extension.** [src/lib/db/documents.ts](src/lib/db/documents.ts) `ingestDocument` now accepts an optional `metadata` object that flows through to the insert. On content-hash duplicates the function calls the new `updateDocumentMetadata` helper — meaning **editing the manifest re-flows the editorial layer without re-embedding**. This is what makes the seed script safely re-runnable as the curator's voice evolves.

**Bulk-ingest scaffold.** Two new scripts plus a new directory:

- [scripts/public-library-manifest.ts](scripts/public-library-manifest.ts) — the typed manifest. Each entry: local file path + title + publisher + year + source_type + geography + tags + licence + licence_url + curator note. Three commented-out examples (BLS / Pew / Likert 1932) show the shape.
- [scripts/seed-public-corpus.ts](scripts/seed-public-corpus.ts) — the bulk ingester. Finds-or-creates the public library project, iterates the manifest, extracts text from each local PDF/DOCX/TXT via the existing `extractFromFile` pipeline (D-031), calls `ingestDocument` with the manifest metadata. Reports per-entry: ✓ newly ingested / ↻ metadata refreshed / ⊘ missing on disk / ✗ failed. Tallies total embedding tokens + estimated cost.
- `corpus/public-library/` — local-only directory for downloaded source PDFs. Gitignored except for the `.gitkeep`. The manifest is the canonical record; the PDFs are local working files.

**npm script.** `npm run seed-public-corpus` added to `package.json` alongside the existing `seed-public-library` (project creation) — the two are complementary: one creates the library project, the other populates it.

**[docs/PUBLIC_CORPUS_LICENSING.md](docs/PUBLIC_CORPUS_LICENSING.md)** — the licensing tracker. Four legal buckets defined upfront (public domain / CC-OGL / attribution-permitted / permission-licensed), verbatim licence-statement templates for each bucket, an empty permission-emails section for ESOMAR / MRS / AAPOR / AMA / ARF, a per-document audit log, and explicit playbooks for "what to do if publisher terms change" and "what to do if a takedown notice arrives." This is the IP lawyer's load-bearing gate from the taskforce.

### Why a manifest + script, not a CLI flag per field

Considered three approaches:

1. **Extend `ingest.ts` with `--licence=… --source-type=… --geography=…` flags.** Eight flags per file × 200 files = brittle, error-prone, hard to review.
2. **A CSV manifest.** Simple but loses TypeScript-level validation on the licence and source-type enums.
3. **A typed TS manifest.** Compile-time enforcement of the enums; one file to edit; one command to run; easy to diff in PRs.

Chose 3. The manifest *is* the editorial record. Reading `public-library-manifest.ts` is reading the curated library.

### What we deliberately did *not* build

- **A web UI for managing manifest entries.** Premature. The manifest will be edited by Aaron in a code editor; a UI would be cosmetic and add maintenance burden.
- **An automatic content-fetcher** that downloads PDFs from the URLs Perplexity returns. Deliberate omission: download has to be human-confirmed to vet the licence footer before ingestion. Automating it would invite the IP-trap the taskforce warned about.
- **A `decommission-document` script** that removes a document and its chunks when a publisher's terms change. Worth building once the corpus crosses ~50 documents; for week 1 a manual SQL cleanup is fine. Logged as a follow-up in `PUBLIC_CORPUS_LICENSING.md`.
- **A UI surface in the canvas** that filters retrieved chunks by `source_type` (e.g. "show only academic"). The metadata is now retrievable; the UI can use it later. The retrieval-layer integration is its own future commit.
- **An auto-generated curator note from the bot.** Hard rule: curator notes are in Aaron's voice. The whole point of D-038 / D-044 is that the editorial layer is the moat — automating it collapses the moat into a commodity.

### The cross-cutting checklist this had to pass

| Gate | Status |
|---|---|
| Migration template (D-037) | ✓ ALTER on existing table; existing grants apply |
| Strict TypeScript (no implicit any) | ✓ |
| Zod validation | n/a (CLI script, not API surface) |
| Cost telemetry (D-023) | ✓ inherits via the existing `ingestDocument` path |
| Retry (D-027) | ✓ inherited |
| Editorial honesty (D-038) | ✓ curator notes are non-AI-generated by rule |

### The PM lesson

**The editorial layer is the most overlooked moat in AI products.** Premise's competitors can scrape every PDF that's publicly accessible; they cannot replicate Aaron's curator voice, his choice of which 200 to ingest, his categorisation, his "start here" reading list. That entire layer lives in a manifest file and a curator's-note field. Tiny structural artefact; large positioning consequence.

For AI PMs specifically: **before you scale data, scale the *taste* layer that selects what data goes in.** Bigger corpus is rarely better; better-curated corpus is almost always better.

### What would break if we got it wrong

Skip the licence column: a year from now a publisher's takedown notice lands, and you can't tell which of 200 documents is at risk. Recovery becomes "delete everything and start over."

Auto-generate curator notes: the editorial moat collapses. Every prospect who clicks through reads bot-flavoured paragraphs that read identically to every other AI-curated library. The "I built this" provenance disappears.

Allow ambiguous licences ("free to read" with no terms statement): the corpus accumulates legal fragility. When commercial pivot arrives, every ambiguous-licence document becomes a procurement-team blocker.

Skip the manifest typing: a manifest of 200 entries with typo'd `source_type` values silently retrieves wrong, and there's no compile-time signal that anything's broken.

---

## D-043 — Cost-at-scale calculator: the answer to "how much per study?"

### The story

Every commercial conversation about Premise opens the same way. The prospective buyer, three minutes into the call, asks one question: *"so how much does it cost to run a study on this?"* Before this commit, the honest answer was *"I'll get back to you."* That answer kills credibility the way "I don't know" kills a board recommendation — the prospect concludes Premise is a portfolio project run by someone who hasn't done the commercial math.

The taskforce's senior AI PM (critique 10d) named it cleanly: *"<$5/month is a portfolio constraint, not a production constraint. The first time a real researcher uploads 500 transcripts you'll see what production economics actually look like. Premise needs a 'simulate cost at scale' calculator before any commercial conversation, or the conversation goes 'how much per study?' / 'I don't know.'"*

So we built the calculator. Standalone page, no auth, linkable from anywhere.

### What we built

**Aggregation helper.** [src/lib/db/cost-projection.ts](src/lib/db/cost-projection.ts) reads `api_calls` (D-023's telemetry table) and rolls every recorded call into one of nine buckets keyed by stage of the research lifecycle: ingestion, ask, hypothesis-gen, persona-gen, question-gen, analysis-gen, recommendation-gen, story-gen, story-outline. For each bucket it computes call_count, avg_cost_usd, and total_cost_usd from the observed data. Where a bucket has fewer than 3 observations, the helper falls back to a published table of conservative estimates drawn from Premise's own dogfooding runs at known token rates and an 80%-cache-hit assumption (D-021).

**Projection function.** Same module. Given a `ProjectionInput` (docs, questions, generations_per_stage, outlines), it multiplies each bucket's average by the appropriate volume and returns per-bucket costs, a per-study total, an "at 10 studies/month" total, and a percentage breakdown. The breakdown is what makes the calculator useful in conversation — the prospect immediately sees which stage dominates, which is almost always the question generator at default volumes.

**Public API endpoint.** [GET /api/cost-projection](src/app/api/cost-projection/route.ts). Zod-validates query parameters (`docs`, `questions`, `generations_per_stage`, `outlines`), reads aggregated averages, returns the projection. Crucially **no auth**: the response is anonymised aggregation — no project_id, no project content, no per-call rows leave the server. Same private-share posture as the live demo (D-030): semi-public, linkable, not broadcast.

**The page.** [/cost-calculator](src/app/cost-calculator/page.tsx). Four sliders (docs 0–500, questions 0–500, regenerations 1–10, outlines 0–10), a hero showing per-study and monthly cost, a per-stage breakdown that labels each row as "observed (N calls)" or "fallback estimate," and a "how costs scale" footer that names the top 4 stages by share. The hero is the *single number* a buyer screenshots and brings to their procurement meeting; everything else is the audit trail behind that number.

### Why "observed" + "fallback" matters

The first failure mode of a cost calculator is *confidently wrong numbers*. The second is *no calculator at all*. The hybrid pattern handles both:

- **Observed averages** appear once a bucket has ≥3 real calls in `api_calls`. The label says "observed (N calls)" so the buyer can see how trustworthy the figure is.
- **Fallback estimates** appear when the bucket has no real data yet (e.g. a fresh deployment, or a stage the user hasn't exercised). The label says "fallback estimate (no observations yet)" — visibly hedged. Conservative on purpose so the calculator never *under*-projects.

This is the same instinct as D-038's strict-abstention reframe: the floor is "never lie about cost"; the ceiling is "calibrated estimation with bounded uncertainty." Same posture, different artefact.

### What we deliberately did *not* build

- **Per-tenant cost meter** (live billing-style). Would require auth, per-project scoping, and an entirely different threat model. The calculator's job is a *projection* for buyers, not a *meter* for users. Real per-tenant billing comes with commercial pivot.
- **Cache hit rate dial.** Tempting — let the buyer toggle "what if my cache hit rate is only 50%?" Decided against: too noisy. The fallback assumes a realistic 80% rate; the observed data already reflects whatever your actual cache rate is. A dial would invite confusion about which lever to pull.
- **Multi-model cost comparison.** "What if you ran on Sonnet for everything?" Out of scope. Premise's model routing (D-002) is a deliberate product decision, not a knob the buyer chooses.
- **Cost regression test in CI.** The eval CLI already pulls aggregate cost (`evals/cli.ts:108-142`); regression gating on cost-per-probe is a known follow-up (audit-2 item, not in this wave).
- **Hide the fallback estimates.** Considered — the page is cleaner if every bucket shows "observed". Rejected: invites false confidence. Visible hedging is the discipline.

### The PM lesson

**Build the calculator before the commercial conversation, not during.** A prospect who asks "how much per study?" and hears "I'll get back to you" has just learned that the builder hasn't thought commercially. A prospect who hears "here's the calculator, here's the link, plug in your numbers" has just learned the builder respects their job. Same product, totally different read.

The deeper lesson for AI PMs: **the answer to "how much does this cost?" is a product surface, not a finance question.** Every commercial AI product needs a calculator — a linkable, sharable, slider-driven artefact that turns "AI is unpredictably expensive" into "this much, for this shape of work, with these assumptions you can see." The calculator is the floor; the buyer's mileage above it is calibrated uncertainty. Same pattern as D-038.

### What would break if we got it wrong

Skip the calculator: every commercial conversation gets stuck on "how much?" and never reaches "would it be useful?". The product reads as portfolio-only.

Show only observed averages with no fallbacks: a fresh deployment displays $0 per study (no calls recorded yet), which is *more* misleading than a labelled estimate. Fallbacks fail the right way.

Auth-gate the calculator: prospects can't link to it before they sign up, which destroys its purpose as a top-of-funnel artefact. Public-with-anonymised-aggregation is the discipline.

Bake cost figures into static documentation: the moment the model pricing or the prompt changes, the docs become quietly wrong. A live calculator stays honest as long as the underlying observations stay honest.

---

## D-042 — Citation-accuracy probe: independent Sonnet judge as a cross-check on the Haiku verifier

### The story

The strict-abstention chassis (D-010) is the load-bearing safety claim. Three layers — schema-forced tool_use, batched Haiku verifier (D-035 / L-5), UI gate — protect against fabricated claims. The audit-2 taskforce's AI-safety researcher (critique 8a) asked the obvious follow-up: *"What's your false-citation rate? The eval harness has 6 probe types but probe count is only 20 — that's a thin signal."*

The risk shape: the Haiku verifier could pass a claim that *looks* supported by its cited chunks but isn't quite — wrong magnitude, generalised assertion, near-but-not-exact match. Every "no false-positives" claim about strict-abstention needs evidence that the verifier itself doesn't drift.

The probe: run an INDEPENDENT judge — different model (Sonnet, not Haiku), different prompt (stricter rubric, explicit "no implication, no near-supports"), different surface (eval CI, not user-facing). If Sonnet rejects a claim that already shipped past Haiku, we've caught a verifier false-positive.

### What we built

**Probe type.** Added `citation-accuracy` to `evals/lib/types.ts`. Each probe carries `min_claims` (so the probe skips if generation produces too few claims to judge) and `min_support_rate` (typically 1.0 — *every* claim must be Sonnet-supported).

**Runner.** [evals/runners/citation-accuracy.ts](evals/runners/citation-accuracy.ts). Pipeline: ask the question via the full /api/ask path → collect the surviving claims → call Sonnet with a stricter system prompt that explicitly rejects "merely mentions the same topic", "implies something nearby", "adds detail the chunks don't contain", "generalises beyond what the chunks state". Sonnet returns one boolean per claim via forced tool_use; the probe passes if support_rate ≥ threshold.

**Fixtures.** Five JSON probes in `evals/probes/citation-accuracy/`, reusing the existing eval corpus (the same one golden-qa uses). The reuse is deliberate: golden-qa tests "did the bot answer correctly"; citation-accuracy tests "even though it claims to have answered correctly, do the citations actually carry the claim?". Same question, different question *about* the answer.

**CLI integration.** Added to `ALL_TYPES` in `evals/cli.ts` and to the switch dispatch. `npm run eval -- --type=citation-accuracy` runs the new probe-set on its own; `npm run eval` includes it in the full sweep.

### Why a separate model, not a stricter Haiku prompt

The first instinct was to make the existing Haiku verifier stricter and call it twice in eval mode. Rejected on two grounds:

1. **A separate model is the actual cross-check.** If we tune the Haiku verifier to be perfectly strict at eval time and slightly looser at runtime, we're auditing the loose version against the strict version — both of which are the same Haiku weights. A genuine cross-check uses a different model.
2. **Cost asymmetry permits it.** The runtime verifier runs on every `/api/ask` call; cost matters. The eval probe runs only in CI / on-demand; the ~$0.003 Sonnet judge cost per claim is acceptable for a quality gate.

### What we deliberately did *not* build

- **Variant of the probe that runs Sonnet judge in production.** Considered. Rejected: doubles runtime cost on every question, and the failure mode the probe catches — verifier drift — is a *trend* you detect in CI history, not a per-question alarm. Real-time judging belongs to defence-in-depth for a future high-stakes deployment.
- **A "judge disagrees with verifier" alarm in the eval reporter.** Today the probe just passes/fails on support_rate. A future enhancement: log the disagreement, accumulate over runs, and flag systematic drift. Worth a follow-up audit-2 item.
- **An adversarial / prompt-injection probe (taskforce 8c).** Different probe shape (malicious document fixtures, not citation auditing). Logged in EVALUATION_LOG.md as E-4 for a future round.
- **A self-consistency probe (taskforce 8e — same Q, 3 runs, citation-overlap metric).** Same reason as above; different shape, logged as E-3 follow-up.

### The PM lesson

**A safety claim without an independent audit is marketing.** Premise's strict-abstention story (D-010 / D-038) is the load-bearing trust commitment. Before D-042, the verifier was its own auditor — Haiku decides which claims survive, Haiku decides whether the verifier is doing its job. That's the configuration every regulator hates and every senior buyer probes for. After D-042, the audit is *external to the chassis it audits*. Same posture as financial auditors not auditing themselves.

The wider lesson for AI PMs building safety-claim products: **for every "the bot won't X" commitment, build an independent test that uses a different model / a different prompt / a different operator.** The independence is the credibility — the bot saying it won't fabricate is interesting; another bot, with stricter rules, agreeing that it didn't is evidence.

### What would break if we got it wrong

Use Haiku-as-judge: the audit catches none of the failures *its own training* missed. We'd ship a green CI signal that means nothing. The right level of independence is "different model, different prompt".

Skip the probe entirely: the strict-abstention story stays unaudited. The taskforce's AI-safety critique becomes the first comment under any LinkedIn post, and the honest answer is "we have 20 probes, no false-citation gate." That's a credibility-killer for an AI-safety product positioning.

Run judge in production on every query: doubles runtime cost, slows TTFR (time-to-first-result) by Sonnet latency on every ask. Eval-only is the right scope until a real high-stakes deployment justifies the runtime layer.

Threshold below 1.0: a "95% citation accuracy" floor lets through 1 in 20 unsupported claims. That's a fabrication rate higher than what generic LLMs produce on factual recall. The floor is 100% or the probe is theatrics.

---

## D-041 — Hypothesis revisions after analysis carry a deviation rationale (pre-registration pattern)

### The story

A senior researcher runs the analysis. The data comes back. Hypothesis 3 looks weaker than expected — but if she tweaks the wording from "high-income segments are price-insensitive" to "high-income segments are *less* price-sensitive than mid-tier", the verdict reads as confirmed. The deck reads cleaner. Nobody on the client side will notice.

Every senior researcher has been in the room when this happens. The honest research tradition has a name for it: *p-hacking by rewording*. The academic world has a name for the solution: *pre-registration with deviation reports* — sites like AsPredicted let you register a hypothesis ahead of time, and any post-hoc revision has to carry an explicit deviation note that's preserved in the final write-up.

The taskforce-critique round surfaced this through two voices that converged on the same answer:

- **The academic peer-reviewer (critique 9a):** *"A workflow that generates hypotheses AND tests them AND writes the story risks confirmation bias at industrial scale. The same model proposed the hypotheses and analysed whether the data supports them. There's no methodological independence."*
- **The behavioral scientist (4):** *"Hard locks invite workarounds — researchers will rephrase the hypothesis in another way or just not revise when they should. Soft warnings get clicked past by tired humans. The honest middle is a forced reflection moment."*

Aaron explicitly deferred the call to the taskforce. The taskforce ruled: *soft warning with a required revision rationale + audit trail surfaced downstream*. Not a hard lock. The researcher owns their work — but the deviation is named, dated, and follows the work all the way to the final deck.

### What we built

Three coordinated changes:

**Schema (migration 0012).** Two columns on the `hypotheses` table: `revised_after_analysis boolean default false` and `revision_rationale text`. Once set, they stay forever — the audit trail can't be quietly removed by clicking edit twice.

**API (`PATCH /api/hypotheses/[id]`).** When (a) the hypothesis is currently `accepted` AND (b) an analysis row exists on the brief AND (c) the request body modifies a *structural* field (`statement`, `expected_direction`, `confirmation_criteria`, `assumptions`, `priority`), the route requires a non-empty `revision_rationale` in the body. If missing, returns `422` with a message explaining what's needed and why. Status changes (`accept`/`reject`/`proposed`) are NOT structural — they have their own audit trail. The structural-vs-non-structural distinction lives in `STRUCTURAL_HYPOTHESIS_FIELDS` in `src/lib/db/hypotheses.ts` so the rule is visible in one place.

**UI (hypotheses artefact).** Two surfaces. **Before save**: if the edit is structural AND the hypothesis is accepted AND analysis exists, the Save button triggers a `window.prompt` that *requires* a non-empty rationale before the PATCH fires. Cancel returns to edit mode; empty rationale shows an alert. **After save**: the card shows a small amber "Revised post-analysis" tag in the header, with the rationale on hover and as a dedicated field in the expanded card view.

**Cascade — the integrity flows all the way to the story angles.** In `story-generator.ts`, after the angle drafts come back from the model, any angle whose `supporting_hypothesis_ids` reference a revised-post-analysis hypothesis gets the deviation appended to its `omits` field automatically. The format: `"[Deviation: H3 was revised after analysis (rationale: ...)]"`. The outline drafter (`OUTLINE_SYSTEM`) already passes `omits` into the closing footer, so a regenerated outline shows the deviation in the markdown that gets copy-pasted into the final deliverable. The honest practice flows from schema → API → UI → angle artefact → outline export. No layer can silently swallow it.

### Why this pattern, not a hard lock

Aaron asked the taskforce to decide. The taskforce ruled against a hard lock because:

1. **Hard locks invite workarounds.** A researcher who needs to revise a malformed hypothesis but is gated by a hard lock will either (a) delete the entire analysis to unlock — losing legitimate work — or (b) edit the hypothesis statement in a way the lock doesn't notice (e.g., changing only the verdict in their head). Neither outcome serves integrity.
2. **Pre-registration in academia is a deviation report, not a lock.** AsPredicted, OSF, and the Cochrane review process all use "register-then-report-deviation" as the discipline. Premise inherits a real-world pattern that has decades of validation.
3. **It matches D-018 / D-019 / D-036 / D-039.** Schema-enforced honesty is the project's compounding instinct — `omits` mandatory, `under_represents` mandatory, citations mandatory, caveats mandatory. Adding `revision_rationale` mandatory-when-structural-and-post-analysis is the same family of move.

### What we deliberately did *not* build

- **Hard locking on accepted hypotheses post-analysis.** Considered and rejected (above).
- **Locking on regenerate-proposed-hypotheses.** `replaceProposedHypotheses` only touches `proposed` rows; the accepted set that fed analysis is preserved. So regenerate doesn't need a lock.
- **Cascade to existing story angles that were generated *before* the revision happened.** A revision today doesn't retroactively rewrite yesterday's angle's `omits`. To pick up the deviation note, the user regenerates the angles. Same logic as how rejecting a hypothesis doesn't retroactively delete an analysis verdict (D-039). Existing angles are historical artefacts; the new state is new.
- **Per-field structural classification refinement.** Today every change to `statement`/`expected_direction`/`confirmation_criteria`/`assumptions`/`priority` triggers the rationale prompt. A future iteration could distinguish typo-fixes from real revisions, but that's a UX layer on top of an already-honest API.
- **Auto-decline-to-publish if too many revisions exist.** Tempting; out of scope for Wave 4. The audit trail is visible; the researcher's judgement on "is this still publishable?" is theirs.

### The PM lesson

**The right answer is rarely "lock the user out"; it's usually "make the trade-off visible."** The first instinct on a methodological-integrity gap is to prevent the user from doing the thing. The senior instinct is to let them do it AND make the cost of doing it visible AND make that visibility durable.

Premise's whole engineering posture is structural enforcement of disciplines a senior researcher already practices — strict abstention (D-010), evidence-citation (D-018), mandatory omits (D-036), causal-claim discipline (D-039), and now deviation reporting (D-041). The connective tissue across all of them: the researcher's judgement stays in charge; the integrity stays visible to everyone downstream. That's the pattern.

For AI PMs specifically: **when integrity and ergonomics conflict, the answer is usually "audit trail" not "rule enforcement."** Locks fight users; audit trails honour them and protect downstream readers at the same time.

### What would break if we got it wrong

Hard lock instead of rationale: researchers either tear up legitimate analyses to revise hypotheses, or they don't revise hypotheses that should be revised. Both outcomes degrade integrity worse than the soft prompt does.

Skip the cascade into story angles: a revised hypothesis silently feeds the story-angle stage; the angles confidently make claims that lean on a hypothesis whose original wording was different. The deviation report exists on the hypothesis card but the angle's omits doesn't mention it, so the published deck inherits the rewording without ever surfacing it. The integrity exists at the source but doesn't reach the audience.

Lock the proposed-regenerate flow too: the researcher's normal mid-flow tool — "regenerate the proposed set to explore alternatives" — gets blocked once they've ever run an analysis. Crippling. The accepted set is the integrity boundary; the proposed set is play space.

Allow empty rationale strings: the audit trail becomes a checkbox the user clicks through, exactly the failure mode the Behavioral Scientist warned about. Required non-empty is the floor.

---

## D-040 — Variant ordering: the recommended variant first, audit-trail-aware selection

### The story

The taskforce's behavioral scientist (critique 4a) named something every senior researcher has felt but rarely articulated: *"You've built a product whose UX requires researchers to evaluate 3 variants × ~30 questions per study. That's 90 decisions per questionnaire. Decision-fatigue research is unambiguous on this — by question 12, the researcher is defaulting to whichever variant is on top, regardless of whether it's the best. So whatever ranking algorithm you use for variant order *is* the variant the bot picks."*

The seductive response is to fight the UX physics — add gamification, force-rank requirements, hide the bot's preference. The honest response is to work *with* the physics: rather than randomising or alphabetising the variants, mark *which one fits the hypothesis best* and surface it first. Then the fatigue-default is a defensible default, not a random one. And every time the researcher overrides the recommendation, we capture it as an explicit signal — they actively picked something else.

### What we built

**Prompt change (`questions.ts` rule 10).** The variant generator now sets `is_recommended: true` on exactly one variant per question — the variant whose phrasing best fits the hypothesis being tested and the persona context. The other two are `false`. Post-generation, the generator normalises (if the model returns zero or multiple flagged variants, the first one wins so the audit trail is never ambiguous). Prompt version bumped `question-gen v3 → v4`.

**Schema (migration 0012).** Two columns on `question_variants`. `is_recommended boolean default false` carries the model's pick. `selection_mode text` (nullable, enum `'active'` / `'default'`) carries the researcher's audit trail — set server-side when they pick a variant.

**Server logic (`PATCH /api/questions/[id]`).** When the user updates `selected_variant_id`, the route flips `selection_mode` on the chosen variant: `default` if the chosen variant was the recommended one, `active` if not. All other variants on the question have their `selection_mode` reset to null (only one selection is active at a time). The client doesn't pass `selection_mode` — it's server-derived, so the client can't lie about whether the choice was active or default. Best-effort: if the variant lookup fails, we skip the mode write — `selection_mode` is observability, not correctness.

**UI (`questions-artefact.tsx`).** Three visual changes. First, variants are sorted with the recommended one *first* (then by ordinal). Second, the recommended variant carries a subtle sky-tinted border and a quiet "Recommended" tag in its header — *quiet* on purpose, so a researcher who disagrees feels invited to override rather than shouted at. Third, the selected variant displays `default pick` or `active pick` next to "SELECTED", with a tooltip explaining which it is. The badges are decoration, not friction.

### Why "default" is meaningful

The selection_mode distinction looks small but is the bridge between fatigue-default and active choice:

- **default**: the researcher accepted the recommended variant. Could be deliberate endorsement, could be fatigue. Either way the audit trail says "went with the bot's pick."
- **active**: the researcher overrode the recommendation. Definitionally a deliberate signal — they read both, picked the non-recommended one.

This becomes the input to later eval work: which question types is the bot's recommendation *trusted* on vs *overridden* on. That's a real signal about prompt quality the eval harness can act on without us writing a synthetic probe.

### What we deliberately did *not* build

- **A "force the researcher to look at all three" UI** (gating click on visible-time). Fights UX physics. Researchers who are tired *should* be able to accept the recommendation cheaply; the goal isn't to slow them down, it's to make the cheap path defensible.
- **A bigger visual treatment for the recommendation** (banner, badge, scarlet flag). Tested against the principle: "the researcher disposes." A loud recommendation pushes researchers toward acceptance, defeating the audit-trail signal we want. The quiet treatment is the discipline.
- **An eval probe for recommendation accuracy.** Flagged for Wave 5 alongside citation-accuracy and recommendation-quality probes. Shipping without one is acknowledged in the same way D-039 was.
- **Re-ordering of *accepted* variants when the user changes their mind.** Selection_mode flips correctly; sort order doesn't churn mid-decision. The recommendation stays anchored at index 0 even after a non-recommended pick.

### The PM lesson

**When a UX physics critique lands, the move is rarely "fight the physics" — it's "redirect the physics to a defensible default."** Decision fatigue can't be argued away. But the *target* of the default can be redesigned. Random alphabetisation makes fatigue accept random variants; ranked-by-fit makes fatigue accept the best variant. Same physics, vastly better outcomes.

For AI PMs specifically: **build affordances for the lazy version of your user, not just the engaged one.** The engaged user reads all three variants. The lazy user accepts whatever's on top. Premise's value to the lazy user is now anchored to a defensible default; Premise's value to the engaged user (overrides) generates an audit signal. Both modes are productive.

### What would break if we got it wrong

Order variants alphabetically by variant_type: the fatigue-default is "neutral_direct because A comes first", which is not always the best variant. The bot's quality contribution at the variant stage collapses to "format selection" rather than "methodological-fit ranking."

Mark every variant as recommended: the signal collapses; there's no audit trail to learn from. We've lost the active-vs-default distinction without gaining anything.

Loud recommendation UI: researchers feel pushed into the bot's pick. Active overrides drop sharply because the friction to override goes up. The audit signal that *did* exist gets corrupted by social-desirability bias against disagreeing with the bot.

Hide the recommendation from the user entirely: the bot still ranks internally but doesn't tell the user, so the visual order *is* the recommendation by stealth. Same outcome, dishonest framing. The user deserves to know what the bot thinks.

---

## D-039 — The Recommendation artefact: the C-suite-shaped output the angles ladder up to

### The story

The CMO walks into the board meeting with twenty minutes. The brand director has the deck. Forty slides, every chart pixel-perfect. Three story angles printed in the appendix, each beautifully framed for a different audience. The CMO flips to page three and says one thing: *so what's the recommendation?*

The deck doesn't have one. The deck has *findings*. The deck has *angles*. The deck has *verdicts*. The thing the CMO is asking for — the single causal claim, the single specific action, the single calibrated confidence — sits between the analysis chapter and the story chapter, and Premise was producing everything *around* it without producing *it*.

Critique 5 in the taskforce round (the imagined Director of Consumer & Market Intelligence at a Fortune-100 brand) named this exactly: *"Premise stops one step short of what makes research land. CMOs don't read 'lede + three beats + omits.' They want the chart that lives in the board pack, the one-line 'X moved because Y' insight, and the explicit 'so what do we do about it' recommendation. Premise produces an outline; it doesn't produce a recommendation."*

So we built the missing artefact.

### What we built

A new stage between analysis and story angles. One table (`recommendations`), one prompt (`RECOMMENDATION_SYSTEM`), one generator (Sonnet, forced tool_use), three API routes, one UI surface. Each recommendation has:

- **`insight`** — a *causal* claim. "The decline in mid-tier purchase frequency is driven by the perception that the brand has lost its accessibility edge." Not "purchase frequency declined and accessibility perceptions also moved." Mechanism over correlation. The prompt explicitly rejects descriptive framing.
- **`recommended_action`** — a *specific* action. "Reposition the mid-tier SKU to lean into the affordability narrative within Q3, led by brand and tested with the affordability-leaning persona segment." Not "consider repositioning." Generic is structurally rejected.
- **`confidence`** — *calibrated*: `high` / `medium` / `low`. High requires the causal mechanism to be supported by ≥2 hypothesis verdicts or ≥1 verdict + ≥1 emergent pattern AND no contradicting caveats. Low covers thin evidence chains. Same discipline as claim-confidence in the strict-RAG layer (D-010) — calibrated, not laundered.
- **`caveats`** — mandatory, ≥1, specific. Names the segments not represented, the timeframe limits, the methodological uncertainty. Generic ("results may vary") is rejected; the prompt requires specificity.
- **`supporting_hypothesis_ids` + `supporting_emergent_patterns`** — the evidence chain. ≥1 from one or the other. No grounding = rejected by the post-generation filter.

The artefact is propose-not-decide, like every other Premise output (D-019). The generator returns up to 3; the researcher accepts the one they ship with. *Fewer is better* is explicit in the prompt — if only one recommendation has a clean evidence chain, returning one beats padding to three. And if the evidence is genuinely too thin, the generator returns an empty array. The bot refuses to fabricate the spine of a deck.

### The cascade — story generator now reads from the accepted Recommendation

When story angles are generated for a brief, the angle prompt is now told: *if a recommendation is accepted, every angle's evidence chain MUST ladder up to it; the angles are different audiences for the same underlying insight, not different insights.* Without a recommendation, the story generator falls back to today's behaviour (drawing from hypotheses + emergent patterns directly).

This is the cascade I almost missed. Building the Recommendation artefact in isolation would have left the angle stage producing the same three-flavours-of-an-insight output it produced before. Wiring them together is what turns the Recommendation from "a new stage" into "the spine the whole back-half of the product hangs from."

The `story-gen` prompt-version bumped `v2 → v3`. The angle schema is unchanged.

### What we deliberately did *not* build

- **Auto-accept the top-priority Recommendation.** Tempting, fights propose-not-decide. Accept stays manual.
- **Single-accept enforcement.** If the researcher accepts two recommendations, the story generator picks the most recent (highest ordinal). This avoids a UI nag that would block them mid-flow; the assumption is researchers don't routinely accept multiple.
- **A "regenerate angles when recommendation changes" auto-trigger.** Confirmed earlier with Aaron: angles persist as the researcher's prior work; only future regenerations pick up the new state. Same logic as how rejecting a hypothesis doesn't retroactively delete an analysis verdict.
- **A recommendation-quality eval probe.** Flagged for Wave 5 alongside citation-accuracy. Shipping without the probe is a known gap; the strict-output chassis (D-010), forced tool_use, and post-generation evidence-chain filter cover the floor; the probe would cover the ceiling.

### The cross-cutting checklist this had to pass

Every gate from CLAUDE.md was checked before shipping:

| Gate | Status |
|---|---|
| Strict-output chassis (D-010) | ✓ forced tool_use, validated draft shape |
| Prompt caching (D-021) | ✓ system block has `cache_control: ephemeral` |
| Retry + jitter (D-027) | ✓ inherited via `tracedMessagesCreate` |
| Generation lock (D-028) | ✓ `recommendations:${briefId}` lock key |
| Atomic replace (D-026) | ✓ `replace_proposed_recommendations(...)` SQL function |
| Zod validation (D-025) | ✓ `UpdateRecommendationBody` |
| Safe-error responses (D-025) | ✓ all three routes wrapped |
| Edit affordance (D-024) | ✓ inline edit on insight + action + caveats |
| Cost telemetry (D-023) | ✓ inherited; `recommendation-gen` registered in prompt-versions |
| Migration template (D-037) | ✓ explicit `GRANT … to service_role` + `enable row level security` |
| Auth | ✓ `assertBriefAccess` + new `assertRecommendationAccess` |
| Grounding disclosure (D-038) | ✓ new `"recommendations"` context in the shared component |

### The PM lesson

**The most consequential missing artefact in an AI product is rarely a feature gap — it's a *decision* gap.** Premise produced inputs (hypotheses), tests (verdicts), patterns (emergent), and outputs (angles). Every layer was beautifully shaped. None of them was a *decision*. A senior buyer reads research to make a decision; if the tool stops at the inputs to a decision, the buyer has to do the synthesising work themselves — which is exactly the work AI-for-research promises to remove.

For AI PMs specifically: **map your product to your buyer's decision points, not to their workflow stages.** Workflow stages are how the researcher organises their day; decision points are how the C-suite values the output. Premise's workflow is brief → hypotheses → questionnaire → analysis → story. The buyer's decision points are: "what's the insight?" → "what should I do?" → "how confident are we?" → "what could go wrong?" The Recommendation artefact maps all four of those to one card. That's the format that lands in a board meeting.

### What would break if we got it wrong

Skip the Recommendation artefact: senior insights buyers click through to the live demo, read the story-angle output, and conclude that Premise "produces beautiful outputs but stops short of what we actually use." The product reads as an analyst tool, not a leadership tool. Same engineering, much smaller market.

Make the recommendation field a free-text "summary": the model produces a paragraph that sounds like an insight but isn't causally grounded. Researchers ship it. A CMO acts on it. Three months later, the change didn't move the needle, and the recommendation was correlational, not causal. Trust gone.

Skip the cascade into the story generator: angles continue to produce three flavours of the same finding, all of which now contradict the "decision" the Recommendation surfaced. The artefacts stop laddering up to each other. The product reads as a bag of features, not a coherent flow.

Auto-accept the top-priority recommendation: propose-not-decide collapses at the most expensive layer in the product. The researcher loses the moment where their domain instinct overrules a model judgement — exactly the moment Premise's principle is meant to protect.

---

## D-038 — Strict abstention is the floor, not the ceiling (taskforce-driven reframe)

### The story

A senior researcher walks into a debrief with three new datapoints, two ambiguous findings, and a missing wave. The C-suite asks "so what?" Two answers are wrong:

- *"I won't tell you anything I can't perfectly evidence."* — that's the bot Premise looked like, framed as "strict abstention." A junior insights buyer reads it as **a tool that refuses to do its job**.
- *"Here's my confident reading."* — that's every generic LLM. A senior insights buyer reads it as **a tool that fabricates with conviction**.

The right answer is what experienced researchers actually deliver: *"Based on what we have, my read is X with medium confidence. Here's the cut that would tighten it; here's what we don't yet have."* Calibrated, bounded, honest. Premise has always had the engineering for this — claim-level confidence levels live in the schema (`high`/`medium`/`low`); below-floor questions return a structured abstention that explicitly names `unanswered_aspects`. But the *positioning* was framed as marquee-abstention, which read as the refusing kind.

The taskforce-critique round (see `docs/TASKFORCE_CRITIQUE.md` critiques 5b, 8) made it explicit: *the floor is "the bot won't fabricate"; the ceiling is calibrated estimation*. The engineering doesn't change; the framing does.

### What we did

Four small, coherent changes:

- **Reframe the abstention narrative.** README.md, PITCH.md, PORTFOLIO.md: every place that called strict abstention the marquee feature now positions it as the floor, with calibrated estimation as what sits above. The product's behaviour is unchanged — the confidence-per-claim was already there; the abstention path was already structured.
- **Soften the chat-pane abstention copy.** [src/components/canvas/chat-pane.tsx](src/components/canvas/chat-pane.tsx) — header "Honest abstention" became "Below the grounding floor"; body "Premise refuses to fabricate; the items below explain what's missing" became "The corpus does not contain enough to ground an answer to this question. The items below name what would close the gap — additional documents, or a clarifying refinement of the question." Same behaviour, calibrated tone.
- **Reframe `omits` as positioning, not as confession.** Stories artefact: label "Omits:" became "Deliberately leaves out (address or own it):". The field stays in the schema (D-036) and stays mandatory; what changes is the framing — what an angle deliberately doesn't cover is a *positioning choice*, not a *failure*. Same `omits` value, different visual hierarchy.
- **Add the `GroundingDisclosure` component.** [src/components/canvas/grounding-disclosure.tsx](src/components/canvas/grounding-disclosure.tsx) — a single-line italic label under every RAG-grounded artefact (chat answers, hypotheses list, analysis verdicts, story angles) naming the scope of what the bot is grounded in. The corpus is the moat *and* the blind-spot reproducer — making that explicit is honest framing, not a weakness.
- **Add a "What Premise is *not*" section to the pitch.** PITCH.md lists three scope boundaries: not a validated-scale builder, not a substitute for qualitative interpretation, not yet hardened for paying clients. Knowing what a tool isn't is the same kind of discipline as the `omits` field on a story angle.

### Why this matters more than a wording tweak

Three reasons.

**One — positioning compounds.** A LinkedIn launch frame of "AI that refuses to fabricate" attracts the audience that wants a bot that *can't help*. A frame of "calibrated honesty on top of a zero-fabrication floor" attracts the audience that wants a bot that *can deliver*. Same engineering; entirely different demand signal.

**Two — the C-suite asymmetry.** The hierarchy of pain in commercial research, in order: (i) a fabricated stat in a deck; (ii) a confident-sounding wrong recommendation; (iii) "I don't know" with no context; (iv) calibrated uncertainty with a named gap. Premise was framed as protecting against (i) and (ii), which it does. The reframe says it also handles (iii) → (iv), which it always did but never said.

**Three — the floor/ceiling pattern itself is a transferable AI-PM lesson.** Every AI product has structural guarantees (the floor) and emergent quality (the ceiling). PMs who lead with the floor recruit cautious users; PMs who lead with the ceiling recruit ambitious ones; PMs who lead with both win. The first audit-driven framing change was an asset reallocation, not a content change.

### What we deliberately did *not* change

- **No behaviour change.** The strict-output chassis (D-010), confidence-per-claim schema, abstention path, and verifier pass all behave identically. No prompt was modified. No eval shifted.
- **No new feature was added.** The grounding-disclosure component is text in a styled wrapper. The four edits to artefact components are JSX one-liners.
- **The `omits` field stays mandatory.** D-036's schema enforcement is preserved. What changed is the visual label — the structural truth-tax is intact.
- **No new D-NNN per surface.** This entry covers all four framing edits as one coherent reframe driven by the taskforce critique round.

### The PM lesson

**A positioning gap is not a product gap.** When taskforce experts said "strict abstention reads wrong to a C-suite buyer," the temptation was to *build* a calibrated-estimation feature. Wrong move — the feature was already there. The fix was naming what already existed correctly. Save the build cycles for the gaps that *are* product gaps (Recommendation artefact, angle audience-diversity, citation-accuracy eval — those are the next D-NN entries).

The wider AI-PM principle: **before scoping a feature in response to feedback, check whether the same behaviour already exists under a different name.** Half of "missing capability" feedback is actually positioning feedback in disguise.

### What would break if we got it wrong

Lead with "strict abstention" on the LinkedIn launch: senior insights buyers click through expecting a tool that hedges everything; they bounce. The post gets engagement from cautious technologists, not from researchers.

Drop the `omits` field entirely to make angles read as confident: the bot starts producing beautiful, audience-skewed angles that hide their blind spots. The first time a client asks "what about Tier-3?" the researcher has no answer. The trust loss is permanent.

Add the grounding-disclosure as a giant banner instead of a one-line italic: it reads as cover-your-arse legalese, which is worse than no disclosure at all. The discipline of *honest framing* is in the calibration of how much real-estate it gets, not just whether it exists.

---

## D-037 — Explicit `GRANT`s on every new table (Supabase removed the implicit default)

### The story

Imagine the building-management company that hosts your agency office sends a memo: "From October, any new room you fit out on your floor needs an extra access-control form signed before the door-card system will open it. Existing rooms are grandfathered." You don't need to do anything for the rooms you already have. But the very next time you add a meeting room, if you skip the form, nobody — not even you — can get in. The card readers stare at you blankly and beep `42501`.

Supabase sent us that memo on 2026-05-14. The rooms are tables. The card-reader system is the Data API (PostgREST + supabase-js + GraphQL — the thing browser code uses to talk to the database). The form is a `GRANT` statement.

### What changed

Supabase has historically auto-exposed every table in the `public` schema to the Data API. That convenience default is going away:

- **2026-05-30** — default flips for *brand-new Supabase projects*. The `premise` project predates this, so it's untouched.
- **2026-10-30** — enforced on *all existing projects*. Any table created **after that date** in our project will not be visible to supabase-js / PostgREST / GraphQL unless the migration explicitly grants access. Tables that already exist on that date keep their grants forever.

If a grant is missing, the Data API returns Postgres error `42501` and helpfully tells you the exact `GRANT` statement that would fix it.

### Premise's exposure

We use `supabase-js` everywhere data flows. Two clients in play:

- **Server-side, `service_role` key** ([src/lib/db/supabase.ts:17-25](src/lib/db/supabase.ts#L17-L25)) — the master key. Used by every API route, the ingestion CLI, the eval harness. This is the path that breaks if grants are missing.
- **Browser-side, `anon` key** ([src/lib/auth/browser.ts](src/lib/auth/browser.ts)) — only ever calls `supabase.auth.signInWithOtp` / `signOut`. Never reads tables directly. So today no `anon` grants are needed.

I grepped all ten existing migrations — zero `GRANT` statements. They've been working because of the implicit default. Existing tables stay grandfathered, so migrations 0001–0010 keep working without modification. The risk lives entirely in future migrations.

### What we did

Three small additions, no schema change:

1. **[supabase/migrations/_template.sql](supabase/migrations/_template.sql)** — a canonical starting point. `CREATE TABLE` followed by `grant select, insert, update, delete on public.your_table to service_role`, then `alter table … enable row level security`. The `authenticated` and `anon` grants sit commented-out, ready for the first time a feature genuinely needs a browser-side read.
2. **A line in [CLAUDE.md](CLAUDE.md) conventions** pointing future migrations at the template so neither a future Claude session nor future-you forgets.
3. **This entry.**

We did **not** retrofit grants onto migrations 0001–0010. Existing tables keep their existing grants forever; touching them would be churn without benefit. We also did not switch to a direct Postgres connection to dodge the change — that would tear out `supabase-js`, the auth integration (D-032), and the RLS story (D-017) for a problem that two lines of SQL per future migration solves.

### Why the discipline matters more than this specific change

Strict abstention (D-010), SQL-bounded confidentiality (D-016), RLS-on-by-default (D-017), Zod at every API boundary (D-025), and now explicit grants — these are the same instinct expressed at five different layers. **Every promise the product makes about data behaviour should be enforceable at a layer below the application code.** Application code gets refactored, prompts get rewritten, features get added in a hurry on Friday afternoon. The schema does not. So the schema is where guarantees live.

The Supabase memo is helpful because it forces explicitness on a thing we'd been getting for free. Free is fragile. Explicit is durable.

### The PM lesson

**Read your platform's announcement emails as schema commitments, not as IT news.** When an infrastructure provider tells you they're tightening a default, the right reaction isn't "add to backlog" — it's "where in our migration patterns does this assumption show up, and how do I bake the new default in *now* so the change is a no-op when the deadline arrives?" The cost of doing it today is fifteen minutes. The cost of finding out the day a future migration silently 42501s production is a much worse afternoon.

The wider lesson for an AI PM: **platform memos are leverage**. Most teams treat them as overhead. The teams that read them carefully and update their patterns ahead of the deadline ship calmer launches, accumulate fewer "we'll fix it later" tickets, and have a paper trail of decisions that look prescient in retrospect. This is one of those.

### What would break if we got it wrong

Skip the template + convention: six months from now, in a rush to ship a Phase 6 feature, a new migration creates `public.surveys` without an explicit grant. Tests pass locally because the dev machine still has the old default. The deploy goes out on a Monday. By Tuesday morning every `GET /api/briefs/:id/surveys` is returning a 500 with a `42501` in the logs. The fix is two lines of SQL, but the incident — and the trust hit with whichever researcher was mid-wave on the live demo — is real.

Retrofit grants onto migrations 0001–0010 just to feel tidy: ten more migrations to test, each one a small chance of breaking something downstream (RPC functions, indexes, RLS interactions). Higher cost, zero benefit, since the existing tables are grandfathered.

Switch to a direct Postgres connection to "avoid the whole problem": rip out `@supabase/supabase-js` and `@supabase/ssr`, lose the magic-link auth that D-032 ships on top of them, lose the RLS path that D-017 set up. A nuclear answer to a question that two `GRANT` lines per migration already answers.

---

## How to use this doc going forward

- **Every new decision gets a numbered entry below.** D-038, D-039, etc.
- **When you push back on a decision and we change it, we don't delete the entry — we add a new one with the change and link back.** That's how teams remember why things looked one way and now look another.
- **When you onboard someone (a freelancer, a future co-founder, or yourself in three months), this is what they read first.** The case study tells them what we built; this tells them why.
