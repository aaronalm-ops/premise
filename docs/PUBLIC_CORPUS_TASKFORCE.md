# Premise — Public Corpus Taskforce

> An elite roundtable convened to advise on building out the public library — what to source, where from, what to avoid, and how to curate it without inheriting a takedown notice or a credibility problem. Ten experts across IP law, open-access publishing, agency-side research, government data, comms, marketing academia, RAG engineering, and editorial craft. Internal strategy document; not for external publication.
>
> Format mirrors `TASKFORCE_CRITIQUE.md`: who the expert is, what they'd say, why it matters, what Aaron should actually do. Closes with a sourcing matrix, a six-week build sequence, and an explicit red-flags list.

---

## How to read this

Two failure modes to watch for as you build the corpus:

1. **The volume trap.** "Scrape everything that looks researchy and ingest it." Produces a corpus that's legally fragile, methodologically chaotic, and full of low-signal content the retrieval layer has to wade through. Bigger ≠ better.
2. **The IP trap.** "I have great agency reports on my hard drive — let me anonymise and add them." Anonymising client-confidential content is *not* the same as having a licence to publish it. Even paraphrased, the underlying work product belongs to the agency or client who paid for it.

Both traps look like productivity. Both end with the public corpus quietly becoming a liability rather than the moat.

Experts ranked roughly in order of *bite* — the ones whose failure modes would most quickly kill the corpus come first.

---

## 1. The IP / Copyright Lawyer (the load-bearing gate)

*Imagined as: 15-year specialist in publishing IP, advises on Creative Commons compliance, database rights, fair use vs. fair dealing.*

**What she'd say.** "Before you talk about sources, talk about what *kind of permission* you have for each one. Most of what looks 'public' on the open internet is *publicly accessible*, not *publicly licensed*. There's a difference. A Pew report posted free on pewresearch.org is © Pew Research Center; you can read it, link to it, quote excerpts under fair use, but you cannot re-host the full PDF in your own searchable database — that's a derivative work and it needs a licence.

"There are four legal buckets you can build the corpus from safely:

1. **Public domain.** Pre-1928 works in the US; older in many jurisdictions; *all* US federal government works (this is the underused one — Census, BLS, FTC, FRBs, NIH all publish in the public domain).
2. **Creative Commons licensed** — particularly CC-BY (attribution only) and CC-BY-SA (attribution + share-alike). CC-NC (non-commercial) is dangerous because Premise *will* go commercial; assume it doesn't apply.
3. **Permission-licensed.** You email the publisher, they grant you a written licence to ingest. Slow but premium-grade.
4. **Linked-only.** You don't host the content; you embed a link with a short excerpt under fair use / fair dealing. Surfaces the source without legal exposure.

"The trap most builders fall into is mixing buckets without tracking which is which. Every chunk in the corpus needs a provenance field naming its source, its licence, and the URL of the licence terms. Without that, when a takedown notice lands, you can't tell which 200 documents are safe and which are exposed."

**Why it bites.** This is the single failure mode that can shut Premise's public library down overnight if it lands wrong. Not theoretical — Sci-Hub, ResearchGate, and several AI-training startups have all faced takedown campaigns from publishers.

**What Aaron should do.**
- Add a `licence` field and a `licence_url` field to the `documents` table for every public-library document.
- Maintain a one-page `docs/PUBLIC_CORPUS_LICENSING.md` listing every source and its bucket.
- For commercial pivot, add a written *Notice of Provenance* visible from every cited chunk in the UI (the citation chip can hover-preview the licence note alongside the content).
- Reject anything where licence terms are ambiguous — "free to read" is not a licence.

---

## 2. The Open-Access Academic Librarian

*Imagined as: head of digital scholarship at a top-30 university library; has built CC-licensed institutional repositories for a decade.*

**What he'd say.** "Stop thinking of 'public research' as agency reports. The most rigorous, most cite-able, most legally clean corpus you can build is from the academic open-access ecosystem. It already exists, it's already CC-licensed, and almost nobody outside academia uses it well.

"Five high-yield sources, in order of what to ingest first:

