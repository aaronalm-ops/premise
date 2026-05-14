# Premise — Public Corpus Shopping List

> A concrete list of named, real, publicly-available reports the taskforce recommends ingesting into the public library. Each entry is a specific publication — not a category — so you can paste the Perplexity prompt and get back the latest official URL + a confirmation that it's still publicly available.
>
> ~100 named picks across 7 buckets. Enough to credibly populate ~50% of the 200-doc target; the rest comes from Perplexity-discovered work in the same buckets using the search-prompt patterns at the end.

---

## How to use this list

For each pick:

1. **Paste the Perplexity prompt** verbatim. Perplexity returns the official URL + the latest edition + confirmation of licence terms.
2. **Read the footer of the PDF** (or the "terms of use" page on the publisher's site). Look for one of: *"All rights reserved"* (don't ingest), *"Free to share with attribution"* (ingest with attribution), *"Creative Commons"* (ingest with the specific CC sub-licence noted), *"Public domain"* / *"US federal government work"* (ingest freely), *"Open Government Licence"* (ingest with attribution).
3. **Save the PDF + a snapshot of the licence statement together** in the same folder. The licence statement is your audit trail if the publisher's site ever changes.
4. **Tag** with the metadata fields (`source_type`, `publication_year`, `geography`, `topic_tags`, `licence`) before adding to `scripts/seed-public-library.ts`.

**Vetting heuristic:** if Perplexity can't find an explicit licence/terms statement within two clicks, treat the source as ambiguous and either email the publisher or skip.

---

## Bucket 1 — US Federal Government (public domain, ~10 picks)

All US federal government works are in the public domain by statute (17 U.S.C. § 105). No licence needed; attribution is courtesy.

- **Consumer Expenditure Survey (CES)** — US Bureau of Labor Statistics. Annual. The base-rate ground truth for what US households spend.
  *Perplexity:* `find the latest BLS Consumer Expenditure Survey annual report PDF and the BLS public-domain statement`

- **Current Population Survey (CPS) — Annual Social and Economic Supplement** — US Census Bureau. Demographics + household composition baseline.
  *Perplexity:* `find the latest US Census ASEC report PDF download link`

- **Survey of Consumer Finances (SCF)** — US Federal Reserve. Triennial. Wealth and household-finance ground truth.
  *Perplexity:* `find the latest US Federal Reserve Survey of Consumer Finances summary report PDF`

- **Survey of Household Economics and Decisionmaking (SHED)** — US Federal Reserve. Annual. Consumer confidence + financial well-being.
  *Perplexity:* `find the latest US Federal Reserve SHED Economic Well-Being of U.S. Households report PDF`

- **Making Ends Meet survey** — US CFPB (Consumer Financial Protection Bureau). Recurring. Financial behaviours and credit attitudes.
  *Perplexity:* `find the latest CFPB Making Ends Meet survey report PDF`

- **National Health and Nutrition Examination Survey (NHANES) summary** — US CDC. Useful as health-attitudes baseline for any wellness-adjacent brief.
  *Perplexity:* `find the latest CDC NHANES findings summary report PDF`

- **Behavioral Risk Factor Surveillance System (BRFSS) — annual summary** — US CDC. Health behaviours at state-level granularity.
  *Perplexity:* `find the latest CDC BRFSS annual summary report PDF`

- **FTC Consumer Sentinel Network Data Book** — US Federal Trade Commission. Annual. Consumer complaints baseline — useful for risk / category-pain analysis.
  *Perplexity:* `find the latest FTC Consumer Sentinel Network Data Book PDF`

- **GAO reports on consumer-facing industries** — Government Accountability Office. Topic-specific, multiple per year.
  *Perplexity:* `find the most recent GAO reports on consumer protection, auto, telecom, or financial services published in the last 24 months`

- **National Telecommunications and Information Administration (NTIA) Internet Use Survey** — US Department of Commerce. Bi-annual.
  *Perplexity:* `find the latest NTIA Internet Use Survey report PDF`

---

## Bucket 2 — UK Government (Open Government Licence v3, ~10 picks)

UK's OGL v3 is essentially CC-BY-equivalent. Ingest freely with attribution to the publishing body.

