# Next: DuckDB-as-tool (D-049/050/051/053 follow-up)

This file is a planning scaffold for the next decision entry. It captures what was
in scope for "(8) DuckDB-as-tool" during the 2026-05-18 push but was deliberately
deferred to its own session.

## What problem this solves

D-053 framed the existing CSV limitation honestly: Premise reads CSVs as text, sees
~5% of rows, can't compute chi-square / regression / significance. That's a
positioning fix. The capability fix — letting Premise actually compute over the
full table — is DuckDB-as-tool.

The ASEAN dogfood verdicts that triggered D-049 and D-050 partly stem from the
same root: the model was straining to produce verdicts over data it could not
see. Layer-by-layer, the work so far:

- D-049 controls scope inheritance (front + safety net).
- D-050 catches inter-field contradictions (direction-check, action/caveat).
- D-051 constrains the action class to the data class.
- D-053 frames the CSV truncation honestly so verdicts come out calibrated.

DuckDB-as-tool is the capability extension that closes the loop: when a CSV is
in scope, the analyser can compute the table-level statistics it currently has
to admit it can't.

## Shape (proposed)

A new tool surface on the analysis generator (and possibly the recommendation
generator):

```
{
  name: "query_dataset",
  input: { dataset_id: string, sql: string },
  output: { rows: [...], row_count, columns, error? }
}
```

The analyser's tool_choice changes from a single forced tool to a router:
`{type: "auto"}` with both `analyse_data` and `query_dataset` available. The
model can call `query_dataset` one or more times before calling `analyse_data`,
populating its verdicts with real counts/percentages/contingency tables instead
of textual approximations.

## Implementation surface

| Layer | Change |
|---|---|
| Deps | Add `@duckdb/node-api` (Node native bindings) |
| Ingest | When `source_type === "csv"` on `AnalysisData`, also store a stable dataset_id + (lazily) load the full CSV into an in-memory DuckDB connection on first query. |
| Tool | New `src/lib/rag/duckdb-tool.ts` exposing `query_dataset(dataset_id, sql)`. Sandboxed to read-only SELECTs over the registered datasets (block DDL, attach, copy). |
| Analyser | Update `analysis-generator.ts` to advertise the tool. When the model emits a `query_dataset` call, execute it, return the result as a tool_result message, and re-invoke until the model emits `analyse_data`. |
| Prompt | Update `analysis.ts` to teach the model when to query vs when to read-text. Bias toward queries for population-level claims and toward text for verbatim quotes. |
| Cost | Tool calls themselves are free (local DuckDB); model-side cost = additional Sonnet input/output per query+result round-trip. Bound the loop at 4-6 query rounds to keep cost predictable. |

## Why we didn't do it in the 2026-05-18 push

1. **Scope.** D-049/050/051/053 are surface-level corrections to existing
   pipelines. DuckDB-as-tool is a new capability layer; it deserves its own
   decision entry, not a footnote.
2. **The honest-framing layer (D-053) might be enough.** With CSV-truncation
   explained on the artefact and the prompt biasing toward `inconclusive` for
   significance claims, the dogfood re-run may show that researchers are
   happy treating Premise as a text-synthesis layer and computing stats
   elsewhere. We should run the re-test first and let the result decide whether
   DuckDB is needed.
3. **Real-corpus calibration.** The DuckDB tool's value is most visible on
   genuine survey data. Aaron's portfolio-phase priority is dogfooding on a
   real client project, not building speculative capability. Better to learn
   from one real wave whether the gap is worth closing.

## Trigger for picking this up

Pick this up when one of these signals appears:

- The dogfood re-run shows researchers wanting numerical claims Premise can't
  back up because of the text-only path.
- A pilot user explicitly asks for "can it actually run the numbers?"
- Premise enters paid territory and a buyer's first technical question is "what
  data formats does it operate on natively?"

Until then, the honest-framing layer (D-053) is the right answer.

## Decision-entry skeleton (when shipped)

```
## D-NNN — DuckDB-as-tool for tabular analysis

### The story
[The capability extension paired with D-053's framing honesty.]

### What we built
[Tool surface, ingest changes, analyser loop, prompt updates.]

### What we considered
- Pyodide for in-browser Python compute
- A server-side Python sandbox
- Pre-computed stat batteries at ingest
- DuckDB-WASM on the client (faster privacy story, harder integration)

### The PM lesson
[Capabilities should follow demonstrated demand, not anticipated demand.]

### What would break if we got it wrong
[Sandbox escape; query loops not bounded; cost blow-up; stat-claim drift.]
```