- **SSRN** (ssrn.com) — Social Science Research Network. Working papers in marketing, consumer behaviour, behavioural economics. Most authors post pre-prints under permissive licences. Search by topic + filter by open-access.
- **PLOS** (plos.org) — Public Library of Science. All articles CC-BY. Less marketing, more methodology (behavioural science, decision research, public health consumer studies).
- **JSTOR Open Content** — free historical archive; older marketing/sociology papers, often in public domain by age.
- **University institutional repositories** — every major university has one (Harvard DASH, MIT Open Access, Oxford ORA). Theses and working papers, almost all CC.
- **arXiv** (arxiv.org) — mostly STEM but the `cs.CL` / `cs.IR` sections are gold for AI-research methodology; useful as context for the AI-PM angle of Premise itself.

"The trick is to filter aggressively for *recent* (last 5 years), *methodology-relevant* (consumer behaviour, qual methods, survey design), and *cited* (Google Scholar shows you the citation count; aim for >20 citations as a quality filter). Bad academic papers exist in volume; selecting them in is your single biggest curation lever."

**Why it bites.** Without this layer, the corpus reads like a marketing-trade-press anthology rather than a *research* tool. The credibility a methodologist or a hiring manager looks for is "does Premise know what peer-reviewed work in this space looks like?". Open-access academic content is how you signal yes.

**What Aaron should do.**
- Target 30–40 academic OA papers across consumer behaviour, qual methods, attitude–behaviour gap, and panel methodology.
- Use citation count as a quality filter (>20 Google Scholar citations).
- Always ingest the *abstract + intro + discussion + conclusion* if the paper is long; the methods section is too dense for retrieval and often unhelpful out of context.

---

## 3. The Trade Association / Methodology Body Liaison

*Imagined as: former head of communications at ESOMAR or MRS; knows what every major insights-industry body publishes publicly.*

**What she'd say.** "Trade associations are the most underused source for an insights-research corpus. They publish *methodology* pieces that working researchers actually use — and most are free, attributed, and licensed to republish.

"The ones to prioritise:

- **ESOMAR** (esomar.org) — the global insights industry body. Their *Global Research Industry Report*, methodology guidelines, ethics codes, and yearly trends papers are gold.
- **MRS** (mrs.org.uk) — Market Research Society (UK). Heavy on methodology guides, ESOMAR-equivalent in the UK.
- **AAPOR** (aapor.org) — American Association for Public Opinion Research. Publishes survey methodology standards, weighting guidance, panel quality benchmarks. Academically credible.
- **AMA** (ama.org) — American Marketing Association. Less methodology, more marketing thought leadership; useful for the story-angles side of Premise.
- **Insights Association** (insightsassociation.org) — US-focused industry body; publishes annual reports.
- **WARC** (warc.org) — paid for the database, but *publishes free reports* on annual themes. Read the free corner only.
- **The Advertising Research Foundation** (thearf.org) — publishes methodology white papers in advertising research.

"For each, look for: 'methodology guides', 'industry standards', 'code of conduct', 'yearly trends report'. These are usually published openly with attribution permitted. The members-only research is *not* in this category — don't go there."

**Why it bites.** The methodologist taskforce in `TASKFORCE_CRITIQUE.md` (critique 1) flagged that Premise's variant taxonomy conflates axes. Having ESOMAR / AAPOR methodology guides in the corpus means that the *next* time a Premise hypothesis or question references methodology, the bot can cite an industry standard. That immediately defuses the "is this product methodologically literate?" question.

**What Aaron should do.**
- Email ESOMAR, MRS, and AAPOR communications offices: "I'm building a research-tool corpus and would like to ingest your publicly-published methodology guides. Confirming written permission to do so under attribution."
- Most will say yes within a week. Get it in writing.
- Ingest: ~10 methodology pieces from each, ~30 total.

---

## 4. The Senior Agency Partner

*Imagined as: 25-year MD at Ipsos / Kantar / Nielsen / GfK, sat through every Cannes Lions panel, has personally killed 200 bad ideas. Returning expert from the product critique.*