- **Living Costs and Food Survey** — UK ONS. Annual. UK consumer expenditure baseline.
  *Perplexity:* `find the latest UK ONS Living Costs and Food Survey report PDF`

- **Wealth and Assets Survey** — UK ONS. Longitudinal, bi-annual. UK household-wealth ground truth.
  *Perplexity:* `find the latest UK ONS Wealth and Assets Survey report PDF`

- **Opinions and Lifestyle Survey (OPN)** — UK ONS. Regular themed reports on current public attitudes.
  *Perplexity:* `find the latest UK ONS Opinions and Lifestyle Survey themed reports PDF, published in the last 12 months`

- **Public attitudes to ONS statistics — Public Confidence in Official Statistics survey** — UK Office for Statistics Regulation. Annual.
  *Perplexity:* `find the latest UK Office for Statistics Regulation Public Confidence in Official Statistics report PDF`

- **Financial Lives Survey** — UK Financial Conduct Authority (FCA). Triennial. UK consumer-finance ground truth.
  *Perplexity:* `find the latest FCA Financial Lives Survey report PDF`

- **Communications Market Report** — Ofcom. Annual. UK telecoms / broadcasting / digital baseline.
  *Perplexity:* `find the latest Ofcom Communications Market Report PDF`

- **Online Nation report** — Ofcom. Annual. UK online consumer behaviour baseline.
  *Perplexity:* `find the latest Ofcom Online Nation report PDF`

- **Adults' Media Use and Attitudes** — Ofcom. Annual. UK media-consumption + media-literacy.
  *Perplexity:* `find the latest Ofcom Adults Media Use and Attitudes report PDF`

- **Children and Parents Media Use and Attitudes** — Ofcom. Annual.
  *Perplexity:* `find the latest Ofcom Children and Parents Media Use and Attitudes report PDF`

- **UK Department for Business and Trade — Consumer protection research** — recurring.
  *Perplexity:* `find the latest UK Department for Business and Trade consumer protection research reports published in the last 24 months`

---

## Bucket 3 — EU / Eurostat / Eurobarometer (CC-BY equivalent, ~7 picks)

Eurostat and EU institutions release under terms equivalent to CC-BY. Attribution required; commercial use permitted.

- **Eurobarometer Standard surveys** — European Commission. Bi-annual. Pan-EU public-opinion baseline.
  *Perplexity:* `find the latest Eurobarometer Standard survey report PDF`

- **Eurobarometer Special surveys (on consumer attitudes, digital, sustainability, AI)** — European Commission. Topic-specific, multiple per year.
  *Perplexity:* `find the latest Eurobarometer Special surveys on AI, consumer attitudes, and sustainability published in the last 18 months`

- **Eurostat — Digital economy and society statistics** — European Commission. Annual.
  *Perplexity:* `find the latest Eurostat Digital economy and society statistics report PDF`

- **Eurostat — Household consumption expenditure** — annual.
  *Perplexity:* `find the latest Eurostat Household consumption expenditure report PDF`

- **European Consumer Conditions Scoreboard** — European Commission DG Justice and Consumers. Bi-annual.
  *Perplexity:* `find the latest European Consumer Conditions Scoreboard PDF`

- **EU Kids Online survey** — pan-European child internet use study.
  *Perplexity:* `find the latest EU Kids Online report PDF`

- **OECD Society at a Glance** — annual cross-country social indicators.
  *Perplexity:* `find the latest OECD Society at a Glance report PDF`

---

## Bucket 4 — Attribution-permitted think tanks (~12 picks)

Not public domain — © to publisher — but explicitly allow reproduction with attribution under their published terms.

### Pew Research Center

Pew permits free reproduction of their reports with attribution; this is one of the cleanest English-language consumer-attitudes sources available.

- **Mobile Fact Sheet** — Pew. Annual. US mobile adoption baseline.
  *Perplexity:* `find the latest Pew Research Center Mobile Fact Sheet page and confirm attribution policy`

- **Social Media Fact Sheet** — Pew. Annual.
  *Perplexity:* `find the latest Pew Research Center Social Media Fact Sheet page`

