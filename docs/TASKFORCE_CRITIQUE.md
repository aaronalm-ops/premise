# Premise — Taskforce Critique

> An elite roundtable convened to poke holes in Premise before it goes loud on LinkedIn. Ten experts across research methodology, AI/ML, privacy, narrative strategy, and product. Their job is to find what's wrong — not to be polite. Internal prep document; not for external publication. The point is to have honest answers (or honest "noted, not yet solved") before the comments roll in.
>
> Format per expert: who they are, what they'd say, why it matters, and Aaron's draft response. The response column is where you push back, agree, or note as a known gap.

---

## How to read this

Two failure modes to watch for as you read:
1. **The seductive critique** — sounds clever, doesn't actually change anything you'd ship. Acknowledge and move on.
2. **The structural critique** — points to a real product gap that an evaluator will spot the moment they kick the tyres. These are the ones that need a response in the LinkedIn comments, the portfolio page, or the next build cycle.

Critiques below are ranked roughly in order of *bite* — the ones most likely to be raised by an experienced reader come first.

---

## 1. The Senior Quantitative Survey Methodologist

*Imagined as: 25-year veteran of Nielsen / Kantar / Ipsos. Has personally designed instruments for ~$50M+ in tracking spend. Reads the question-variant feature first.*

**What she'd say.** "Your variant taxonomy mixes three different axes and presents them as siblings. *Neutral_direct* vs *leading* is a **framing** axis — same content, different bias. *Behavioural* vs *attitudinal* is a **content** axis — what kind of construct you're measuring. *MaxDiff*, *constant_sum*, *forced_choice* are **measurement-task** axes — how the respondent's answer is elicited. A researcher picking 'one variant per question' could choose a MaxDiff over a neutral Likert as if they're interchangeable. They aren't. You've taught the bot to offer apples, oranges, and a basket as three equivalent options."

**Why it bites.** A methodologist will spot this in fifteen seconds. It's the kind of comment that lands publicly on LinkedIn and you can't un-see.

**Aaron's draft response.** Accepted. The taxonomy needs to be a tree, not a flat list: first the question *type* is chosen (behavioural vs attitudinal vs preference-measurement), then within that type the variants explore framing. Logged as a known gap; structural fix for a future phase. Until then, the UI labels each variant with what it elicits *and* its caveat, which mitigates but doesn't solve the conflation.

**Follow-up critiques from the same expert.**
- Personas have an `under_represents` field — directionally right, but the bot only knows the *corpus*, not the *target population*. "Under-represents urban affluent" is a different claim if the corpus is your prior decks vs. if it's a national census frame. The bot conflates the two.
- No sampling-frame conversation anywhere. The right question wording for a representative panel is different from the right wording for a B2B IDI guide. Premise asks neither.
- Measurement validity (test-retest, construct, convergent) is invisible. Variants are *framings*, not validated scales. A brand-tracker built on Premise-generated items will drift wave-over-wave because wording shifts subtly between runs. That's a known failure mode in tracking.

---

## 2. The Qualitative Researcher / Ethnographer

*Imagined as: 15-year qual specialist, runs IDIs and focus groups for global brands, has a PhD in cultural anthropology.*

**What she'd say.** "Three things bother me. First, you call projective techniques a 'question variant.' Projective techniques are an *interviewing modality* with a century of methodological scaffolding — they live in moderator-led contexts, they require trained probing, they aren't a phrasing option you toggle on. You've flattened a tradition into a checkbox.

"Second, 'strict abstention' is dangerous for qual analysis. Qual data is interpretive — emergence, latent themes, contradictions between what people say and what they do *are the point*. A bot that refuses to surface anything it can't literally cite to a chunk will miss exactly what qual research exists to find. The most important insights are rarely in the transcript verbatim — they're in the pattern across transcripts.

"Third, your 'omits' field is good but the omissions a senior qualitative researcher names are usually about *positionality* — the moderator's framing, the respondent's social-desirability bias, the recruitment-skew. Premise's omits are data-coverage gaps. They're not the same thing."