**What he'd say.** "Your corpus has a credibility problem if it's all academic papers and trade association methodology. Working researchers read *agencies' free-content publications* every week — the syndicated industry reports, the trends pieces, the case studies the big consultancies publish to win business.

"Sources that punch above their weight:

- **Kantar BrandZ** — annual global brand valuation report. Free PDF. Published every year.
- **Ipsos Global Trends** — annual. Free.
- **GWI** (formerly GlobalWebIndex) — publishes a *very* generous free-tier of trends reports.
- **YouGov** — daily polling data, frequent free trend pieces.
- **Nielsen Norman Group** — UX research methodology + consumer reports. Free articles.
- **Edelman Trust Barometer** — annual. Free. The single most-cited corporate research piece in PR.
- **PwC / EY / Deloitte / Accenture** — all publish free quarterly / annual consumer surveys.
- **McKinsey Insights** — free articles, especially the consumer / retail / FMCG vertical pieces.
- **BCG Insights** — same.
- **WPP / Publicis / Omnicom annual reports + insights pieces** — surprisingly substantive.

"Each of these is published for *marketing the agency's services*, which means the agency *wants* the content to circulate. Ingesting them under attribution is almost always fine — but read the footer of each PDF for terms. Some say 'free to share with attribution', some say 'all rights reserved'.

"Critical caveat: the value of agency reports decays fast. A 2018 brand-trust trends report is now misleading. Filter for *last 2 years* unless the piece is methodology-shaped (in which case it ages slower)."

**Why it bites.** Without this layer, Premise reads as an academic tool that doesn't know the working world. With it, every Premise hypothesis can cite both peer-reviewed work *and* the working-trade view — exactly the way a senior researcher thinks.

**What Aaron should do.**
- 5 reports per major consultancy / agency × 8 agencies = ~40 documents.
- Recency filter: published in the last 24 months unless evergreen methodology.
- Footer-check every PDF for licensing language before ingesting.

---

## 5. The Government / Public Data Specialist

*Imagined as: 20-year career across ONS, BLS, Eurostat; understands what public statistical bodies publish and how to use it.*

**What she'd say.** "US federal government works are in the public domain by statute. UK Crown Copyright is more nuanced — most government output is under the *Open Government Licence v3*, which is essentially CC-BY-equivalent. The EU's *European Union Open Data Portal* operates similarly. This is the largest source of legally-clean, methodologically-rigorous content that most insights builders ignore.

"Top sources by region:

**US (public domain):**
- **Census Bureau** (census.gov) — demographic + consumer expenditure
- **Bureau of Labor Statistics** (bls.gov) — consumer expenditure survey, employment, time-use
- **Federal Trade Commission** (ftc.gov) — consumer protection reports, advertising studies
- **Federal Reserve consumer surveys** — Survey of Consumer Finances, etc.
- **NIH / HHS consumer health surveys**
- **GAO reports** on consumer-facing topics

**UK (Open Government Licence):**
- **Office for National Statistics** (ons.gov.uk) — *Living Costs and Food Survey*, *Wealth and Assets Survey*, etc.
- **UK Government statistics** (gov.uk/statistics) — published by every department
- **Financial Conduct Authority** (fca.org.uk) — consumer finance research
- **Ofcom** (ofcom.org.uk) — media consumption research, *Communications Market Report*

**EU (CC-BY-equivalent):**
- **Eurostat** (ec.europa.eu/eurostat) — single largest free-to-use European consumer/economic dataset.
- **European Commission consumer reports**

**Other:**
- **Pew Research Center** — *Free*; not public-domain (© Pew) but explicitly permits reproduction with attribution. Premier source for public-opinion + consumer-attitude research.
- **Reuters Institute Digital News Report** — free, annual, comprehensive.
- **OECD reports** — free, multi-country.

"The format challenge is that government statistical reports are PDF-heavy with table-dense content. The retrieval layer (D-031 covers PDF + Mozilla Readability) handles this, but tables don't chunk well — chunk the *summary text* and link the table as a footnote."