- **Internet/Broadband Fact Sheet** — Pew. Annual.
  *Perplexity:* `find the latest Pew Research Center Internet Broadband Fact Sheet page`

- **News Consumption / News Platform Fact Sheet** — Pew. Annual.
  *Perplexity:* `find the latest Pew Research News Platform Fact Sheet page`

- **Public attitudes toward AI** — Pew. Recurring, multiple reports.
  *Perplexity:* `find the latest Pew Research reports on public attitudes toward artificial intelligence, published 2023-2025`

- **Religious Landscape Study** — Pew. Decennial; affects any culture / values brief.
  *Perplexity:* `find the latest Pew Research Religious Landscape Study summary PDF`

- **Global Attitudes Surveys** — Pew Global. Multi-country, multi-topic.
  *Perplexity:* `find recent Pew Research Global Attitudes Survey reports on technology, democracy, or economic attitudes, last 24 months`

- **Trust, Facts and Democracy series** — Pew. Recurring.
  *Perplexity:* `find recent Pew Research reports in the Trust Facts and Democracy series`

### Reuters Institute (University of Oxford)

CC-BY licensed. Highest-quality news-and-media consumer research available free.

- **Digital News Report** — Reuters Institute. Annual. Single most-cited media-consumption study globally.
  *Perplexity:* `find the latest Reuters Institute Digital News Report PDF and confirm CC-BY licence`

- **Journalism, Media and Technology Trends and Predictions** — Reuters Institute. Annual.
  *Perplexity:* `find the latest Reuters Institute Journalism Media Technology Trends Predictions report PDF`

### Other think tanks

- **Edelman Trust Barometer** — Edelman. Annual since 2001. The single most-cited corporate-research piece in PR/comms. Free with attribution.
  *Perplexity:* `find the latest Edelman Trust Barometer Global Report PDF and confirm attribution policy`

- **Nielsen Norman Group methodology articles** — extensive free archive of UX research methodology.
  *Perplexity:* `find Nielsen Norman Group articles on qualitative research methodology, usability testing, and survey design`

---

## Bucket 5 — Trade body methodology (with permission email, ~10 picks)

These are the *highest-credibility* documents for the methodology side of the corpus. Email each body's communications office first; written permission usually granted within a week.

- **ESOMAR Global Market Research Report** — ESOMAR. Annual industry-state report.
  *Perplexity:* `find the latest ESOMAR Global Market Research Report PDF and access terms`

- **ESOMAR/GRBN Guidelines** — multiple methodology guidance documents (online research, social media research, mobile, AI).
  *Perplexity:* `find the latest ESOMAR/GRBN guidelines on online research, social media research, and AI in market research`

- **ICC/ESOMAR International Code on Market, Opinion and Social Research and Data Analytics** — the global ethical code for the industry.
  *Perplexity:* `find the latest ICC/ESOMAR International Code on Market, Opinion and Social Research PDF`

- **ESOMAR 28 Questions to Help Buyers of Online Samples** — methodology benchmark for evaluating panel quality.
  *Perplexity:* `find ESOMAR 28 Questions to Help Buyers of Online Samples PDF latest edition`

- **MRS Code of Conduct** — Market Research Society (UK).
  *Perplexity:* `find latest MRS Market Research Society Code of Conduct PDF`

- **MRS Best Practice Guides** — multiple methodology guides on questionnaire design, sampling, qualitative methods.
  *Perplexity:* `find MRS Best Practice Guides on questionnaire design and qualitative research`

- **AAPOR Standard Definitions** — the canonical reference for survey response-rate calculation.
  *Perplexity:* `find AAPOR Standard Definitions Final Dispositions of Case Codes PDF latest edition`

- **AAPOR Code of Professional Ethics and Practices** — survey research ethics standard.
  *Perplexity:* `find AAPOR Code of Professional Ethics and Practices PDF`

- **AAPOR Task Force Reports** — substantive methodology papers on weighting, non-probability samples, online panels, election polling.
  *Perplexity:* `find AAPOR Task Force reports on non-probability samples, weighting, and online panels`