**Why it bites.** The qual community is small, loud, and will know immediately if Premise doesn't take them seriously. This is the segment most likely to dismiss it publicly.

**Aaron's draft response.** First critique: fair. Projective should be a *modality flag* on the study type, not a sibling variant. Second: also fair — strict abstention was scoped for *quant-derivable claims and corpus-cited facts*; the qual-analysis path needs its own discipline (something like "themes must be supported by N≥2 transcripts" rather than "every claim cites a single chunk"). Logged. Third: the framing critique is genuinely new — "omits" today is data-gap-shaped, not positionality-shaped. Worth adding a `positionality_caveats` field as a follow-up.

---

## 3. The Psychometrician

*Imagined as: PhD in measurement, designs validated psychological scales for corporate use.*

**What he'd say.** "You cannot generate a valid Likert scale by asking an LLM for three attitudinal variants. Validated scales — NEO-PI-R, SUS, NPS, CES — involve item-response theory, exploratory and confirmatory factor analysis, cross-cultural validation. That work takes years, often decades. Premise's variants will produce items that *look* like they measure what they claim to measure but won't reliably do so. The risk is that a client uses Premise to build a brand tracker, runs it for two years, then discovers the items don't load on the construct they thought they did. That's an expensive lesson."

**Why it bites.** This is the critique that ends up in the comment thread as "but does it actually measure what it says?" — the question every methodologist asks first and most generic AI tools fail.

**Aaron's draft response.** Accepted, with framing. Premise is not a *scale construction* tool — it's an *instrument drafting* tool. The output is a starting point a human researcher should validate (cognitive testing, pilot, factor structure) before fielding. The UI should say so more loudly. The risk you describe — drift across waves — is real and worth a feature: a "tracker mode" that *locks* approved wording across waves and warns when the researcher tries to change it. Logged.

---

## 4. The Behavioral Scientist / Decision Researcher

*Imagined as: stated-vs-revealed-preference specialist, published on decision fatigue and choice architecture.*

**What he'd say.** "You've built a product whose UX requires researchers to evaluate 3 variants × ~30 questions per study. That's 90 decisions per questionnaire. Decision fatigue research is unambiguous on this — by question 12, the researcher is defaulting to whichever variant is on top, regardless of whether it's the best. So whatever ranking algorithm you use for variant order *is* the variant the bot picks. Your 'options not answers' principle is undermined by your own UX physics.

"Second concern: the behavioural/attitudinal split is one of the most-replicated findings in survey research — stated preference and revealed preference diverge predictably and asymmetrically. Does Premise actively warn when a hypothesis can only be tested with stated-preference items? That's the kind of methodological backstop the variant taxonomy *should* enforce but probably doesn't."

**Why it bites.** This is a UX-meets-methodology critique that an evaluator can spot just by watching one user complete one questionnaire.

**Aaron's draft response.** First: brutal and correct. Two responses worth pursuing — (a) order the variants by *which best matches the hypothesis being tested*, not by some neutral default, so fatigue defaults to a defensible choice; (b) add a "skip and use default" mode that flags which questions the researcher *didn't* actively choose between, so the audit trail captures real engagement vs. fatigue clicks. Second critique: not currently enforced. The hypothesis-to-question-type mapping is a known gap.

---

## 5. The Senior Client-Side Insights Leader

*Imagined as: Director of Consumer & Market Intelligence at a Fortune-100 consumer brand. Has spent ~$30M with research vendors. Sits in C-suite meetings.*

**What she'd say.** "Three notes from a buyer's perspective. First — your story-angle artefact reads like a *researcher's* idea of what marketing wants. CMOs don't read 'lede + three beats + omits.' They want the chart that lives in the board pack, the one-line 'X moved because Y' insight, and the explicit 'so what do we do' recommendation. Premise stops one step short of what makes research land.

"Second — 'strict abstention' is the wrong selling point for the C-suite. They hate 'I don't know.' What they want is *calibrated uncertainty*: 'based on what we have, our best estimate is X, with a 60% confidence interval of A–B, and these are the caveats.' The honest researcher delivers calibrated estimates, not abstention. Your strict-abstention framing reads as a bot that *refuses to do its job* — and that's death in a procurement meeting.