**Why it bites.** This is the *base rate* layer. Every hypothesis Premise generates can be cross-referenced against ONS / Census / Pew / Eurostat to check "does this directional claim match the public-data ground truth?". Without it, Premise has no grounding in *what the population actually looks like*.

**What Aaron should do.**
- Pick 2 reports per source × ~8 sources = ~16 government / public-stats documents.
- Bias toward summary documents rather than raw data tables.
- Cover UK + US + EU at minimum; add MENA / India / SEA per Aaron's commercial focus.

---

## 6. The Industry Analyst (Free-Content Edge)

*Imagined as: 10-year career at Forrester / Gartner / GWI; knows exactly which paywall walls have free-content gaps.*

**What he'd say.** "Analyst firms publish a substantial *front-of-house* tier of free content specifically to drive paid subscriptions. That free tier is high-quality, publishable, and almost always fair game with attribution.

"The free corners worth mining:

- **Pew Research** — the gold standard. Everything publishable with attribution. Hundreds of consumer / media / tech / political-attitude reports.
- **Reuters Institute** — annual *Digital News Report*. Free PDF.
- **GWI quarterly trend snapshots** — free.
- **Statista free statistics** (statista.com/statistics) — the free tier; thin but useful.
- **Think With Google** — Google's research arm; free articles, often deep.
- **HubSpot Research** — free reports on marketing + sales.
- **Meta IQ** (facebook.com/business/insights) — free Meta-platform consumer research.
- **Salesforce State of the Consumer / State of Marketing** — annual, free.
- **Adobe Digital Trends** — annual, free.
- **WARC** — *very* selectively free. Most paywalled; ignore.
- **eMarketer / Insider Intelligence** — free preview content only; don't try to get the paywalled stuff.

"Volume note: this is the largest single bucket — easily 100+ reports across these sources. Discipline matters. Filter for: (a) last 18 months, (b) methodology stated explicitly (sample size, fielding), (c) author named (not just 'our team')."

**Why it bites.** The working-researcher 'what's circulating in the market' awareness lives almost entirely here. Without this layer, the corpus has no current-events grounding.

**What Aaron should do.**
- 5 reports per source × ~10 sources = ~50 documents.
- Aggressive recency filter: 12 months for trend pieces, 24 for methodology.
- Author + methodology filter as quality gate.

---

## 7. The PR / Comms Strategist

*Imagined as: senior strategist at a top-5 comms firm; spent a career managing how research firms' brands read in market.*

**What she'd say.** "How the corpus *reads* to a prospect matters as much as what's in it. If the public library is a heterogeneous bag of links, the prospect concludes Premise is built by someone who doesn't curate. If it's a coherent, opinionated, well-described library, the prospect concludes Premise is built by a serious operator.

"Three principles:

1. **The library has a voice.** Each document needs a one-paragraph 'what this is and why it's here' editor's note. Not generated by the bot — written by Aaron. The notes are the *curation layer* the prospect actually evaluates.
2. **Diversity signals seriousness.** A library that's 80% McKinsey blog posts reads as a fan account; a library that mixes academic OA + government data + trade body methodology + agency reports + analyst pieces reads as a serious research base.
3. **Recency is a credibility marker.** Nothing older than 5 years unless it's a methodology classic. Update annually.

"The PR risk: if a journalist or competitor writes 'Premise's public library is mostly recycled HBR articles', the brand takes a hit it can't easily recover from. Pre-empt by curating with a visible editorial filter from day one."

**Why it bites.** This is the one critique that determines whether the corpus *helps* Premise's positioning or undermines it. Same product, vastly different perception based on curation visibility.

**What Aaron should do.**
- Write a one-paragraph editor's note for every public-library document.
- Build a `public_library_curators_note text` field on the documents table for this purpose.
- Aim for ≥6 distinct *categories* of content (academic / government / trade body / agency / analyst / methodology / case study) and surface the category mix in the UI.

---

## 8. The Marketing Academic

*Imagined as: tenured chair in consumer behaviour at a top-30 business school; sits on the editorial board of JCR.*

