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
| R-4 — No survey export | open | |
| R-5 — No skip logic / ordering / demographic / screener | open | |
| R-6 — No sample size guidance | open | |
| L-1 — Prompt caching not implemented | open | |
| L-2 — No eval harness | open | |
| L-3 — No retry logic | open | |
| L-4 — Reranker parses free text | open | |
| L-5 — Verifier N calls vs 1 batch | open | |
| L-6 — No idempotency on generation | open | |
| L-7 — No cost telemetry | open | |
| L-8 — No prompt versioning | open | |
| D-1 — Zero tests | open | (eval harness covers some) |
| D-2 — Confidentiality untested | open | (eval harness) |
| D-3 — No transactions | open | |
| D-4 — Error messages leak | open | |
| D-5 — Tool_use cast unvalidated | open | |
| D-6 — No request validation library | open | |
| D-7 — No streaming | open | |
| D-8 — No optimistic UI | open | |
| U-1 — Chat history doesn't persist | open | |
| U-2 — No next-action guidance | open | |
| U-3 — No survey export / copy-to-clipboard | open | |
| U-4 — No edit affordance | open | |
| U-5 — Loading states no pipeline stage | open | |
| U-6 — No project creation from UI | open | |
| U-7 — No delete anywhere | open | |
| U-8 — No confirmation on destructive regenerate | open | |
| U-9 — Same color, different signals | open | |
| U-10 — Mobile/tablet broken | wont-fix-yet | Commercial phase |
| P-1 — No success metrics | open | |
| P-2 — No user feedback loop | open | |
| P-3 — No telemetry | open | |
| P-4 — selected_variant_id has no consumer | open | (Phase 4) |
| P-5 — No in-product taxonomy explanation | open | |
| P-6 — Hardcoded option counts | open | |
| P-7 — No version history on briefs | open | |
| P-8 — No A/B test infra | open | |
