# Evaluation Log

A running record of audits and reviews on Premise. Every audit dated; every gap tracked; every fix linked back here.

The point of this doc isn't to be exhaustive — it's to surface the load-bearing gaps in each audit so they can be addressed before they compound. Senior PMs and senior engineers do this on every product they ship; it's the "cheapest way to keep the product honest" lever.

Audit format:
- 5 expert lenses (Researcher, LLM builder, Developer, UI/UX, AI PM)
- For each lens: what's strong, what's weak (with severity)
- Top-N gaps to address next, prioritised
- Status tracking on previous audits' gaps

---

## Audit #1 — 2026-04-30 (post-Phase-3 ship)

Conducted after shipping Phase 3 (personas + questionnaires with variants). Premise has 12 routes, 19 decision-log entries, and an end-to-end demo capable of brief → hypotheses → personas → questions-with-variants. The build is functional; this audit asks "what's actually wrong."

### Researcher lens (Market/Consumer Insights)

**Strong:**
- "Options not answers" principle implemented in three places (hypothesis count 5-7, persona count 3-5, question variant count 3) and ships in UI.
- Strict abstention demonstrably works (verified Phase 1 with the Japan GDP test).
- Variant taxonomy is more methodologically literate than most AI-for-research products.

**Weak (load-bearing):**

| # | Gap | Severity | Notes |
|---|---|---|---|
| R-1 | Hypothesis specificity unverified | High | Schema enforces grounding, not specificity. Vague hypotheses pass. No eval distinguishes them. |
| R-2 | Persona `under_represents` quality unverified | High | The most-touted field. No actual generated outputs audited yet. Could be generic filler. |
| R-3 | Variant pairings can be methodologically weak | Medium | Bot picks 3 of 8 types per question. Nothing constrains pairings to maximise contrast. |
| R-4 | No survey export | High | Researchers can't actually field a questionnaire. Product value chain ends at "selected variant". |
| R-5 | No skip logic, ordering, demographic block, screener | Medium | Treats questions as flat list. Real questionnaires have structural blocks. |
| R-6 | No sample size / quota guidance | Medium | Personas tell *who* to recruit; nothing says *how many*. |

### LLM builder lens

**Strong:**
- Three-layer abstention works (schema → verifier → UI gate).
- Haiku-default routing actually used.
- Direct SDK calls = full prompt control (no LangChain abstraction).

**Weak (load-bearing):**

| # | Gap | Severity | Notes |
|---|---|---|---|
| L-1 | Prompt caching not implemented | **Critical** | D-003 is aspirational. Actual cost is ~9× docs claim. Most embarrassing docs-vs-reality gap. |
| L-2 | No eval harness | **Critical** | Every prompt edit could silently degrade. Highest-risk gap for a strict-abstention product. |
| L-3 | No retry logic for transient API failures | Medium | Voyage rate-limit or Anthropic 529 kills user flow. |
| L-4 | Reranker parses free text, not tool_use | Medium | Brittle parser; silent fallback to top-k. |
| L-5 | Verifier runs N calls instead of 1 batch | Medium | ~5× cost reduction available on verification step. |
| L-6 | No idempotency on generation endpoints | Medium | Double-click → race condition on `replaceProposed*`. |
| L-7 | No cost telemetry | High | "<$5/mo" claim is unverified. |
| L-8 | No prompt versioning | Low | Can't diff outputs against prior prompt versions when tuning. |

### Developer lens

**Strong:**
- Strict TypeScript end-to-end.
- Schema-first design (DB is source of truth).
- Build green and fast.

**Weak:**

