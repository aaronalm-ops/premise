# Premise — Public Corpus Vetting Rubric

> The filter applied before any document enters the public library. Distinct from `PUBLIC_CORPUS_LICENSING.md` (which gates *legal* risk) — this gates *epistemic* risk. The question isn't "can we publish this?" but "is this *research* or is this *advocacy dressed as research*?"
>
> A corpus full of legally-clean propaganda is worse than a smaller corpus of legally-clean research. This rubric exists so the editorial filter is explicit and replicable.

---

## Why this matters

A public library that ingests advocacy reports as if they were research silently tilts every downstream Premise output. Hypothesis generation cites the advocacy; story angles ladder up to the advocacy; the bot becomes a confident parrot of whichever bias the loudest publisher had. The corpus's *credibility cost* is invisible until a methodologist or a journalist clicks through and finds a Heritage Foundation report in the same library as a Pew survey, with no signal that one is advocacy and one is research.

The point of this rubric isn't to enforce neutrality — research is rarely neutral. The point is to enforce *transparency about the lens*. A report with disclosed methodology, disclosed funding, and disclosed limitations can be ingested even if it has a clear point of view; the curator note discloses the lens. A report with hidden methodology and hidden funding cannot, regardless of its conclusions.

---

## The verdict scale

Every candidate source gets one of three verdicts:

### ✅ Solid — ingest
The source meets *all* of:
- Methodology disclosed (sample size, fielding window, weighting where applicable; for qual: participant count, recruitment method).
- Funding and authorship transparent.
- Published by an institution with editorial process (peer review for academic; established editorial standards for think tanks / agencies).
- Limitations acknowledged in the report itself.
- No single-issue advocacy framing in the title or abstract.

### ⚠️ Acceptable with lens-disclosure
The source meets the *transparency* bar but carries a known viewpoint. Ingest only if the curator note explicitly names the lens. Examples:
- Edelman Trust Barometer — methodologically rigorous, but Edelman is a PR firm and the framing serves their corporate-trust-consulting business. Lens: "PR-industry-commissioned, lens is corporate trust."
- Agency annual reports (Kantar BrandZ, etc.) — published for marketing-of-services. Lens: "agency self-promotion via genuine research."
- Think tank with a stated ideological position (Brookings, Heritage, CAP, AEI, etc.) — research can be rigorous but the topic selection reflects the lens. Lens: "[think tank] research; [orientation] orientation."

### 🛑 Skip — do not ingest
Any one of these is disqualifying:
- Methodology not disclosed (e.g., "in a survey of consumers" with no sample size, fielding, or weighting).
- Funding not disclosed AND publisher's funding is contested.
- Publisher is a known front organisation, state media outlet posing as independent research, or astroturf operation.
- Single-sponsor advocacy report from the entity that benefits from the conclusion ("Why our industry creates economic value" published by that industry).
- Predatory journal publication (academic).
- Title or abstract uses advocacy language ("the case for X", "why X is failing", "exposing the truth about Y") without methodological framing.
- Religious or partisan-political framing presented as consumer research.

---

## Red flags (any one triggers extra scrutiny)

1. **No author named.** "Our team", "research division", or no byline at all on a report longer than 5 pages.
2. **No sample size.** "Surveyed consumers" with no n.
3. **No fielding window.** "Recent survey" with no dates.
4. **No methodology section.** Findings only, no how-they-got-there.
5. **One-sided framing in title.** "The case for X", "Why Y is dying", "The truth about Z."
6. **Findings that perfectly match the funder's commercial interest.** Possible but suspicious; needs methodology scrutiny.
7. **Cherry-picked timeframe.** "Up 200% since 2020" where the base period was an anomaly.
8. **Round numbers everywhere.** Real consumer research rarely produces 50/30/20 splits across categories.
9. **No acknowledged limitations.** Every honest research report names what it didn't measure.
10. **Astroturf giveaways.** Funded by a coalition or association whose own funding is opaque; named experts whose affiliations don't appear elsewhere.

## Green flags (any one materially strengthens the case)

1. Methodology stated up front (sample, fielding, weighting, response rate).
2. Multiple data sources triangulated (quant + qual; primary + secondary).
3. Limitations section named explicitly.
4. Named authors with verifiable institutional affiliations.
5. Pre-registered hypotheses or published methodology supplements (academic).
6. Replication of prior work cited.
7. Disclosed funding source AND the funding source is independent of the conclusion.
8. Peer review (academic) or published editorial process (think tanks, established agencies).
9. Disagreement with conventional wisdom presented as a *finding*, not a *claim*.
10. Surfacing of inconvenient results alongside flattering ones (the test of editorial honesty).

---

## Bucket-specific notes

What to watch for in each `source_type`:

