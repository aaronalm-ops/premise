# Success metrics for Premise

> What "Premise works" means in numbers. Closes [P-1](EVALUATION_LOG.md) from the audit.
>
> Three layers — what we measure today (cheap, automated), what we'd measure with one paying client (medium effort), what we'd measure to defend a Series-A pitch (expensive, longitudinal).

---

## Layer 1 — what we measure today

These are observable from the existing tables (`hypotheses`, `personas`, `questions`, `analyses`, `api_calls`, `ask_log`) without any new instrumentation.

| Metric | Definition | What "good" looks like |
|---|---|---|
| **First-generation acceptance rate** | % of generated hypotheses / personas / questions that the researcher accepts on the first generation pass (status flips to "accepted" without a regenerate first) | ≥ 35% — bot is generating useful first-pass options |
| **Median time-to-first-acceptance** | From `created_at` on the first generation to `updated_at` on the first accepted item | < 5 min — researcher reads, decides, doesn't agonise |
| **Variant-selection completeness** | % of accepted questions that have a `selected_variant_id` | ≥ 80% — researchers are actually picking variants, not skipping the choice |
| **Abstention rate on out-of-corpus questions** | From eval harness: % of probes returning `claims: []` correctly | ≥ 95% — the strict-mode promise holds |
| **Cost per project** | Sum of `cost_usd` from `api_calls` per project_id | < $0.50 for portfolio dogfood; < $2 for real client wave |
| **Cache hit rate** | `cached_input_tokens / (input_tokens + cached_input_tokens)` from `api_calls` | ≥ 60% during steady-state use — caching is working |
| **Rejection-reason capture rate** | % of rejected items with non-null `rejection_reason` | ≥ 30% — researchers find the prompt useful enough to fill |

These are computed by `getProjectCostRollup` (cost) and one-shot SQL queries (rest). A `/api/projects/[id]/metrics` endpoint surfacing them in the canvas is a follow-up; the data is already there.

## Layer 2 — what we measure with one paying client

Requires light instrumentation on the user side (10-min usability sessions, post-wave debrief survey) and one new table (`session_events`) to capture per-action timings.

| Metric | Why it matters |
|---|---|
| **Self-reported "vs. baseline" time saving per project** | The 10-hours-saved promise — measure it for real |
| **Hypothesis edit rate** | If researchers edit > 50% of generated hypotheses, our prompt isn't producing usable first drafts |
| **Variant rejection-by-type** | Shows which methodological frames the bot is over-suggesting (always reach for neutral_direct? leading? bias signal) |
| **Analysis verdict overturn rate** | After a researcher reads the bot's analysis, how often do they manually override the verdict in their final deck? |
| **Re-run frequency on regenerate** | If researchers hit "regenerate" 5× per artefact, the bot is missing on first pass |
| **Brief-to-export wall-clock time** | From brief save to questionnaire export for a real wave — the canonical "Premise saved me X hours" claim |

## Layer 3 — what we measure for a Series-A pitch

Cohort retention and unit economics. Out of scope for portfolio phase but worth naming so the case study has a forward-looking section.

| Metric | Why it matters |
|---|---|
| Weekly active researchers | Adoption + retention |
| Projects per researcher per month | Engagement depth |
| Token cost per accepted question | Unit economics — can the bot pay for itself per output? |
| Net Promoter from researchers | Will they recommend it to peers? |
| Conversion from free to paid tier (if/when introduced) | Commercial readiness |
| Time from sign-up to first accepted hypothesis | Onboarding success |

## How this maps to the existing audit

- **P-1** (no success metrics defined) — addressed by this document.
- **P-3** (no telemetry beyond cost) — partially addressed: Layer 1 metrics derivable from existing tables. Full behavioural telemetry remains open and is the natural next instrumentation push.
- **P-2** (no user feedback loop) — partial: rejection-reason capture is now wired (D-035). Layer-2 metrics extend this with explicit usability feedback.

## Where these get reported

- **Now:** ad-hoc SQL queries against the production Supabase, displayed in the cost badge for cost; eval harness output for abstention rate.
- **After Tier 4 follow-up:** a `/metrics` page in the canvas exposing Layer 1 metrics per project for the logged-in user.
- **Once a real client wave runs:** Layer 2 metrics added to the case study as evidence the time-saving claim is real, not aspirational.