| # | Gap | Severity | Notes |
|---|---|---|---|
| D-1 | Zero tests | **Critical** | No unit, integration, or e2e. Build green proves nothing works. |
| D-2 | Confidentiality (D-016) untested | **Critical** | Strongest trust commitment; nothing verifies it. |
| D-3 | No transactions on multi-step DB writes | High | `replaceProposed*` is delete-then-insert. Insert failure leaves user with zero proposed and no rollback. |
| D-4 | Error messages leak schema info | High | 500 returns `relation "x" does not exist` to client. Production-unsafe. |
| D-5 | Tool_use input cast unvalidated | Medium | `as` cast at boundary; crashes at use-site if model returns malformed JSON. |
| D-6 | No request validation library | Medium | Hand-rolled `typeof` checks. Brittle. |
| D-7 | No streaming responses | Medium | "Generate" blocks 8-15s with static spinner. Streaming would feel much faster. |
| D-8 | No optimistic UI updates | Low | Accept/reject waits for round-trip. |

### UI/UX lens

**Strong:**
- Two-pane canvas is the right shape for this workflow.
- Variant grid + select-on-click is the right interaction.
- Citation chips with hover preview (chat pane).

**Weak:**

| # | Gap | Severity | Notes |
|---|---|---|---|
| U-1 | Chat history doesn't persist | High | Reload = lose conversation. Acknowledged, unfixed. |
| U-2 | No "next action" guidance | High | New user with saved brief sees 4 buttons with no flow signal. |
| U-3 | No survey export / copy-to-clipboard / markdown | High | Value chain ends at "selected variant" with no path forward. |
| U-4 | No edit affordance | High | Only accept/reject. Senior researchers want to tweak. |
| U-5 | Loading states don't show pipeline stage | Medium | 15s of "thinking…" with no progress detail. |
| U-6 | No project creation from UI | High | CLI-only. First-time-user-hostile. |
| U-7 | No delete anywhere | Medium | Mistakes accumulate. |
| U-8 | No confirmation on destructive regenerate | Medium | Silently deletes proposed work. |
| U-9 | Same amber color = two different signals | Low | Abstention (chat) vs under_represents (persona). Confusing. |
| U-10 | Mobile/tablet broken | Low | Below ~768px the canvas collapses. Defer until commercial. |

### AI PM lens

**Strong:**
- Real decision log (D-001 through D-019).
- Case study captures the journey.
- Phase sequencing disciplined (RAG-first, primitives reused).

**Weak (load-bearing):**

| # | Gap | Severity | Notes |
|---|---|---|---|
| P-1 | No success metrics defined | High | What does "Premise works" mean? Pick something and measure. |
| P-2 | No user feedback loop | High | Reject captures no "why". Lost signal. |
| P-3 | No telemetry | High | Don't know regenerate frequency, variant selection patterns, average corpus size. |
| P-4 | `selected_variant_id` has no downstream consumer | High | Hidden product gap that becomes obvious in Phase 4. |
| P-5 | No in-product explanation of variant taxonomy | Medium | Labels visible, methodology unexplained. |
| P-6 | Hardcoded option counts | Medium | 5-7, 3-5, 4-8×3. No researcher control. |
| P-7 | No version history on briefs | Medium | Edit + regenerate = lost prior brief. |
| P-8 | No A/B test infrastructure | Low | Tuning prompts blind. |

---

## Top-5 gaps to address next, in order

1. **Implement prompt caching** (L-1) — ~1 day. Closes the largest docs-vs-reality gap. Most embarrassing thing not to fix.
2. **Build the eval harness** (L-2) — ~2 days. Six probe types totalling ~75 cases. CLI runner. Every prompt change runs against it. Also addresses D-2 (confidentiality test) as one of the probe types.
3. **Survey export — at minimum markdown** (R-4 / U-3) — ~½ day. Without it the product's value chain breaks at "selected variant".
4. **Cost telemetry** (L-7 / P-3) — ~½ day. Per-call token counting → per-project rollup → visible in UI.
5. **Edit affordance for hypotheses + questions** (U-4) — ~½ day. Accept-or-reject is too binary for expert users.

Total: ~4-5 days of work to graduate Premise from "demo that ships" to "demo that's audit-defensible and operable".

---