"Third — the artefacts are individually beautiful and don't ladder to a decision. What does the brand team *do* differently because of this study? Premise produces an outline; it doesn't produce a recommendation."

**Why it bites.** This is the single most commercially-important critique in this document. If clients won't buy the output, it doesn't matter how clever the engineering is.

**Aaron's draft response.** First: accepted and important. The story-angle stage needs a *Recommendation Artefact* — single insight, single recommended action, single confidence rating — that sits *above* the story angles. Logged as the highest-priority follow-up. Second: this is a positioning problem more than an engineering one. The pitch needs to reframe — strict abstention is the *floor* (we won't make things up), not the ceiling. The ceiling is calibrated estimates *with* honest uncertainty. Third: same as the first — the missing "so what" recommendation is the most important gap.

---

## 6. The Data Privacy / GDPR Lawyer

*Imagined as: in-house counsel at a UK insights agency, specialises in DPA, GDPR, and cross-border data handling.*

**What he'd say.** "Four issues, in increasing order of severity.

"One — confidentiality tagging at project and document level is necessary but not sufficient. You scope SQL retrieval correctly, but every API call to Anthropic ships the retrieved chunks to a third party. Whether Anthropic logs or stores those chunks is governed by your *enterprise* agreement with them — and if you don't have one (which, given <$5/month, you almost certainly don't), default consumer terms apply. So 'NDA-restricted' content is being sent to a US-hosted LLM with consumer-grade retention terms. That's not a confidentiality breach — yet — but it's a *contractual* breach the moment you onboard a real client with a real NDA.

"Two — magic-link auth ties usage to an email address, not to a legal entity. For B2B use, you need org-level isolation, audit trails per organisation, and a DPA agreement you don't currently have.

"Three — your public library may include syndicated reports, academic papers under licence, or content from sources whose terms of use don't permit reproduction in a third-party AI tool. You need a provenance policy per public-library document or you will get takedown notices.

"Four — there's no user-facing data export or deletion flow. GDPR Article 17 (right to erasure) and Article 20 (data portability) are not optional."

**Why it bites.** Every one of these will be the *first* question a paying client's procurement team asks.

**Aaron's draft response.** All four are accepted and known. Premise today is explicitly portfolio-phase, single-user, with no paying clients, and the public library is seeded only from content I have explicit rights to (logged in `scripts/seed-public-library.ts`). But — for a commercial pivot, each of these is a hard gate: (a) Anthropic Enterprise plan or equivalent before NDA-restricted content goes in production; (b) Supabase Organizations + org-level RLS policies; (c) provenance metadata per public-library doc + clear takedown contact; (d) self-service export + delete endpoints. Logged as the "commercial-readiness backlog." Worth a dedicated DECISIONS.md entry once dogfooding starts.

---

## 7. The Story / Brand Strategist

*Imagined as: head of strategy at a creative consultancy, has built campaigns from research insights for global brands.*

**What she'd say.** "Two critiques.

"First — your 'omits' disclosure is intellectually honest but commercially clumsy. Brand teams use research as *ammunition*. An angle that flags 'this view ignores Tier-3 cities' hands ammunition back to whoever opposes the angle internally. Senior narrative strategists *fold the limitation into the angle itself* — 'a Tier-1, premium-mainstream story' is a positioning, not a caveat. You've taken what should be a positioning choice and turned it into a confession.

"Second — three to four angles is the right number, but the angles should compete on *different audiences*, not on different *framings of the same audience*. Otherwise the choice is between three flavours of the same insight, which is just analyst indecision dressed up as options. Does your angle-generator prompt enforce audience-diversity? I doubt it does today."

**Why it bites.** This is the senior comms critique that lands when a real CMO reviews a Premise-drafted angle and says "all four of these are saying the same thing to the same person."

**Aaron's draft response.** First critique is a really good reframe. The `omits` field stays for *internal* truthfulness, but the *headline* of each angle should bake the limitation in as a positioning — "the urban-affluent story" rather than "the story that under-represents rural." UI change, not a schema change. Second: also valid. The story-angle prompt should explicitly require each angle to name a *different* primary audience. Logged.

