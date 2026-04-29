# Roadmap

A phased plan. Each phase has a hard exit criterion — a *thing the bot can do reliably*, not a list of files written.

The order is deliberately **RAG-first**. The hardest, highest-value capability ships before the cosmetic flow features. Once retrieval-with-citations works, every later step (hypothesis, questionnaire, analysis, story) becomes meaningfully better and reuses the same plumbing.

---

## Phase 0 — Foundations (week 1)

**Exit criterion:** I can `npm run dev`, sign in, create a project, and see an empty canvas.

- [ ] Scaffold Next.js 15 + TS + Tailwind + shadcn
- [ ] Supabase project, schema migration (projects, documents, chunks, embeddings, conversations, messages, artefacts)
- [ ] Auth (Supabase Auth, email magic link is fine)
- [ ] Anthropic + Voyage SDK clients with env-var wiring
- [ ] Canvas shell: chat thread on left, artefacts pane on right, project switcher in header
- [ ] Multi-project model: every conversation is bound to a project; switching projects swaps the canvas

**Teaching milestone:** *Aaron understands the stack, knows where the prompts live, knows where to add a new artefact type.*

---

## Phase 1 — Strict-mode RAG (weeks 2–3)

**Exit criterion:** I can drop ~50 documents into a project, ask the bot a question, and get an answer with citations or an honest abstention. The eval harness passes.

- [ ] Document ingestion: PDF, DOCX, PPTX, plaintext, transcript formats
- [ ] Chunking strategy (semantic-aware, not fixed-size; paragraph + heading boundaries)
- [ ] Voyage embedding pipeline, stored in pgvector
- [ ] Retrieval: top-k semantic search → Haiku reranker → top-5 chunks
- [ ] Strict-mode generation: structured-output draft → claim verification → citation enforcement
- [ ] UI: chat answers render claims with inline citation chips that hover-preview the source chunk
- [ ] Confidentiality tagging at project + document level
- [ ] **Eval harness v1**: golden Q&A set (~30), hallucination probes (~10), abstention probes (~10), CLI runner
- [ ] Prompt caching wired up on all repeated calls

**Teaching milestone:** *Aaron understands what an embedding is, what reranking does, why structured outputs prevent hallucination better than prompts alone, what an eval harness looks like.*

---

## Phase 2 — Hypothesis generation (week 4)

**Exit criterion:** I paste a brief, the bot returns 5–7 ranked hypotheses with assumptions, expected effect direction, and confirmation criteria. Each hypothesis cites prior research from the corpus that supports or contradicts it.

- [ ] "Brief intake" canvas artefact (markdown editor)
- [ ] Hypothesis generator prompt (Sonnet, RAG-augmented)
- [ ] Hypothesis artefact: ranked list, accept/edit/reject affordance per hypothesis
- [ ] "Why this hypothesis" expander showing supporting/contradicting prior research with citations
- [ ] Persistence: agreed hypotheses become inputs to subsequent stages

**Teaching milestone:** *Aaron understands how to chain LLM calls cleanly with stage-to-stage state passing in a server-action world.*

---

## Phase 3 — Questionnaire & personas (weeks 5–6)

**Exit criterion:** The bot generates a draft questionnaire with 3–4 phrasing variants per question and a ranked persona list. Each variant is labelled by what it measures differently. I can pick variants and assemble the final questionnaire.

- [ ] Persona recommender (Sonnet, hypothesis-aware)
- [ ] Question generator with **variant taxonomy**: neutral / leading / projective / behavioural / attitudinal — each labelled with what it elicits
- [ ] Skip logic and routing suggestions
- [ ] Question-bank artefact: drag-to-reorder, pick-a-variant, add-your-own
- [ ] Export to common survey formats (Qualtrics QSF, Google Forms CSV, plain text for SurveyMonkey paste)

**Teaching milestone:** *Aaron has shipped his first real "options not answers" interaction pattern and can articulate why it beats single-answer UX for expert users.*

---

## Phase 4 — Analysis (weeks 7–9)

**Exit criterion:** I upload a survey export (CSV) and a folder of transcripts. The bot returns: (a) hypothesis-by-hypothesis verdicts with the relevant cuts; (b) emergent patterns the data is shouting about; (c) qual themes coded across transcripts.

- [ ] Quant ingestion: CSV/XLSX upload, schema inference, variable typing
- [ ] Quant analysis: Sonnet generates the analysis plan (cuts to run); a small Python tool-call runs the actual stats (frequencies, cross-tabs, sig tests via `scipy`); Sonnet writes up findings with citations to the data
- [ ] Qual ingestion: transcript upload, speaker turn parsing
- [ ] Qual coding: Haiku extracts themes per transcript, Sonnet synthesises across transcripts
- [ ] Hypothesis-verdict artefact: each agreed hypothesis gets confirmed/refuted/inconclusive with the supporting cut
- [ ] "Things you didn't ask but the data is shouting" artefact

**Teaching milestone:** *Aaron understands the LLM-as-orchestrator pattern: model decides what to do, deterministic code does it, model writes it up.*

---

## Phase 5 — Story angles (week 10)

**Exit criterion:** Given the analysis and the original objective, the bot produces 3–4 narrative angles. Each angle has a named target audience, a one-line headline, the lede, and the three supporting beats. I pick the angle and the bot drafts a thought-leadership outline.

- [ ] Audience identification step (who is this story *for* — CMOs? Brand managers? Industry press?)
- [ ] Story-angle generator with explicit "what this angle *omits*" disclosure
- [ ] Outline-to-draft step (markdown export)

**Teaching milestone:** *Aaron has a portfolio-grade artefact end-to-end: brief in, story out.*

---

## Phase 6 — Polish, evals, dogfooding (weeks 11–12)

**Exit criterion:** I have run **one real client project** end-to-end through the bot and saved 10+ hours vs. my baseline workflow. The case study chapter for "what I learned dogfooding" is written.

- [ ] Run the bot on a real (or anonymised) project
- [ ] Time-tracking comparison: baseline vs. bot-assisted
- [ ] Eval harness expanded with regressions found during dogfooding
- [ ] CASE_STUDY.md updated with the dogfood chapter
- [ ] Demo video / screen recording for portfolio

**Teaching milestone:** *Aaron has a portfolio piece showing real product judgment, not just code.*

---

## Out of scope for v1 (intentionally)

These are good ideas. They're not in the first 12 weeks.

- Multi-tenant SaaS (auth, billing, orgs) — needed only when commercial
- Real-time collaboration on artefacts — single-user is fine for v1
- Native survey fielding (we export to existing tools instead)
- Mobile app
- Voice / transcription ingestion (we accept text transcripts only at v1)
- Custom fine-tuned models (prompting + RAG carries us through commercial v1)
- Agentic / autonomous research mode — *deliberately* the opposite of the product principle

## Risk register

| Risk | Mitigation |
|---|---|
| Hallucination slips through despite strict mode | Eval harness gates every PR; abstention probes catch regressions early |
| Costs spiral past $5/mo | Daily cost telemetry; alert at $0.50/day; switch any persistent over-spender to Haiku |
| Aaron loses the thread on the code as it grows | Every phase ends with a CASE_STUDY.md update explaining what changed and why; vibe-coder readability is a hard requirement |
| Vector DB performance degrades past 1000s of docs | pgvector with HNSW indexing handles 10K+ chunks comfortably; revisit if/when corpus crosses 100K |
| Confidentiality leakage across projects | Hard-enforced at the SQL layer (project_id filter on every retrieval query); covered by an eval test |