### `government`
**Usually safe.** US federal statistical agencies, UK ONS / FCA / Ofcom, Eurostat, OECD all have methodology disclosure as standard.
**Watch for:** politically-edited *summaries* of statistical reports (the underlying data is usually clean; the summary's framing may not be). In some jurisdictions, state-controlled statistical bodies report data subject to political pressure — verify the specific source's reputation per region.
**MENA / India / SEA specifically:** higher variance. Saudi GASTAT and UAE FCSC are professional. State media disguised as statistics in some authoritarian contexts is real. Cross-check against independent regional sources.

### `academic`
**Usually safe** if from a recognised journal with peer review.
**Watch for:** predatory journals (no peer review, pay-to-publish); preprints not yet published; "research" from advocacy-funded research centres. Check the journal's reputation; check whether the paper's funding section discloses commercial sponsors.

### `trade-body`
**Usually safe.** ESOMAR, MRS, AAPOR, AMA, ARF all have methodology disciplines.
**Watch for:** sponsored research from member firms presented as trade-body research; "industry trends" reports that are really member-firm marketing.

### `agency`
**Acceptable with lens-disclosure.** Always lens 5 (acceptable with disclosure). Kantar / Ipsos / Nielsen / Big-4 publish for client acquisition; the research itself is usually methodologically sound; the *selection* of topics reflects their commercial interest.
**Watch for:** "joint reports" with single-vendor partners that promote that vendor's products.

### `analyst`
**Acceptable with lens-disclosure.** Salesforce / HubSpot / Adobe / SaaS State-of-X reports are commercial; the research is real but the framing serves the product. Disclose the lens in the curator note.
**Watch for:** "research" that is really product-marketing with a survey decoration; reports where the methodology is mentioned in 2 lines and the conclusions in 20 pages.

### `think-tank`
**Highest bias risk.** Even rigorous think tanks have ideological positions.
**Pew / Reuters Institute / Edelman / Brookings** — generally credible across the political spectrum; lens disclosure required.
**Heritage Foundation / Cato Institute / AEI / CAP / EPI / Roosevelt Institute** — research can be rigorous but topic selection and framing reflect ideology. Ingest only if directly relevant to a methodology / consumer-research question, and lens-disclose in the curator note.
**Single-issue advocacy think tanks** — generally skip unless the document is methodology-shaped.

### `methodology`
**Usually safe.** Classics (Likert, Krosnick, Schwarz, Sharp, Kahneman, AAPOR Task Force) are foundational and lens-neutral by virtue of being about *how to measure*, not *what to conclude*.
**Watch for:** opinion pieces about methodology that are really arguments for one school over another (e.g., "the case against NPS"). Acceptable if framed as methodology debate, not methodology advocacy.

### `regional`
**Variable.** Statistical bureaus (Saudi GASTAT, UAE FCSC, Singapore Stats, NSSO India) are usually professional. State-controlled media research is not.
**Watch for:** "consumer reports" from countries where independent research is restricted; ministry-of-information output disguised as market research; multinational agency regional offices producing reports whose framing reflects government client interests.

### `meta`
Premise's own docs — automatically safe.

---

## Confidence note: what I can / cannot tell from a name

When Aaron pastes a list, my verdict is based on:

**What I can judge:** the *publisher*'s reputation and known editorial standards; the *report title*'s framing (advocacy language vs methodological language); my background knowledge of named institutions and their lens.

**What I cannot judge from a name alone:** the actual content of the PDF; whether the methodology section is present and adequate; whether the data supports the framing; whether the report has changed editorial direction recently.

**Verdict confidence levels I'll surface:**
- **High confidence** — well-known publisher, clear report category, lens already known.
- **Medium confidence** — publisher known but report-specific framing uncertain; recommend a fast methodology-check before ingest.
- **Low confidence** — unfamiliar publisher; recommend Aaron verify methodology + funding before ingest.

---

## How to use this rubric

1. **Before ingesting:** paste a list of candidate sources to me (publisher + report title + year is enough). I'll return a verdict per row.
2. **For ⚠️ verdicts:** I'll include the lens-disclosure phrase to embed in the curator note.
3. **For 🛑 verdicts:** I'll name the specific red flag(s) so Aaron can decide whether to override (rare — usually skip).
4. **For low-confidence verdicts:** I'll flag what to verify before deciding.

Aaron's final call always. The rubric is a partner, not a gatekeeper.

---

## Quarterly review

This rubric should be re-applied at the corpus's quarterly review (per `PUBLIC_CORPUS_TASKFORCE.md` editorial discipline):

- Re-check every ⚠️ entry's curator note still discloses the lens.
- Spot-check 10 random entries for methodology-disclosure-still-present (publishers occasionally remove transparency over time).
- Add any new red-flag patterns surfaced by the prior quarter's experience.