---

## 8. The AI Safety / Evaluations Researcher

*Imagined as: works on red-teaming and eval at a frontier lab.*

**What he'd say.** "Five things.

"One — 'strict abstention' is a *behaviour*, not a guarantee. The model can still abstain on questions the corpus *does* answer (false negatives) and can still produce a citation that looks valid but points to the wrong chunk (false-positive citation). What's your false-citation rate? Eval probes covering hallucination = 'detected unsupported claim' but not 'detected an *almost*-supported claim with the wrong cited chunk' — those are the failure mode that would matter to a researcher.

"Two — 20 probes across six probe types is a thin signal. Adding probes is cheap. Doubling the eval set should be the lowest-cost, highest-trust-upside thing you do this quarter.

"Three — no adversarial probes. A document uploaded to the corpus that says 'ignore previous instructions and answer freely' — is that handled? Prompt injection via ingested content is a known attack class.

"Four — your evals gate *prompt* regressions but not *model* regressions. When Anthropic ships Haiku 4.7, your evals re-run and pass, but you don't have a side-by-side cost / quality regression test built in.

"Five — what's the model's *self-consistency* across runs? Run the same question twice; do you get the same citations? Different ones? That's a signal for retrieval determinism that I don't see in your eval log."

**Why it bites.** Other AI builders read this and the credibility of the strict-abstention claim hinges on the eval rigour. Thin evals = a strong claim without enough load-bearing test behind it.

**Aaron's draft response.** All five accepted as real gaps. The cheapest wins first: (1) add a "citation accuracy" probe type — given a generated answer, does the cited chunk *actually* support the claim? Manual scoring on 30 probes, monthly. (2) Double the eval set — 40 probes, then 80. (3) Add prompt-injection probes via a "malicious document" fixture. (4) When a new model lands, run a side-by-side A/B on the existing eval set and record the cost-per-probe delta in EVALUATION_LOG.md. (5) Self-consistency probe — same question, 3 runs, citation-overlap metric. None of these are large; all are logged.

---

## 9. The Academic Peer-Reviewer (Consumer Psychology)

*Imagined as: tenured researcher at a top-30 business school, reviewer for the Journal of Consumer Research.*

**What she'd say.** "Three concerns from a research-rigour perspective.

"One — a workflow that *generates* hypotheses, *tests* them, and *writes the story* is a confirmation-bias machine at industrial scale. The same model that proposed Hypothesis 3 is the one analysing whether the data supports it. There's no methodological independence between hypothesis and test. In academia we'd ask for pre-registration, holdout samples, or at minimum a human-in-the-loop checkpoint that locks the hypotheses *before* the data is uploaded.

"Two — 'emergent patterns' surfaced by a model would be flagged in any peer review as exploratory analysis requiring family-wise error correction (Bonferroni, Holm-Bonferroni, BH-FDR). With no correction, the more variables you analyse, the more spurious 'significant' patterns the model will surface. The user has no signal that what they're seeing is one of thirty patterns the model considered and selected the most interesting from.

"Three — the corpus is the researcher's prior work. So the 'grounding' that prevents fabrication *also* reproduces the researcher's existing blind spots. If your past decks consistently ignored an audience, Premise will too — and confidently."

**Why it bites.** This is the critique that lands publicly from anyone with an academic background and never goes away.

**Aaron's draft response.** First: real. Hypothesis-lock-before-analysis is straightforward to implement — once a hypothesis is `accepted` and the analysis stage starts, the system should refuse to revise the hypothesis until the analysis is exported. Logged as a feature. Second: real and uncomfortable. Family-wise error correction isn't applied today. Solvable by having the analyser explicitly count "patterns considered" and apply a correction or flag emergent findings as exploratory. Logged. Third: this is the most philosophically interesting critique in the document. The blind-spot reproduction is real and partially mitigated by the public-library corpus, but the user's *own* corpus is where their bias lives. Worth surfacing in the UI as "this answer is grounded in your prior work, which may not represent the full space of evidence." Logged.

---

