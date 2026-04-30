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

## How to use this doc going forward

- **Every new decision gets a numbered entry below.** D-031, D-032, etc.
- **When you push back on a decision and we change it, we don't delete the entry — we add a new one with the change and link back.** That's how teams remember why things looked one way and now look another.
- **When you onboard someone (a freelancer, a future co-founder, or yourself in three months), this is what they read first.** The case study tells them what we built; this tells them why.
