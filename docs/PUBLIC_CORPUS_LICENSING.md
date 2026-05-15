# Premise — Public Corpus Licensing Tracker

> Per-source legal provenance for every document in the Premise Public Library. If a takedown notice ever lands, this is the audit trail.

The IP lawyer in `docs/PUBLIC_CORPUS_TASKFORCE.md` (critique 1) called this out as the *load-bearing gate* of the entire public-corpus build: without per-document provenance, you can't tell safe from risky a year from now. This document is that gate.

## What goes here

Two complementary records:

1. **Per-source verbatim licence statements** — the quoted text from each publisher's terms-of-use page that supports the licence claim. If the publisher's site changes, this is your receipt.
2. **Permission emails received** — copies of any "yes, you may ingest this" replies from trade-body or agency communications offices.

The canonical *content* of the library lives in [`scripts/public-library-manifest.ts`](../scripts/public-library-manifest.ts); this doc lives alongside it as the legal receipts file.

---

## The four legal buckets

Per the taskforce:

| Bucket | What | Premise's posture |
|---|---|---|
| **Public domain** | US federal works (17 USC § 105), pre-1928 works | Ingest freely; attribution is courtesy not required |
| **Creative Commons / Open Government** | CC-BY / CC-BY-SA / CC0 / UK Open Government Licence v3 / Eurostat CC-BY-equivalent | Ingest freely with attribution; record the specific licence URL |
| **Attribution-permitted** | Pew / Reuters Institute / Edelman — © to publisher but explicitly allow reproduction with attribution | Ingest with the curator's note crediting the source; record the exact terms passage |
| **Permission-licensed** | Trade-body methodology guides; agency reports where written permission obtained | Ingest only after written permission email is filed below |

Anything not in these four buckets — including "freely accessible" content with no explicit licence — is treated as ambiguous. **Skip and email the publisher, or don't ingest.**

---

## Per-bucket licence statements (templates — fill in as you source)

### US federal government — public domain by statute

> "A work of the United States government, as defined by the United States Copyright Act, is 'a work prepared by an officer or employee of the United States Government as part of that person's official duties.' Under section 105 of the Copyright Act of 1976, such works are not entitled to domestic copyright protection under U.S. law and are therefore in the public domain."

This applies to: BLS, Census, CFPB, Federal Reserve (statistical publications), FTC, CDC, NIH/HHS, GAO, NTIA, NHTSA. No per-publisher record needed; the statute is the licence.

### UK government — Open Government Licence v3

> "You are free to: copy, publish, distribute and transmit the Information; adapt the Information; exploit the Information commercially and non-commercially for example, by combining it with other Information, or by including it in your own product or application. You must (where you do any of the above): acknowledge the source of the Information in your product or application by including or linking to any attribution statement specified by the Information Provider(s) and, where possible, provide a link to this licence."

Source: `https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/`

This applies to: ONS, FCA, Ofcom, gov.uk statistical publications, and most UK departmental output. Verify each per-PDF — some MOD / intelligence-community output is explicitly excluded from OGL.

### EU / Eurostat — CC-BY 4.0 equivalent

> "Eurostat has a policy of encouraging free re-use of its data, both for non-commercial and commercial purposes. All statistical data and metadata, except where otherwise indicated, can be downloaded free of charge and reused, copied, modified, redistributed for free or for commercial purposes, as long as the source is duly credited."

Source: `https://ec.europa.eu/eurostat/about-us/policies/copyright`

### Pew Research Center — attribution-permitted

> Per Pew's published reuse policy: their publications "may be quoted or excerpted with attribution to the Pew Research Center" without prior permission. Some content may carry additional restrictions; check the specific report's footer.

Source: Pew Research Center's "Use Policy" — populate the exact URL when you ingest the first Pew report.

### Reuters Institute — CC-BY 4.0

> "This work is licensed under a Creative Commons Attribution 4.0 International License." (Standard on Reuters Institute reports including the Digital News Report.)

Source: each report's licence statement, usually on the publication page.

### Edelman — attribution-permitted (per-report check)

> Edelman's Trust Barometer is published with explicit "free to share with attribution" terms. Edelman's other research varies; check the specific report.

---

## Permission emails — filed copies

When a trade body or agency grants written permission to ingest, paste the relevant passage below with the date and the recipient.

### ESOMAR
- **Status:** *(not yet requested)*
- **Date requested:**
- **Date granted:**
- **Recipient:**
- **Permission text:**

### MRS (Market Research Society UK)
- **Status:** *(not yet requested)*
- **Date requested:**
- **Date granted:**
- **Recipient:**
- **Permission text:**

### AAPOR
- **Status:** *(not yet requested)*
- **Date requested:**
- **Date granted:**
- **Recipient:**
- **Permission text:**

### AMA (American Marketing Association)
- **Status:** *(not yet requested)*
- **Date requested:**
- **Date granted:**
- **Recipient:**
- **Permission text:**

### Advertising Research Foundation (ARF)
- **Status:** *(not yet requested)*
- **Date requested:**
- **Date granted:**
- **Recipient:**
- **Permission text:**

---

## Per-document audit log

One line per ingested document. Fill in as the manifest grows. The first column matches `file` in `scripts/public-library-manifest.ts`.

| File | Publisher | Year | Licence (manifest value) | Licence URL (verbatim source) | First ingested |
|---|---|---|---|---|---|
| _(none yet — populate as you ingest)_ | | | | | |

---

## What to do if a publisher's terms change

1. Note the change here with the date.
2. Decide: continue ingesting under the new terms, or remove the document.
3. If removing: delete the manifest entry and run `npm run seed-public-corpus` — the entry won't be re-ingested, but **existing chunks remain in the DB until manually deleted**. Run a one-off cleanup query on `documents` + `chunks` for the affected `content_hash`.

(A future enhancement: a "decommission this document" script that takes a document_id and removes its chunks. Worth building once the corpus crosses ~50 documents.)

---

## What to do if a takedown notice arrives

1. Identify the affected document via this audit log.
2. Quote the licence statement you ingested under, with its URL and date.
3. If your ingestion was within the licence terms, reply with the receipt. The publisher's claim is now mistaken or the terms have changed mid-flight (uncommon but possible).
4. If your ingestion was *outside* the licence terms (e.g. licence was unclear and you ingested anyway), remove the document immediately and update this log. Send a brief, factual reply confirming removal.
5. **In either case, never ingest from that publisher again without explicit written permission.**

---

## Maintenance cadence

- **Per ingestion:** add a row to the per-document audit log.
- **Monthly:** spot-check 5 random rows by re-visiting the licence URL. Note any publisher-side changes.
- **Quarterly:** full review alongside the taskforce-recommended public-library editorial review (`docs/PUBLIC_CORPUS_TASKFORCE.md`, expert 10).