**What she'd say.** "The academic content most useful for a working-research tool is *not* the latest hot paper at JCR. It's the *foundational* + *methodology* + *meta-analysis* layer.

"Three categories to prioritise:

1. **Methodology foundations.** Likert (1932) on attitude scales, Krosnick on survey design, Schwarz on context effects, Tourangeau on response processes. Most are still in print but the foundational concepts are summarised in CC-licensed teaching materials, MOOCs (e.g. *Coursera Survey Data Collection and Analytics*), and university lecture notes.
2. **Meta-analyses.** Sharp & Romaniuk on brand growth, Anderson on customer satisfaction, Erevelles et al. on emotion in consumer behaviour. Meta-analyses condense decades of work into citable single documents.
3. **Open-access foundational texts.** *How Brands Grow* synopsis-grade content; *Predictably Irrational* and *Thinking Fast and Slow* derived public lectures (TED talks transcribed, MOOCs, Authors@Google).

"The academic tone matters: a hypothesis that cites a methodology classic alongside a brand-tracking report carries credibility neither has alone."

**Why it bites.** Without the foundational layer, Premise's hypotheses can ground in *current data* but not in *the principles by which the data should be interpreted*. Senior researchers can tell the difference instantly.

**What Aaron should do.**
- 10–15 foundational / methodology / meta-analysis pieces. CC-licensed teaching materials are the easiest source.
- Don't ingest entire textbooks. Ingest chapter summaries / abstracts / TED-talk transcripts that condense the core ideas.

---

## 9. The RAG Data Engineer

*Imagined as: built three production RAG systems at AI-native startups; obsessed with chunking quality and source diversity for retrieval.*

**What he'd say.** "A corpus is not a static document set — it's a *retrieval surface*. Same content, badly chunked, retrieves badly. Same content, well-chunked with good metadata, retrieves brilliantly. Optimise for the latter.

"Four engineering principles:

1. **Source diversity beats source volume.** Eighty similar agency reports retrieve worse than 30 diverse pieces (academic + gov + trade + analyst + agency). Embeddings cluster; diverse sources spread the cluster.
2. **Metadata is half the retrieval signal.** Every document needs: `source_type` (academic / gov / agency / etc.), `publication_year`, `geography` (global / US / UK / EU / MENA), `topic_tags` (brand-tracking, qual-methods, retail, etc.). The retrieval layer can then filter *before* embedding-search, dramatically improving relevance.
3. **Chunk boundaries respect document structure.** Premise already does paragraph-aware chunking (D-015). For long PDFs (government stats reports, agency white papers), this matters more than for short blog posts.
4. **Provenance fields enable filtered retrieval.** If a researcher asks 'what does the *academic* literature say about price sensitivity', the bot should be able to retrieve only `source_type='academic'`. That's a UI layer on top of metadata — but only works if metadata is populated.

"On volume: a 200-document corpus that's well-tagged retrieves better than a 2000-document corpus that isn't. Quality > quantity is not a cliche here, it's a retrieval-math truth (cosine similarity in a high-dimensional embedding space gets noisier as corpus grows without proportional source-diversity gain)."

**Why it bites.** Same content, two outcomes: a corpus that retrieves the most relevant chunks on every query, or one that retrieves the same three blog posts to every question. The difference is metadata + diversity discipline.

**What Aaron should do.**
- Add metadata fields to the documents table: `source_type`, `publication_year`, `geography`, `topic_tags text[]`.
- Populate during ingestion (manual, since LLM-extracted metadata is unreliable on long docs).
- Target 6–10 distinct `source_type` values with at least 10 documents each.

---

## 10. The Editor / Content Curator

*Imagined as: 20-year career as commissioning editor at a top business book imprint; ran a research-summarisation startup.*

**What she'd say.** "A library without a voice is a heap. The choice of what *not* to include is more visible than the choice of what to include. Three editorial disciplines:

1. **Reading order.** The library should have a recommended first-read path — five pieces a new user reads to understand the corpus shape. Without that, every user starts cold.
2. **Description language.** Every document's curator note should follow a consistent voice (Aaron's voice, from `DECISIONS.md`). Researcher-to-researcher tone, not marketing-to-prospect.
3. **Renewal cadence.** The library needs a quarterly review: what got cited most, what got cited least, what's older than 24 months and shouldn't be. Public libraries that don't refresh age fast.

"The taste signal is the curation. A corpus of 200 documents with thoughtful curator notes reads as 'serious'. A corpus of 2000 documents with no notes reads as 'scraped'."

**Why it bites.** This is the soft layer that determines whether the public library is *Premise's moat* (because Aaron's curation is the IP) or *Premise's commodity* (because the content is the same as anyone else could scrape).

**What Aaron should do.**
- Define 5 "start here" recommended documents — surface them prominently in the UI.
- Write every curator note in your own voice (no AI-generated curator notes).
- Calendar a quarterly review (90 minutes, every quarter).

---

## The synthesis

Reading all ten experts together, six themes recur. These are the actual decisions to make before sourcing the first document:

1. **Legal-bucket-tracking is non-negotiable.** Add `licence`, `licence_url`, `source_type`, `publication_year`, `geography`, `topic_tags`, `curators_note` fields to the documents table. Without these, you can't tell safe from risky a year from now.
2. **Diversity > volume.** A target of ~200 well-curated documents across 6+ source types beats a 2000-document scrape every time.
3. **Five buckets to source from, in order of effort-to-value ratio:** (i) Government public domain → fastest, safest; (ii) Trade association methodology → request permission, granted within a week; (iii) Agency free-tier reports → footer-check each; (iv) Academic OA → time-consuming to curate but highest credibility per document; (v) Industry-analyst free tier → highest volume, recency-critical.
4. **Curator notes are the moat.** Without them, the corpus is just a list of public PDFs anyone could assemble. With them, it's *your* curation.
5. **No client content, ever.** Even anonymised, even paraphrased — agency-confidential work product is not yours to publish.
6. **Region matters.** Aaron's commercial focus likely tilts MENA / India / global. Don't over-weight US sources. Include Eurostat, ONS, GCC government data sources, India NSS.

## Sourcing matrix (target: ~200 documents across 6–8 weeks)

| Bucket | Target count | Effort | Legal risk | Quality signal |
|---|---|---|---|---|
| US federal government (public domain) | 12 | Low | None | High |
| UK ONS + government (OGL v3) | 8 | Low | None | High |
| EU / Eurostat | 5 | Low | None | Medium-high |
| MENA / India / regional gov data | 8 | Medium | Low (per-source check) | Medium |
| Pew + Reuters Institute (attribution-permitted) | 15 | Low | Low (read terms) | High |
| Trade associations (ESOMAR / MRS / AAPOR / AMA — with permission email) | 25 | Medium (one-week email cycle) | Low (with written permission) | High |
| Academic OA (SSRN / PLOS / institutional repos) | 30 | High (curation-heavy) | None | Very high |
| Analyst free-tier (Forrester / GWI / Statista / Think With Google / etc.) | 50 | Low (volume-heavy) | Low (footer-check) | Medium |
| Agency free reports (Kantar / Ipsos / Nielsen / Edelman / McKinsey / etc.) | 35 | Low | Low (footer-check) | Medium-high |
| Methodology foundations (academic + MOOC + TED transcripts) | 15 | High | Low (CC-licensed teaching content only) | Very high |
| **Total** | **~203** | | | |

## The six-week build sequence

**Week 1 — Foundations.**
- Add `licence`, `licence_url`, `source_type`, `publication_year`, `geography`, `topic_tags`, `curators_note` fields to the documents table (migration 0013).
- Update `scripts/seed-public-library.ts` to accept and require these fields.
- Build a one-page `docs/PUBLIC_CORPUS_LICENSING.md` tracker.
- Source: 20 US + UK government documents. Lowest-friction starting point.

**Week 2 — Trade body permissions.**
- Email ESOMAR, MRS, AAPOR, AMA, Insights Association with permission requests. Get written confirmations.
- While waiting, source: 20 Pew Research + Reuters Institute documents.