## Recurring evaluation rhythm

- **Per-feature ship** (every phase): 30-min self-audit using these five lenses. Append a new audit section here.
- **Weekly while building**: 60-min review of eval-harness scores. Trend lines for abstention rate, hypothesis quality, persona quality, citation precision.
- **Pre-commercial**: full external review (5-7 senior researchers + 2-3 AI engineers giving structured feedback). 4-6 weeks before any paid client.

---

## Status tracking

Each gap above gets a status: `open` / `in-progress` / `resolved` / `wont-fix`. As we address an item, update its status here and link the commit/PR.

| ID | Status | Resolved by |
|---|---|---|
| R-1 — Hypothesis specificity unverified | open | (eval harness) |
| R-2 — Persona under_represents quality unverified | open | (eval harness) |
| R-3 — Variant pairings methodologically weak | open | |
| R-4 — No survey export | resolved | D-022 (Tier 1 — markdown/Qualtrics/plaintext) |
| R-5 — No skip logic / ordering / demographic / screener | open | |
| R-6 — No sample size guidance | open | |
| L-1 — Prompt caching not implemented | resolved | D-021 (Tier 1 — cache_control on every gen call) |
| L-2 — No eval harness | resolved | D-020 (Phase 3.5) |
| L-3 — No retry logic | resolved | D-027 (Tier 2 — withRetry on Anthropic + Voyage) |
| L-4 — Reranker parses free text | open | |
| L-5 — Verifier N calls vs 1 batch | open | |
| L-6 — No idempotency on generation | resolved | D-028 (Tier 2 — generation_locks + withGenerationLock) |
| L-7 — No cost telemetry | resolved | D-023 (Tier 1 — api_calls + cost badge) |
| L-8 — No prompt versioning | open | |
| D-1 — Zero tests | partial | Eval harness covers behaviour regressions; no unit tests yet |
| D-2 — Confidentiality untested | resolved | D-020 (confidentiality probes in eval harness) |
| D-3 — No transactions | resolved | D-026 (Tier 2 — atomic replace_proposed_* RPC functions) |
| D-4 — Error messages leak | resolved | D-025 (Tier 2 — safeError) |
| D-5 — Tool_use cast unvalidated | partial | Schema-level filtering still in place; full Zod-on-output deferred |
| D-6 — No request validation library | resolved | D-025 (Tier 2 — Zod schemas on every route) |
| D-7 — No streaming | open | |
| D-8 — No optimistic UI | open | |
| U-1 — Chat history doesn't persist | open | |
| U-2 — No next-action guidance | open | |
| U-3 — No survey export / copy-to-clipboard | resolved | D-022 (Tier 1) |
| U-4 — No edit affordance | resolved | D-024 (Tier 1 — hypothesis + variant inline edit) |
| U-5 — Loading states no pipeline stage | open | |
| U-6 — No project creation from UI | resolved | D-029 (Tier 2 — + New button + modal) |
| U-7 — No delete anywhere | open | |
| U-8 — No confirmation on destructive regenerate | open | |
| U-9 — Same color, different signals | open | |
| U-10 — Mobile/tablet broken | wont-fix-yet | Commercial phase |
| P-1 — No success metrics | open | |
| P-2 — No user feedback loop | open | |
| P-3 — No telemetry | resolved | D-023 (Tier 1 — initial telemetry; behavioural telemetry still open) |
| P-4 — selected_variant_id has no consumer | resolved | Phase 4 analysis (D-034) consumes selected_variant_id as the canonical question wording |
| P-5 — No in-product taxonomy explanation | open | |
| P-6 — Hardcoded option counts | open | |
| P-7 — No version history on briefs | open | |
| P-8 — No A/B test infra | open | |

---

## Build queue — taskforce prioritisation (2026-04-30, post-eval-harness)

