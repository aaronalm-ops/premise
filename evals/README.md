# Premise eval harness

A six-probe-type harness that gates every prompt change. Run it before merging anything that touches a system prompt, the strict-output schema, the retrieval/rerank/verify pipeline, or the chunking/embedding code.

## What's tested

| Probe type | Count | What it catches |
|---|---|---|
| `golden-qa` | 5 | Bot answers questions the corpus *can* answer with cited claims |
| `abstention` | 4 | Bot returns `claims: []` on out-of-corpus questions and populates `unanswered_aspects` |
| `hallucination` | 4 | Bot abstains or cites correctly on questions designed to tempt fabrication |
| `hypothesis-quality` | 2 | Generated hypotheses are grounded, distinct, have expected_direction + confirmation_criteria |
| `persona-quality` | 2 | Generated personas have non-trivial `under_represents` (D-016 / D-018 spirit) |
| `confidentiality` | 3 | Cross-project retrieval is impossible (D-016 enforcement test) |
| **Total** | **20** | |

## How to run

```bash
# Setup (idempotent — first run creates eval projects + ingests fixtures)
npm run eval:setup

# Full run
npm run eval

# Single type
npm run eval -- --type=golden-qa

# Reset (discards saved config; next run creates fresh projects)
npm run eval:reset
```

A passing run exits 0; any failure exits 1, suitable for CI gating.

## What's where

```
evals/
├── README.md                         this file
├── .config.json                      auto-generated; contains the two eval project UUIDs (gitignored)
├── cli.ts                            entry point for npm run eval
├── fixtures/                         test corpus (3 public docs + 1 confidential doc)
├── probes/                           probe definitions, one JSON per probe
├── lib/                              types, setup, reporter, probe loader
├── runners/                          one runner per probe type
└── results/                          date-stamped JSON outputs (gitignored)
```

## How to add a probe

1. Add a JSON file under `evals/probes/<type>/NNN-short-name.json`.
2. Match the probe type's expected schema in `evals/lib/types.ts`.
3. Run `npm run eval -- --type=<type>` to verify it passes.

## Why setup uses two projects

Confidentiality probes verify **D-016** — cross-project retrieval is structurally impossible. The harness creates **project A** (public corpus, fixtures 01-03) and **project B** (confidential, fixture 04 — "Project Atlas"). Probes deliberately query project A for content that exists *only* in project B and check that no project B chunks surface.

## What this harness does NOT yet test

- **Subjective hypothesis specificity** (R-1 in EVALUATION_LOG): we check structural quality only — schema-conformant outputs, distinct statements, minimum length. A judge-based rubric for "is this hypothesis specific enough?" is a follow-up.
- **Subjective persona under_represents quality** (R-2): same — we check minimum length and presence, not whether the under_represents content is genuinely useful.
- **Variant taxonomy quality**: the 3-variant pairing in question generation isn't yet checked for methodological diversity.
- **Cost regression**: there's no eval that flags a prompt change that suddenly costs 2x more. To add once cost telemetry ships.

These are noted in [docs/EVALUATION_LOG.md](../docs/EVALUATION_LOG.md) as future work.

## What a passing run looks like

```
Premise eval harness

Reusing eval config: project A=..., project B=...

=== Running probes ===

[ OK ]  golden-qa            golden-qa-001                          3284ms  Which AI provider was flagged for cautious behaviour
[ OK ]  golden-qa            golden-qa-002                          2911ms  Top trust failure cited by senior researchers
...
[ OK ]  confidentiality      confidentiality-003                     128ms  Querying a nonexistent project_id must return zero chunks

=== Summary ===
Total: 20  Passed: 20  Failed: 0  Duration: 64.2s

By type:
  golden-qa            5/5 passed
  abstention           4/4 passed
  hallucination        4/4 passed
  hypothesis-quality   2/2 passed
  persona-quality      2/2 passed
  confidentiality      3/3 passed

Full results: evals/results/2026-04-30_22-14-08.json
```

## Cost per full run

Roughly **$0.40 – $0.70** per full run today. After prompt caching ships (next push), expect ~$0.10 per run.

If you're running probes during prompt iteration, use `--type=` to scope to the type you're tuning.