**Week 3 — Academic OA curation.**
- Block 1 day for SSRN + PLOS + Google Scholar search.
- Target 30 academic papers across consumer behaviour, qual methods, attitude–behaviour gap, panel methodology.
- Filter aggressively: last 5 years, ≥20 citations, methodology stated.

**Week 4 — Agency + analyst free tier.**
- Ingest the trade-body methodology pieces (now permissions granted).
- Source 40 agency + analyst reports. Footer-check every PDF.

**Week 5 — Methodology foundations + regional.**
- Source 15 methodology foundations (academic chapters, CC teaching materials, TED transcripts).
- Source 10 MENA / India / regional documents.

**Week 6 — Curation + UI surfacing.**
- Write curator notes for every document (Aaron's voice).
- Define and surface the 5 "start here" documents.
- Build a public-library UI tab that shows category mix + recency.
- Sanity-check: retrieval quality on 10 test queries spanning the full corpus.

## Red flags — what NOT to do

1. **Don't anonymise client work and ingest it.** Even paraphrased. Even with names changed. The work product belongs to the client or the agency. Reputational + legal exposure that's not worth one extra document.
2. **Don't scrape paywalled content.** WARC, Mintel, Euromonitor, eMarketer — paywalled means paywalled. Don't.
3. **Don't ingest "anonymous research findings" PDFs from LinkedIn DMs.** If a source isn't attributable, it isn't trustworthy.
4. **Don't generate curator notes with the bot.** Defeats the purpose — the curation *is* the moat. AI-generated notes read identically to AI-generated notes on every other corpus.
5. **Don't include >5-year-old content unless it's a methodology classic.** Trends pieces age out of relevance fast.
6. **Don't ingest entire textbooks.** Chunk into chapter summaries or abstract + intro + discussion + conclusion. Methods sections rarely retrieve well out of context.
7. **Don't skip the licence field.** Every document needs provenance. Without it, takedown response is impossible.
8. **Don't mix attribution-permitted content with unattributed snippets.** Confusion about which is which is what kills the corpus when challenged.
9. **Don't include forum posts, Reddit, or Quora.** Looks like content; reads as noise; carries IP risk because user-generated content has its own licence chain.
10. **Don't go silent on the corpus for >90 days.** Public libraries that aren't refreshed age fast.

## Where Aaron's existing seed-public-library script fits

`scripts/seed-public-library.ts` is the right architecture — the public library *is* a seeded set, not user-uploaded. The build sequence above is what populates that script. Each week's sourcing produces a new batch added to the script's seed-list. The script stays the canonical source-of-truth for the public corpus's content.

The migration suggested in week 1 (adding metadata fields) is additive to the existing schema — no breaking change. The seed script just gets a few more fields per entry.

## Recommended next move

**Do week 1 first, before anything else.** Build the metadata fields, the licensing tracker, and ingest the 20 US + UK government documents. That gives you:

1. The schema scaffolding the rest of the corpus needs.
2. A real, legally-clean starting set you can show prospects this week.
3. A pattern (one document, one curator note, one licence URL) the rest of the build follows.

Then run weeks 2–6 in parallel with the audit-1 items (#15, #17, #21) we just aligned on. The corpus build is mostly *editorial* work (curation, sourcing) rather than engineering; it can run alongside the eval-probe + UI work without blocking it.

---

## How to use this document

- **Don't publish the taskforce itself.** Internal strategy. Publishing it would read as a "look how seriously we curate" performance.
- **Pre-write a one-paragraph public description** of the corpus shape — "Premise's public library is curated across academic OA, government public-data, trade-body methodology, and free-tier industry-analyst content, with provenance tracking on every chunk." That's a LinkedIn-comment-defendable position.
- **Re-run the taskforce in six months** after the corpus crosses ~200 documents. The next round's experts (a regional specialist, a sector specialist, a UX researcher) will be different.
- **Track outcomes** quarterly: which sources get cited most in real user queries; which never get cited (probably out-of-scope or poorly chunked).