Single ordered list of every recommendation from Audit #1, in execution order. Items 1-4 are next-up; everything below 20 is "after a real demo runs real client work." Items previously addressed by the eval harness (L-2, partial D-1, D-2, R-1, R-2) are not repeated below.

### Tier 1 — Ship-blockers (~2.5 days)

Closes the docs-vs-reality and value-chain gaps. Premise should not flip public without these.

1. **Prompt caching across all generation calls** (Critical, 1d, L-1) — real cost is ~9× claimed; this is the largest credibility gap.
2. **Survey export** (Critical, ½d, R-4 / U-3) — markdown + Qualtrics-pasteable; without it the product's value chain ends at "selected variant".
3. **Cost telemetry** (High, ½d, L-7 / P-3) — per-call token accounting → per-project rollup → in-UI display. Pair with #1 to show savings empirically.
4. **Edit affordance for hypotheses + questions** (High, ½d, U-4) — accept/reject is too binary for expert users.

### Tier 2 — Engineering hygiene (~3 days)

Protects against silent production failures.

5. Project creation from the UI (High, ½d, U-6).
6. Retry logic for Voyage / Anthropic transient errors (High, ½d, L-3).
7. DB transactions on multi-step writes (High, ½d, D-3).
8. Idempotency on generation endpoints (Medium, ½d, L-6).
9. Error message safety in 500 responses (High, ½d, D-4).
10. Request validation with Zod at API boundaries (Medium, ½d, D-6).

### Tier 3 — UX completeness (~3 days)

Closes the gaps an expert user will hit on first real run.

11. Chat persistence — `ask_log` table + scrollback (High, ½d, U-1).
12. Loading state with pipeline stages (Medium, ¼d, U-5).
13. Confirmation on destructive regenerate (Medium, ¼d, U-8).
14. Bulk operations (accept-all / reject-all-priority-N) (Medium, ½d).
15. Next-action guidance in artefacts pane (Medium, ½d, U-2).
16. Delete affordance for projects/briefs/hypotheses/personas/questions (Medium, ½d, U-7).
17. In-product variant taxonomy explanation (Medium, ½d, P-5).
18. Same-color-different-signal disambiguation (Low, ¼d, U-9).

### Tier 4 — AI PM rigor (~4.5 days)

Turns the product from "works" to "tunable."

19. User feedback loop — capture "why rejected" (High, 1d, P-2).
20. Cost regression in the eval harness (Medium, ½d, extends L-7).
21. Subjective quality eval probes (Sonnet-as-judge for hypothesis specificity, persona under_represents quality) (High, 1d, R-1 / R-2).
22. Success metrics defined (High, ¼d, P-1).
23. Telemetry beyond cost (Medium, ½d, P-3).
24. Prompt versioning (Medium, ½d, L-8).
25. Optimistic UI updates (Low, ½d, D-8).

### Tier 5 — Methodological depth (~4.5 days)

Questionnaire-design power-user features.

26. Variant pairing diversity rules (Medium, ½d, R-3).
27. Question ordering / demographic block / screener block (High, 1-2d, R-5).
28. Sample size / quota guidance per persona (Medium, ½d, R-6).
29. Researcher-controlled option counts (Medium, ½d, P-6).
30. Edit hypothesis/persona content beyond status (Medium, ½d, extends U-4).
31. Streaming responses for long generation calls (Low, 1d, D-7).

### Deferred (not in queue, with rationale)

| Item | Why deferred |
|---|---|
| Mobile / tablet (U-10) | Commercial phase — after public flip + first paid users |
| A/B test infrastructure (P-8) | Premature for portfolio — post-commercial |
| Phase 4 (Analysis: quant + qual ingestion + verdicts) | Explicit phase work, separately roadmapped |
| Phase 5 (Story angles) | Explicit phase work |
| `selected_variant_id` downstream consumer (P-4) | Resolves automatically once Phase 4 reads it |
| Multi-tenant auth | Commercial phase |
| Real-time collaboration | Post-commercial |
| Brief version history (P-7) | Defer until a researcher actually loses brief work |
| Tool_use cast unvalidated (D-5) | Mitigated by post-validation in code; full Zod validation comes with #10 |