- **The ARF Research Quality Framework** — Advertising Research Foundation. Methodology-quality benchmark for advertising research.
  *Perplexity:* `find The ARF Research Quality Framework PDF`

---

## Bucket 6 — Agency free-tier reports (~20 picks)

Footer-check every PDF for licence language. Most allow attribution; some say "All rights reserved" (don't ingest those).

### Kantar

- **Kantar BrandZ Most Valuable Global Brands** — annual. The single most-cited free brand-equity ranking.
  *Perplexity:* `find the latest Kantar BrandZ Most Valuable Global Brands report PDF`

- **Kantar Media Reactions** — annual. Free.
  *Perplexity:* `find the latest Kantar Media Reactions annual report PDF`

- **Kantar Sustainability Sector Index / Sustainable Transformation Practice reports** — annual.
  *Perplexity:* `find the latest Kantar Sustainability Sector Index report PDF`

### Ipsos

- **Ipsos Global Trends Survey** — multi-year cross-country.
  *Perplexity:* `find the latest Ipsos Global Trends survey report PDF`

- **Ipsos What Worries the World** — monthly cross-country tracker.
  *Perplexity:* `find the latest Ipsos What Worries the World monthly report PDF`

- **Ipsos AI Monitor** — annual. Cross-country public attitudes toward AI.
  *Perplexity:* `find the latest Ipsos AI Monitor report PDF`

### Edelman, Nielsen, GfK

- **Edelman Trust at Work** — annual.
  *Perplexity:* `find the latest Edelman Trust at Work report PDF`

- **Nielsen Global Trust in Advertising** — recurring.
  *Perplexity:* `find the latest Nielsen Global Trust in Advertising report PDF`

- **Nielsen Annual Marketing Report** — annual.
  *Perplexity:* `find the latest Nielsen Annual Marketing Report PDF`

### Consultancies (free-tier)

- **Deloitte Global State of the Consumer Tracker** — quarterly.
  *Perplexity:* `find the latest Deloitte Global State of the Consumer Tracker report PDF`

- **Deloitte Global Marketing Trends** — annual.
  *Perplexity:* `find the latest Deloitte Global Marketing Trends report PDF`

- **PwC Global Consumer Insights Pulse Survey** — bi-annual.
  *Perplexity:* `find the latest PwC Global Consumer Insights Pulse Survey report PDF`

- **EY Future Consumer Index** — quarterly.
  *Perplexity:* `find the latest EY Future Consumer Index report PDF`

- **McKinsey ConsumerWise / Consumer Pulse** — recurring articles + reports.
  *Perplexity:* `find recent McKinsey ConsumerWise and US Consumer Pulse research articles, last 12 months`

- **BCG Consumer Insights / Center for Customer Insight reports** — recurring.
  *Perplexity:* `find recent BCG Center for Customer Insight reports on consumer behaviour, last 18 months`

- **Accenture Life Trends** — annual (formerly Fjord Trends).
  *Perplexity:* `find the latest Accenture Life Trends report PDF`

- **Capgemini Research Institute reports on consumer behaviour** — multiple per year.
  *Perplexity:* `find recent Capgemini Research Institute consumer-behaviour reports, last 18 months`

- **Bain & Company — Loyalty / NPS / consumer reports** — recurring.
  *Perplexity:* `find recent Bain & Company consumer-loyalty and Net Promoter Score research reports`

### Holding companies' insights arms

- **WPP / Choreograph / Mindshare insights pieces** — multiple annual.
  *Perplexity:* `find recent WPP, Choreograph, and Mindshare insights reports on consumer behaviour and media, last 12 months`

- **Publicis Sapient — Digital Consumer Report** — recurring.
  *Perplexity:* `find recent Publicis Sapient Digital Consumer reports`

---

## Bucket 7 — Industry-analyst free tier (~25 picks)

Highest-volume bucket. Recency is critical (12–18 months max). Most permit attribution; footer-check.

### Annual State-of-X reports (all free)

- **Salesforce State of Marketing** — annual.
  *Perplexity:* `find the latest Salesforce State of Marketing report PDF`

- **Salesforce State of the Connected Customer** — annual.
  *Perplexity:* `find the latest Salesforce State of the Connected Customer report PDF`

- **Salesforce State of Sales** — annual.
  *Perplexity:* `find the latest Salesforce State of Sales report PDF`

- **HubSpot State of Marketing** — annual.
  *Perplexity:* `find the latest HubSpot State of Marketing report PDF`

- **HubSpot State of Sales / State of AI in Marketing** — annual.
  *Perplexity:* `find the latest HubSpot State of AI in Marketing report PDF`

- **Adobe Digital Trends** — annual (with Econsultancy).
  *Perplexity:* `find the latest Adobe Digital Trends report PDF`

- **Adobe State of Digital Customer Experience** — annual.
  *Perplexity:* `find the latest Adobe Digital Customer Experience report PDF`

- **SAP Customer Experience LIVE / X-Data reports** — annual.
  *Perplexity:* `find recent SAP Customer Experience and X-Data reports`

- **Qualtrics State of CX / Consumer Trends** — annual.
  *Perplexity:* `find the latest Qualtrics State of Customer Experience and Consumer Trends report PDF`

### Trend reports

- **Wunderman Thompson Future 100** — annual. 100 trends across categories.
  *Perplexity:* `find the latest Wunderman Thompson Future 100 report PDF`

- **WGSN consumer trend reports** — selective free content.
  *Perplexity:* `find WGSN free consumer trend reports`

- **Mintel Global Consumer Trends** — annual. Free summary tier only.
  *Perplexity:* `find Mintel Global Consumer Trends free annual summary report PDF`

- **TrendWatching reports / Trend Briefings** — multiple per year, free.
  *Perplexity:* `find recent TrendWatching Trend Briefings, last 12 months`

### Google / Meta / TikTok / Pinterest

- **Think With Google annual insights reports** — multiple.
  *Perplexity:* `find recent Think With Google consumer-insights and search-trends reports, last 12 months`

- **Google Year in Search report** — annual.
  *Perplexity:* `find the latest Google Year in Search report`

- **Meta Foresight / Meta IQ trend reports** — multiple per year.
  *Perplexity:* `find recent Meta Foresight and Meta IQ consumer-research reports`

- **TikTok What's Next Trend Report** — annual.
  *Perplexity:* `find the latest TikTok What's Next Trend Report PDF`

- **Pinterest Predicts report** — annual.
  *Perplexity:* `find the latest Pinterest Predicts annual trend report PDF`

### Research data shops

- **GWI Connecting the Dots / quarterly trend snapshots** — free tier.
  *Perplexity:* `find the latest GWI Connecting the Dots and free quarterly trend reports PDF`

- **Statista Consumer Insights free reports** — selective free tier.
  *Perplexity:* `find Statista Consumer Insights free reports`

- **YouGov International FMCG / Brand reports** — selective free.
  *Perplexity:* `find recent YouGov free consumer-brand reports, last 12 months`

### Sector-specific

- **CB Insights State of Venture / State of AI** — free summary tier.
  *Perplexity:* `find the latest CB Insights State of Venture and State of AI free summary reports`

- **Andreessen Horowitz / a16z Big Ideas in Consumer / annual themes** — free.
  *Perplexity:* `find recent a16z Big Ideas in Consumer or annual themes essays`

- **GlobalData / EMARKETER free reports** — selective.
  *Perplexity:* `find recent EMARKETER free reports on consumer technology and retail`

- **IAB (Interactive Advertising Bureau) Internet Advertising Revenue Report** — annual.
  *Perplexity:* `find the latest IAB Internet Advertising Revenue Report PDF`

---

## Bucket 8 — Academic open-access (search prompts, target ~30 papers)

Rather than naming specific papers, use these themed search prompts. Each returns 5–10 candidates; pick the highest-cited, most recent ones.

- *Perplexity:* `list the top 10 open-access papers on the attitude-behaviour gap in consumer research, last 5 years, with more than 30 Google Scholar citations. Include title, author, year, DOI, journal, and open-access URL`

- *Perplexity:* `list the top 10 open-access papers on social desirability bias in survey research methodology, last 7 years, with citations. Include title, author, year, DOI, journal, and open-access URL`

- *Perplexity:* `list the top 10 open-access papers on stated versus revealed preference in consumer behaviour, last 5 years, with citations`

- *Perplexity:* `list the top 10 open-access papers on questionnaire design, response option order, and primacy/recency effects, last 7 years, with citations`

- *Perplexity:* `list the top 10 open-access papers on online panel quality and non-probability sample weighting, last 5 years, with citations`

- *Perplexity:* `list the top 10 open-access papers on qualitative research saturation, depth-interview methodology, and thematic analysis, last 5 years, with citations`

- *Perplexity:* `list the top 10 open-access papers on projective techniques in qualitative consumer research, last 10 years, with citations`

- *Perplexity:* `list the top 10 open-access papers on brand trust measurement and validated scales, last 5 years, with citations`

- *Perplexity:* `list the top 10 open-access papers on customer experience measurement, NPS validation, and CSAT methodology, last 5 years, with citations`

- *Perplexity:* `list the top 10 open-access papers on choice-based conjoint analysis and MaxDiff scaling, last 5 years, with citations`

- *Perplexity:* `list recent open-access SSRN working papers on consumer trust, AI adoption, and decision-making, last 24 months`

- *Perplexity:* `list recent open-access papers in PLOS ONE on consumer behaviour, marketing methodology, or social-research methods, last 24 months`

---

## Bucket 9 — Methodology foundations (~15 picks)

Classic methodology pieces. Some are pre-1928 public domain; some are CC-licensed teaching materials; some are explicitly free-to-read academic papers.

- **Likert, R. (1932) — A Technique for the Measurement of Attitudes** — pre-1928 / public domain. The original Likert scale paper.
  *Perplexity:* `find the original 1932 Likert "A Technique for the Measurement of Attitudes" paper PDF, public domain`

- **Schwarz, N. (1999) — Self-reports: How the questions shape the answers** — *American Psychologist*. Frequently free.
  *Perplexity:* `find Schwarz 1999 "Self-reports: How the questions shape the answers" American Psychologist PDF`

- **Krosnick, J. A. — Survey methodology papers** — multiple foundational pieces on response-order effects, satisficing.
  *Perplexity:* `find Jon Krosnick open-access papers on survey response-order effects and satisficing`

- **Tourangeau, Rips, Rasinski — The Psychology of Survey Response** — book; selected free chapters and review-article-form summaries available.
  *Perplexity:* `find open-access summaries or review articles of Tourangeau Rips Rasinski Psychology of Survey Response`

- **Sharp, B. & Romaniuk, J. — How Brands Grow methodology papers** — academic versions of the book's claims, published in *Marketing Science* and *JMR*.
  *Perplexity:* `find Byron Sharp and Jenni Romaniuk open-access papers on double jeopardy law, brand growth, and mental availability, with citations`

- **Kahneman & Tversky — Prospect Theory (1979)** — *Econometrica*. Foundational; widely available free.
  *Perplexity:* `find Kahneman Tversky 1979 Prospect Theory paper PDF`

- **Ehrenberg, A. S. C. — Repeat-Buying papers** — foundational consumer-loyalty work.
  *Perplexity:* `find Andrew Ehrenberg open-access papers on repeat buying and double jeopardy`

- **Reichheld, F. — The Net Promoter System / NPS validation papers** — multiple, free.
  *Perplexity:* `find Frederick Reichheld and Bain papers on Net Promoter Score validation and methodology`

- **Coursera / edX MOOC course material on survey design and consumer research** — CC-licensed teaching materials.
  *Perplexity:* `find Coursera or edX CC-licensed lecture materials on survey research design and consumer behaviour`

- **AAPOR Task Force Report on Online Panels (2010)** — landmark methodology piece.
  *Perplexity:* `find AAPOR 2010 Task Force Report on Online Panels PDF`

- **TED Talks transcripts** — Dan Ariely, Daniel Kahneman, Rory Sutherland, Hans Rosling (transcripts CC-BY-NC; *check usage permitted for non-commercial educational corpus*).
  *Perplexity:* `find TED Talk transcripts by Dan Ariely, Daniel Kahneman, Rory Sutherland, and Hans Rosling on consumer behaviour and statistics. Confirm CC licence terms for transcripts`

- **Authors@Google talk transcripts on consumer / behavioural-science books** — available on YouTube with auto-generated transcripts.
  *Perplexity:* `find Authors@Google YouTube talks on consumer behaviour and behavioural economics. Confirm transcript permissions`

---

## Bucket 10 — Regional sources (MENA / India / SEA, ~10 picks)

Where Aaron's commercial focus likely lies. Less English-language depth than US/UK/EU; the picks below are the ones with strong publication discipline.

### MENA / GCC

- **Saudi Arabia GASTAT (General Authority for Statistics) — Household Expenditure and Income Survey** — annual.
  *Perplexity:* `find latest Saudi Arabia GASTAT Household Expenditure and Income Survey report PDF`

- **UAE Federal Competitiveness and Statistics Centre — household and consumer surveys** — periodic.
  *Perplexity:* `find recent UAE FCSC household consumer expenditure and lifestyle survey reports`

- **Arab Barometer** — multi-country MENA public-attitudes tracker. CC-licensed.
  *Perplexity:* `find the latest Arab Barometer wave report PDF and confirm CC licence`

- **YouGov MENA reports** — selective free.
  *Perplexity:* `find recent YouGov MENA free consumer reports`

- **Ipsos MENA reports** — selective free.
  *Perplexity:* `find recent Ipsos MENA free consumer reports`

### India

- **NSSO (National Sample Survey Office) — Household Consumer Expenditure Survey** — periodic; latest 2022-23 release.
  *Perplexity:* `find latest Indian NSSO Household Consumer Expenditure Survey report PDF`

- **RBI Consumer Confidence Survey** — quarterly.
  *Perplexity:* `find the latest RBI Reserve Bank of India Consumer Confidence Survey report PDF`

- **LocalCircles surveys on Indian consumer behaviour** — frequent, free, broad topical coverage.
  *Perplexity:* `find recent LocalCircles consumer surveys on Indian household and digital behaviour, last 18 months`

- **Kantar India and Nielsen India reports** — selective free.
  *Perplexity:* `find recent Kantar India and Nielsen India free consumer reports, last 18 months`

### SEA / Asia-Pacific

- **Singapore Statistics Department — Household Expenditure Survey** — quinquennial.
  *Perplexity:* `find the latest Singapore Department of Statistics Household Expenditure Survey report PDF`

- **ASEANstats consumer indicators** — multi-country.
  *Perplexity:* `find ASEANstats consumer indicators and household statistics reports`

---

## Search-prompt patterns (use for everything not on this list)

Reusable Perplexity templates for finding more in any of the buckets:

- **Find a specific report:** `find the latest [Publisher] [Report Name] [Year if known] PDF and confirm the licence / attribution terms`

- **Find recent in a bucket:** `list recent free [bucket: government / trade body / agency / analyst] reports on [topic] published in the last 18 months, with publisher, title, URL, and licence note`

- **Find academic OA:** `list open-access papers on [topic] with more than [N] Google Scholar citations, published in the last [N] years, including DOI and licence`

- **Confirm a licence:** `find the licence or terms-of-use statement for [Publisher]'s freely-published reports. Quote the relevant passage verbatim`

- **Find regional reports:** `list recent free consumer-research reports from [region] published in the last 18 months by government, trade bodies, or major agencies operating there`

---

## Final discipline note

Before adding anything to `scripts/seed-public-library.ts`:

1. **Provenance row:** publisher, report title, publication date, exact URL, licence note (quoted from the source), curator note (your voice).
2. **One folder per source:** save the PDF and a `LICENCE.txt` containing the verbatim licence/terms passage. If the publisher's site changes, you have the receipt.
3. **No "ambiguous" ingestions.** If the licence isn't explicit, email the publisher or skip.
4. **Recency check before each ingest:** anything older than 24 months for trend data, 5 years for methodology, gets a "still load-bearing?" review.

The list above is curated, but Perplexity will surface more in each bucket as you search. Treat this as the seed; let the search-prompt patterns at the end of the doc grow the corpus toward the 200-document target.