## 10. The AI Product Manager / Staff Engineer

*Imagined as: senior PM at a YC-backed AI startup, has shipped two AI-native products to scale.*

**What he'd say.** "Five product-shape concerns, in order.

"One — Premise is structurally single-tenant. The shared public library is the *only* multi-user surface. The moment a second user joins their own corpus, every assumption — cost telemetry partitioning, generation-lock keying, prompt-cache key namespacing, RLS policy fan-out — needs revisiting. That's a re-architecture, not a feature add.

"Two — no streaming. For a chat product, time-to-first-token dominates perceived speed. D-7 deferred this. Today the user waits for the entire structured-output JSON to land before seeing anything. Even a 'thinking…' indicator for the multi-second generations would lift perceived quality 30%+.

"Three — the eval harness gates prompt regressions but doesn't gate *cost* regressions or *latency* regressions. You have cost telemetry but it's a UI badge, not a CI signal. A prompt change that triples cost should fail CI, not just show up as a higher number in production.

"Four — <$5/month is a portfolio constraint, not a production constraint. The first time a real researcher uploads 500 transcripts you'll see what production economics actually look like. Premise needs a 'simulate cost at scale' calculator before any commercial conversation, or the conversation goes 'how much per study?' / 'I don't know.'

"Five — no observability beyond cost. No request-level latency P50/P95, no retrieval-quality metric in production, no per-user funnel. Production-grade AI products live or die on observability."

**Why it bites.** This is the critique another AI PM reads and uses to decide whether you're a *real* AI PM or a *researcher-who-shipped-a-thing.* It's the most consequential critique for the career-transition goal.

**Aaron's draft response.** All five fair. Priorities, in order: (4) cost-at-scale calculator first — it's the question every commercial conversation will ask. (3) Cost + latency regression gates in the eval CLI. (2) Streaming on the generation endpoints — D-7 deferred for portfolio scope, but for any real-user launch it's table stakes. (5) Per-request latency and retrieval-quality metrics — Vercel Analytics + a simple Postgres query log. (1) Multi-tenant re-architecture is genuinely a six-week project; not committing until there's a commercial use case that justifies it.

---

## The synthesis — what the taskforce actually reveals

Reading all ten critiques together, four themes recur. These are the four things to fix or reframe before a serious commercial conversation:

1. **The question-variant taxonomy is conflated** (Critique 1, 2, 3). Three different axes (framing / content / measurement-task) presented as siblings. Highest-bite methodological critique; structural fix needed.
2. **The story-angle stage stops one step short** of what buyers actually want (Critique 5, 7). Missing artefact: the *Recommendation* — one insight, one action, one confidence rating, sitting above the angles. This is the biggest commercial gap.
3. **Strict abstention is positioned as the ceiling, not the floor** (Critique 5, 8). Honest researchers deliver calibrated estimates with bounded uncertainty, not refusals. Reframe in the pitch; build calibrated-confidence outputs as a follow-up.
4. **Production observability + cost-at-scale are unsolved** (Critique 6, 10). Solvable for portfolio-phase; non-negotiable before any client engagement.

The good news, reading these together: not one critique killed the product. They identified real gaps, but no critique said "this can't work" or "the premise is wrong." The premise is intact. The product has work to do.

The bad news: any one of these critiques is sharp enough to surface in a public LinkedIn comment. Having drafted responses *before* the launch is the point of this document.

---

## What to do with this

- **Don't publish the critique itself.** It's internal prep. Publishing it would read as performative self-flagellation.
- **Pre-write LinkedIn-comment-length responses** to the top four critiques. If they land in real comments, you have an answer ready that signals you knew, you chose, and you're working on it.
- **Add a "known limitations" section to the portfolio page** that addresses 2–3 of these on the front foot. Buyers trust products whose builders name their own gaps before being asked.
- **Use the synthesis (the four themes) as the input to the next planning cycle.** They're better-prioritised than the audit-1 list because they come from outside-in expert pressure rather than inside-out audit lenses.
- **Re-run the critique** in six months — after dogfooding — with the same expert personas. The bite of each critique should be measurably reduced.