### Recommended next move

**Tier 1 + Tier 2 (~5.5 days of focused work) before flipping the repo public.** That makes Premise audit-defensible, operable, and cost-honest. After that, the choice is Tier 3 (UX polish) vs Phase 4 (analysis) vs flipping public for external feedback.

### Cumulative time estimate

| Tier | Theme | Cumulative time |
|---|---|---|
| Tier 1 | Ship-blockers | 2.5 days |
| Tier 2 | Engineering hygiene | 5.5 days |
| Tier 3 | UX completeness | 8.5 days |
| Tier 4 | AI PM rigor | 13 days |
| Tier 5 | Methodological depth | 17.5 days |

---

## Audit #2 — taskforce critique round (2026-05-14)

Conducted *after* shipping all five user-flow phases. Distinct in shape from Audit #1: instead of five internal lenses (Researcher / LLM-builder / Developer / UI-UX / AI-PM), we convened a ten-expert imagined roundtable across research methodology, AI/ML, privacy, narrative strategy, and product (see `docs/TASKFORCE_CRITIQUE.md`). The conclusions surfaced 31 distinct critiques; 10 were prioritised; all 10 were implemented across 5 execution waves between 2026-05-14 and 2026-05-14.

### Probe-harness additions in this round

| New probe type | Count | What it catches | Decision |
|---|---|---|---|
| `citation-accuracy` | 5 | Verifier drift / false-positives (Sonnet judge cross-checks the Haiku verifier) | D-042 |

The five fixtures reuse the existing golden-qa corpus questions; the *expectation* shape differs — instead of testing whether the answer contains substring X, we test whether the cited chunks DIRECTLY support every claim in the answer (independent Sonnet judge, stricter prompt). This is the probe the imagined AI-safety researcher (taskforce critique 8a) asked for: *"What's your false-citation rate?"*. Baseline expectation per fixture: `min_support_rate: 1.0` (every claim must be supported).

### Probe-set total

| Probe type | Count |
|---|---|
| golden-qa | 5 |
| abstention | (existing) |
| hallucination | (existing) |
| hypothesis-quality | (existing) |
| persona-quality | (existing) |
| confidentiality | (existing) |
| **citation-accuracy** | **5 (new)** |

### Known eval gaps after Audit #2 (deliberately deferred)

| # | Gap | Why deferred |
|---|---|---|
| E-1 | No story-angle quality probe | Subjective quality; needs human-scored baseline before automating |
| E-2 | No recommendation-quality probe | Same as E-1; recommendation artefact just shipped (D-039) — needs real-corpus data before judging at scale |
| E-3 | No variant-recommendation accuracy probe | D-040 just shipped; selection_mode audit trail will provide the signal organically as the product is used |
| E-4 | No adversarial / prompt-injection probes | Taskforce 8c flagged. Worth a dedicated probe type when the product enters a real user environment |
| E-5 | No model-regression A/B (Haiku 4.6 vs 4.7) | Anthropic doesn't ship that often; do it once per new model, not as a permanent CI gate (taskforce 8d) |

These are flagged here so the next eval audit can decide whether to address them.

---

## Deferred-items close-out (2026-05-15) — D-046

Six of the deferred items above were closed in a single push driven by the audit-honesty re-read in D-046. The remaining deferrals (D-7 streaming, R-5 skip logic, E-5 model-regression) hold their original rationale.

### Probe-set total after D-046

| Probe type | Count | Notes |
|---|---|---|
| golden-qa | 5 | unchanged |
| abstention | (existing) | unchanged |
| hallucination | (existing) | unchanged |
| hypothesis-quality | 2 | structural (the floor) |
| persona-quality | 2 | structural (the floor) |
| confidentiality | (existing) | unchanged |
| citation-accuracy | 5 | D-042 |
| **hypothesis-judge** | **2 (new)** | R-1 close; Sonnet rubric (specificity / falsifiability / evidence_tightness / novelty / distinctness_across_set) |
| **persona-judge** | **1 (new)** | R-2 close; rubric (behavioural_specificity / distinctness / under_represents_quality / grounded_to_corpus) |
| **recommendation-judge** | **1 (new)** | E-2 close; rubric (causal_insight_clarity / action_specificity / calibration_honesty / caveat_completeness). Uses `synth.ts` to cast frozen upstream context into typed inputs. |
| **story-angle-judge** | **1 (new)** | E-1 close; rubric (audience_distinctness_across_set / lede_sharpness / evidence_chain_coherence / omits_honesty) |
| **variant-judge** | **1 (new)** | E-3 close; independent Sonnet picks the fatigue-default per question; measures agreement rate vs `is_recommended` |
| **prompt-injection** | **3 (new)** | E-4 close; adversarial inputs (ignore-prior / fake chunk ID / system-prompt leak); must abstain or refuse |

### Baseline expectation per new probe type

- All four quality-judge types use `min_score: 3` and `min_average_score: 3.5` on a 1-5 rubric. That sets the regression bar where it should be — a generic, vague output scores ≤3; a specific, evidence-grounded output scores ≥4. The pass/fail boundary is "not embarrassing."
- `variant-judge` uses `min_agreement_rate: 0.5` for the first baseline run. Methodology choice (neutral_direct vs behavioural vs forced_choice) is taste-driven enough that 100% agreement isn't the goal; we want to detect drift, not enforce one judge's taste.
- `prompt-injection` is binary: claims must abstain OR cite only real chunks AND avoid forbidden substrings.

### Deferred items remaining (rationale honoured)

| # | Item | Reason still holds |
|---|---|---|
| D-7 | Streaming responses | Architectural shift; touches every generation. Loading-stage hints (D-035) close the perceived-latency gap at much lower cost. |
| R-5 | Skip logic / question ordering / screener | Whole product area (real questionnaire builder), not a closable audit item. |
| E-5 | Model-regression A/B (Haiku 4.6 vs 4.7) | One-shot pattern per new model release; not a permanent CI gate. |


---

## Dogfood audit — ASEAN travel synthetic survey (2026-05-18)

### Setup

Aaron submitted the brief *"I want to test if Gen Z are more avid travellers compared to Millennials"* — region-neutral, time-neutral. Premise generated hypotheses, the researcher tweaked the questionnaire, then generated a 10,000-row simulated survey CSV (`Simulated_ASEAN_Travel_Research_10k.csv`, ~1.5 MB) that mirrored the proposed instrument. The CSV was uploaded as an analysis source and the pipeline was run end-to-end (hypotheses → personas → questions → analysis → recommendations → story angles).

### Findings (pre-fix)

Three classes of failure surfaced. All three drove D-049 through D-053 in the same session.

#### Class 1 — Scope leakage from corpus into artefact (D-049)

The brief specified no region. Premise generated hypotheses with "in ASEAN" baked into the statement, inherited from a corpus that happened to skew regional (recent dogfood seed + public-library composition). The researcher accepted one without noticing; the questionnaire propagated it. Three accept-gates and no signal.

#### Class 2 — Inter-field contradictions in analysis + recommendation (D-050)

- **H10** got verdict `confirmed` for a hypothesis claiming *"Gen Z travellers outspend Gen Y."* The prose said *"Millennial travellers report higher overseas trip spend than Gen Z travellers... consistent with the hypothesis."* The three components — hypothesis direction, evidence direction, verdict label — contradicted each other in a single artefact.
- **H8** wrote *"Raw incidence data leans slightly toward Gen Z having a higher overseas travel rate"* and three sentences later *"43% of Gen Z respondents... vs. roughly 48% of Millennials — a direction that actually favours Millennials slightly."* 43 < 48; the prose directionality was internally inconsistent.
- A recommendation told CMOs to shift acquisition budgets to age-cohort targeting. Its own caveats noted that high share among low-spend Gen Z may translate to lower absolute merchant revenue. Action and caveats did not reconcile.

#### Class 3 — Action-class mismatch on recommendation (D-051)

A recommendation told BNPL providers to introduce credit-limit caps within the current product cycle, based on stated-preference survey data. The action class (underwriting) cannot legitimately be authorised by the data class (self-report) without behavioural validation. The signal was real; the action was operationally naive.

#### Class 4 — Story-angle audience precision (D-052)

The "Travel Avidity Myth, Unpacked" story angle targeted *"Consumer insights leads and strategy directors at travel brands, tourism boards, and research agencies in ASEAN"* — a bundled audience. The angle's lede was a debunk of market expectation, which unlocks budget for methodology audiences (insights leads, research agencies) but threatens it for growth-stage buyers (tourism boards). By bundling, the angle inherited the commercial viability of its most reluctant buyer.

#### Class 5 — CSV treated as text, not as query engine (D-053)

The analyser noted across multiple verdicts that it was "only seeing ~528 rows" of the 10,000-row file. That's mechanical: `TOTAL_DATA_BUDGET_CHARS = 80_000` against a 1.5 MB CSV is ~5.3% of rows. Premise wasn't sandbagging; it was honestly reading the truncated extract and admitting it. But the framing wasn't there — the verdicts read as failures rather than as honest limitations of how Premise handles tabular data today.

### Fixes shipped in response

| Class | Fix | Decision entry |
|---|---|---|
| 1 | Brief-scope clarifier + scope-from-brief discipline + `scope_inherited_from` audit field + amber tag | D-049 |
| 2 | Verdict-direction-check (analysis) + action/caveat consistency-check (recommendation), with auto-correction + visible caveat | D-050 |
| 3 | Action-class constraint in recommendation prompt + `requires_behavioral_validation` field + UI amber chip + server-side confidence cap | D-051 |
| 4 | Story-gen `target_audience` = one buyer + one job-to-be-done; lede-direction/audience-fit rule | D-052 |
| 5 | CSV-framing notice in analysis prompt + inline user-message header + amber callout on the artefact | D-053 |

### Next: re-run the same brief against the post-fix pipeline

The expected deltas:
- Hypotheses generated from the same region-neutral brief should not contain region words. `scope_inherited_from` should read `brief` or `clarifier` on every accepted hypothesis.
- The same H10-shaped hypothesis, if it appears, should land with `verdict: inconclusive` and a `[Direction check]` caveat, OR with `confirmed` only when the prose actually supports the hypothesis direction.
- The merchant-payments recommendation, if it appears, should either be re-articulated to land in the safe action class, OR carry `requires_behavioral_validation: true` with confidence capped at medium.
- The "Travel Avidity Myth" angle, if it appears, should target a single buyer whose budget is unlocked by the correction (insights methodologist / research agency lead / regulator), not a bundled list including tourism boards.
- Analysis run on the same CSV should produce verdicts that explicitly cite "the visible extract" and downgrade to `inconclusive` on claims that would require statistical testing.

### New eval probe set (D-049)

| Probe type | Count | Notes |
|---|---|---|
| **scope-discipline** | **2 (new)** | D-049 close; region-neutral and time-horizon-neutral fixtures. Asserts forbidden substrings don't leak into statements + every draft self-reports `brief` or `clarifier` as scope source. |

### Deferred items remaining

Unchanged from D-046: D-7 streaming, R-5 skip logic, E-5 model-regression. Original rationale holds.

### Sequence for the next pass

The audit-closing fixes (D-049 through D-053) are all live. Aaron's next step: apply migrations 0016 + 0017 to Supabase, re-run the same ASEAN brief end-to-end, and capture the before/after in this section. That's the dogfood loop closed.

