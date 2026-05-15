// Premise — Public library ingestion manifest (D-044).
//
// One entry per source document. The seed script reads this file, extracts
// text from each local PDF / DOCX / TXT / MD via the existing
// src/lib/ingest/extractors.ts pipeline, and ingests into the Premise
// Public Library project with the metadata populated.
//
// Workflow:
//   1. Run Perplexity prompts from docs/PUBLIC_CORPUS_SHOPPING_LIST.md.
//   2. Download each PDF to corpus/public-library/<short-name>.pdf.
//   3. Add / edit an entry below.
//   4. Run `npm run seed-public-corpus`. Idempotent — re-run after manifest
//      edits to refresh metadata (content_hash skips text re-ingest).
//
// Hard rules (from docs/PUBLIC_CORPUS_TASKFORCE.md +
// docs/PUBLIC_CORPUS_VETTING.md):
//   - Every entry MUST carry a licence + licence_url confirming public /
//     attribution-permitted / CC status. `unknown` is permitted as a
//     starting state — but you must verify the footer and update before
//     a public launch.
//   - Curator notes are in Aaron's voice (not AI-generated as final).
//     The drafts below are starting points — EDIT each one in your voice
//     before considering the manifest shipped.
//   - No client work, even anonymised.

import type { Licence, SourceType } from "@/lib/rag/types";

export type ManifestEntry = {
  /** Local path from repo root, e.g. "corpus/public-library/bls-cex-2024.pdf". */
  file: string;
  /** Exact publisher title. */
  title: string;
  /** Publishing body, e.g. "U.S. Bureau of Labor Statistics". */
  publisher: string;
  /** Latest publication year as on the PDF cover. */
  publicationYear: number;
  /** Taskforce bucket — drives filtered retrieval. */
  sourceType: SourceType;
  /** "us" | "uk" | "eu" | "mena" | "india" | "sea" | "global" — free text, lowercase. */
  geography: string;
  /** 3-6 lowercase kebab-case tags, e.g. ["consumer-expenditure", "household-spending"]. */
  topicTags: string[];
  /** SPDX-style identifier — see Licence type. Use "unknown" until verified on footer. */
  licence: Licence;
  /** URL to publisher's terms-of-use page that supports the licence claim. Empty string until verified. */
  licenceUrl: string;
  /** One paragraph in Aaron's voice. What this is, why it's in the library. EDIT before launch. */
  curatorsNote: string;
};

export const PUBLIC_LIBRARY_MANIFEST: ManifestEntry[] = [
  // ==========================================================================
  // GOVERNMENT — US federal public-domain (4)
  // ==========================================================================

  {
    file: "corpus/public-library/cesan.pdf",
    title: "Consumer Expenditures — 2024",
    publisher: "U.S. Bureau of Labor Statistics",
    publicationYear: 2025,
    sourceType: "government",
    geography: "us",
    topicTags: [
      "consumer-expenditure",
      "household-spending",
      "base-rate",
      "income",
    ],
    licence: "public-domain",
    licenceUrl: "https://www.bls.gov/opub/copyright-information.htm",
    curatorsNote:
      "BLS's annual CEX summary. The canonical base-rate for what US households actually spend, broken out by income, demographic, and major category. Useful as the ground-truth check on any 'price sensitivity' or 'category-spend' hypothesis Premise produces — if the model's directional claim doesn't square with what CEX shows, the model's wrong.",
  },

  {
    file: "corpus/public-library/cfpb_making-ends-meet_2024-11.pdf",
    title: "Making Ends Meet in 2024",
    publisher: "U.S. Consumer Financial Protection Bureau",
    publicationYear: 2024,
    sourceType: "government",
    geography: "us",
    topicTags: [
      "financial-wellbeing",
      "household-finance",
      "credit-behaviour",
      "us-consumer",
    ],
    licence: "public-domain",
    licenceUrl: "https://www.consumerfinance.gov/about-us/legal/",
    curatorsNote:
      "CFPB's recurring household-finance survey. Where the Fed SHED captures broad financial wellbeing, this drills into the credit / making-ends-meet end of the population — exactly the segments under-represented in most agency consumer-confidence trackers.",
  },

  {
    file: "corpus/public-library/csn-annual-data-book-2024.pdf",
    title: "Consumer Sentinel Network Data Book 2024",
    publisher: "U.S. Federal Trade Commission",
    publicationYear: 2025,
    sourceType: "government",
    geography: "us",
    topicTags: [
      "consumer-protection",
      "complaints",
      "fraud",
      "category-pain-points",
    ],
    licence: "public-domain",
    licenceUrl: "https://www.ftc.gov/policy/no-fear-act/copyright-notice",
    curatorsNote:
      "FTC's complaints data, distilled annually. Useful inverse to brand-tracking: the categories that get the most FTC complaints are the ones where consumer trust is structurally fragile. Often surfaces problems brand teams haven't connected to their own segmentation.",
  },

  {
    file: "corpus/public-library/scf23.pdf",
    title: "Survey of Consumer Finances 2023",
    publisher: "U.S. Federal Reserve",
    publicationYear: 2024,
    sourceType: "government",
    geography: "us",
    topicTags: [
      "wealth-distribution",
      "household-finance",
      "consumer-balance-sheet",
      "us-consumer",
    ],
    licence: "public-domain",
    licenceUrl: "https://www.federalreserve.gov/aboutthefed/copyright.htm",
    curatorsNote:
      "Triennial Fed survey — the deepest open dataset on what US households actually own, owe, and earn. Use as the wealth-side ground-truth on any premium-positioning or trade-up hypothesis. Updated every three years, so methodologically stable.",
  },

  // ==========================================================================
  // THINK-TANK — Pew, Reuters Institute, Edelman (10)
  // ==========================================================================

  {
    file: "corpus/public-library/PS_2025.9.15_AI-and-its-impact_report.pdf",
    title: "How Americans View AI and Its Impact on People and Society",
    publisher: "Pew Research Center",
    publicationYear: 2025,
    sourceType: "think-tank",
    geography: "us",
    topicTags: ["ai-attitudes", "consumer-sentiment", "us-public-opinion", "ai-adoption"],
    licence: "attribution-permitted",
    licenceUrl: "https://www.pewresearch.org/about/terms-and-conditions/",
    curatorsNote:
      "Pew's flagship piece on US public attitudes toward AI as of late 2025. Nonpartisan, methodologically transparent, the cleanest cross-cut on AI sentiment by demographic available for free. Pair this with the Edelman and Ipsos AI work to triangulate — Pew gives the demographic ground truth.",
  },

  {
    file: "corpus/public-library/Digital_News-Report_2025.pdf",
    title: "Digital News Report 2025",
    publisher: "Reuters Institute for the Study of Journalism (University of Oxford)",
    publicationYear: 2025,
    sourceType: "think-tank",
    geography: "global",
    topicTags: ["news-consumption", "media-trust", "platform-use", "global-cross-country"],
    licence: "cc-by-4.0",
    licenceUrl: "https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2025",
    curatorsNote:
      "The single most-cited free piece of cross-country media-consumption research. 47-country sample, methodologically rigorous, CC-BY licensed. Use as the base layer for any media-behaviour or news-trust hypothesis — it's the field standard reviewers will expect to be cited.",
  },

  {
    file: "corpus/public-library/Trends_and_Predictions_2026.pdf",
    title: "Journalism, Media and Technology Trends and Predictions 2026",
    publisher: "Reuters Institute for the Study of Journalism (University of Oxford)",
    publicationYear: 2026,
    sourceType: "think-tank",
    geography: "global",
    topicTags: ["media-trends", "journalism", "platform-shift", "forward-looking"],
    licence: "cc-by-4.0",
    licenceUrl: "https://reutersinstitute.politics.ox.ac.uk/",
    curatorsNote:
      "Reuters Institute's annual forward-look from the senior end of newsroom leadership. Useful as a 'what insiders expect to change' signal, distinct from the 'what consumers report doing' signal of the Digital News Report.",
  },

  {
    file: "corpus/public-library/Trends_and_Predictions_2025.pdf",
    title: "Journalism, Media and Technology Trends and Predictions 2025",
    publisher: "Reuters Institute for the Study of Journalism (University of Oxford)",
    publicationYear: 2025,
    sourceType: "think-tank",
    geography: "global",
    topicTags: ["media-trends", "journalism", "platform-shift", "historical-context"],
    licence: "cc-by-4.0",
    licenceUrl: "https://reutersinstitute.politics.ox.ac.uk/",
    curatorsNote:
      "The prior year's predictions. Keeping the 2025 alongside the 2026 lets the bot reason about which forecasts landed and which didn't — a small accountability surface most corpora skip.",
  },

  {
    file: "corpus/public-library/Cornia_Private_Sector_News_FINAL.pdf",
    title: "Private Sector News, Social Media Distribution, and Algorithm Change",
    publisher: "Reuters Institute for the Study of Journalism (University of Oxford)",
    publicationYear: 2018,
    sourceType: "think-tank",
    geography: "global",
    topicTags: ["news-distribution", "platform-algorithms", "private-sector-news"],
    licence: "cc-by-4.0",
    licenceUrl: "https://reutersinstitute.politics.ox.ac.uk/",
    curatorsNote:
      "Cornia's RISJ working paper on private-sector news economics. Older but still cited for the algorithm-change framework. Keep if relevant to media-or-platform hypotheses; consider replacing with a newer RISJ paper if the corpus grows past 200 documents.",
  },

  {
    file: "corpus/public-library/Kalogeropolous - Social Inequality in News FINAL.pdf",
    title: "Social Inequality in News Use",
    publisher: "Reuters Institute for the Study of Journalism (University of Oxford)",
    publicationYear: 2019,
    sourceType: "think-tank",
    geography: "global",
    topicTags: ["news-inequality", "demographic-cuts", "media-consumption"],
    licence: "cc-by-4.0",
    licenceUrl: "https://reutersinstitute.politics.ox.ac.uk/",
    curatorsNote:
      "Kalogeropoulos at RISJ on demographic gaps in news access. The 'who's not reading' angle most consumer-media work elides. Useful counter-weight when a media hypothesis would otherwise read as if all consumers behave like the brand team's own segment.",
  },

  {
    file: "corpus/public-library/2025 Edelman Trust Barometer Special Report Fairness and Opportunity in the U.S._07.25.25.pdf",
    title: "2025 Edelman Trust Barometer Special Report — Fairness and Opportunity in the U.S.",
    publisher: "Edelman",
    publicationYear: 2025,
    sourceType: "think-tank",
    geography: "us",
    topicTags: ["trust", "fairness", "us-public-opinion", "edelman-special-report"],
    licence: "attribution-permitted",
    licenceUrl: "https://www.edelman.com/trust",
    curatorsNote:
      "Edelman's US-fairness cut of the 2025 Trust Barometer. **Lens: PR firm — Edelman publishes this to serve their corporate-trust consulting business. Methodology is rigorous; the topic selection (fairness, opportunity) reflects what their clients want to read about, not necessarily what most matters.** Use as a directional signal, not an objective base rate.",
  },

  {
    file: "corpus/public-library/2025 Edelman Trust Barometer_Insights for Food and Beverage Sector_0.pdf",
    title: "2025 Edelman Trust Barometer — Insights for the Food and Beverage Sector",
    publisher: "Edelman",
    publicationYear: 2025,
    sourceType: "think-tank",
    geography: "global",
    topicTags: ["trust", "food-and-beverage", "sector-cut", "consumer-trust"],
    licence: "attribution-permitted",
    licenceUrl: "https://www.edelman.com/trust",
    curatorsNote:
      "F&B sector cut of the 2025 Trust Barometer. **Same Edelman PR-firm lens caveat.** Useful for F&B brand-trust hypotheses; pair with non-Edelman F&B trust data (Mintel, NIQ) for cross-check.",
  },

  {
    file: "corpus/public-library/2025 Edelman Trust Barometer_Ireland Report.pdf",
    title: "2025 Edelman Trust Barometer — Ireland",
    publisher: "Edelman",
    publicationYear: 2025,
    sourceType: "think-tank",
    geography: "eu",
    topicTags: ["trust", "ireland", "country-cut", "consumer-trust"],
    licence: "attribution-permitted",
    licenceUrl: "https://www.edelman.com/trust",
    curatorsNote:
      "Ireland country-cut of the 2025 Trust Barometer. **Same Edelman lens caveat.** Useful for any Ireland-specific or EU smaller-market hypothesis where local data is scarce.",
  },

  // ==========================================================================
  // TRADE-BODY — ESOMAR, MRS, AAPOR canonical methodology (6)
  // ==========================================================================

  {
    file: "corpus/public-library/ICC-ESOMAR-International-Code-on-Market-Opinion-and-Social-Research-and-Data-Analytics-2.pdf",
    title: "ICC/ESOMAR International Code on Market, Opinion and Social Research and Data Analytics",
    publisher: "ESOMAR + International Chamber of Commerce",
    publicationYear: 2016,
    sourceType: "trade-body",
    geography: "global",
    topicTags: ["ethics", "industry-code", "professional-standards"],
    licence: "permission-licensed",
    licenceUrl: "https://esomar.org/uploads/attachments/ICC-ESOMAR-International-Code.pdf",
    curatorsNote:
      "The canonical global ethics code for market and social research. Cite this when a hypothesis or method choice needs to be defensible to a senior buyer — ICC/ESOMAR is the standard reviewers expect researchers to know. (Verify permission to redistribute with ESOMAR communications before public launch.)",
  },

  {
    file: "corpus/public-library/ESOMAR-28-Questions-to-Help-Buyers-of-Online-Samples-September-2012.pdf",
    title: "ESOMAR 28 Questions to Help Buyers of Online Samples",
    publisher: "ESOMAR",
    publicationYear: 2012,
    sourceType: "trade-body",
    geography: "global",
    topicTags: ["online-panels", "sample-quality", "vendor-evaluation", "methodology"],
    licence: "permission-licensed",
    licenceUrl: "https://esomar.org/code-and-guidelines/esomar-28-questions",
    curatorsNote:
      "The benchmark checklist senior researchers use to evaluate panel vendors. Twenty-eight questions a panel provider must be able to answer — anything they can't answer is a quality red flag. Older (2012) but still the field standard.",
  },

  {
    file: "corpus/public-library/7699.pdf",
    title: "ESOMAR Guideline on Social Media Research",
    publisher: "ESOMAR",
    publicationYear: 2011,
    sourceType: "trade-body",
    geography: "global",
    topicTags: ["social-media-research", "methodology", "ethics"],
    licence: "permission-licensed",
    licenceUrl: "https://esomar.org/code-and-guidelines",
    curatorsNote:
      "ESOMAR's foundational guidance on social-media-data research. Predates the consent-and-privacy maturity of the field; useful for the methodological principles, less so for the regulatory specifics.",
  },

  {
    file: "corpus/public-library/MRS Guidelines for Questionnaire Design.pdf",
    title: "MRS Guidelines for Questionnaire Design",
    publisher: "Market Research Society (UK)",
    publicationYear: 2014,
    sourceType: "trade-body",
    geography: "uk",
    topicTags: ["questionnaire-design", "uk-methodology", "industry-standards"],
    licence: "permission-licensed",
    licenceUrl: "https://www.mrs.org.uk/standards/best-practice",
    curatorsNote:
      "MRS's canonical guide to UK questionnaire design — the document UK practitioners are expected to know. Tighter on ethics + accessibility than ESOMAR. Pair with the AAPOR Standard Definitions for the US counterpart.",
  },

  {
    file: "corpus/public-library/2012-03-19 Qualitative Research Guidelines.pdf",
    title: "MRS Guidelines for Qualitative Research (Including Observational, Ethnographic and Deliberative Research)",
    publisher: "Market Research Society (UK)",
    publicationYear: 2011,
    sourceType: "trade-body",
    geography: "uk",
    topicTags: ["qualitative-research", "ethnography", "deliberative-research", "uk-methodology"],
    licence: "permission-licensed",
    licenceUrl: "https://www.mrs.org.uk/standards/best-practice",
    curatorsNote:
      "MRS on qualitative methods — the canonical UK take on focus groups, IDIs, ethnographic work. Use as the methodology reference for any qual hypothesis that gets pushback on whether the approach is field-defensible.",
  },

  {
    file: "corpus/public-library/Standards-Definitions-10th-edition.pdf",
    title: "Standard Definitions: Final Dispositions of Case Codes and Outcome Rates for Surveys (10th edition)",
    publisher: "AAPOR (American Association for Public Opinion Research)",
    publicationYear: 2023,
    sourceType: "trade-body",
    geography: "us",
    topicTags: ["response-rates", "case-dispositions", "us-methodology", "industry-standards"],
    licence: "permission-licensed",
    licenceUrl: "https://aapor.org/standards-and-ethics/standard-definitions/",
    curatorsNote:
      "AAPOR's canonical definitions for response rates and case dispositions. The reason every survey methodology section says 'AAPOR RR3' — this is what RR3 is. Cite when Premise generates a hypothesis whose validity depends on response-rate quality being argued explicitly.",
  },

  // ==========================================================================
  // METHODOLOGY — foundations + classic teaching materials (3)
  // ==========================================================================

  {
    file: "corpus/public-library/05_0638.pdf",
    title: "Fundamentals of Survey Research Methodology",
    publisher: "MITRE Corporation (Priscilla A. Glasow)",
    publicationYear: 2005,
    sourceType: "methodology",
    geography: "us",
    topicTags: ["survey-methodology", "foundations", "research-design", "us-federal"],
    licence: "public-domain",
    licenceUrl: "https://www.mitre.org/about/corporate-overview/intellectual-property",
    curatorsNote:
      "MITRE's textbook-grade primer on survey methodology. Federal-contractor publication, written for analysts who need a methodologically defensible survey but don't have a survey-methodology background. Useful when Premise needs to explain WHY a methodology choice matters, not just what to do.",
  },

  {
    file: "corpus/public-library/ssrn-2177288.pdf",
    title: "Thirty Years of Prospect Theory in Economics: A Review and Assessment",
    publisher: "Nicholas C. Barberis (Yale, via SSRN)",
    publicationYear: 2012,
    sourceType: "methodology",
    geography: "global",
    topicTags: ["prospect-theory", "behavioural-economics", "kahneman-tversky", "decision-research"],
    licence: "permission-licensed",
    licenceUrl: "https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2177288",
    curatorsNote:
      "Yale's Nick Barberis with the 30-year retrospective on Prospect Theory. Cleaner than reading Kahneman & Tversky directly — Barberis synthesises what's held up, what hasn't, and where the field's actually applied the insights versus where it's just cited them. Cite when Premise needs to reason about how consumers actually evaluate risk or loss.",
  },

  {
    file: "corpus/public-library/understanding_your_customers_printable.pdf",
    title: "Understanding Your Customers (OpenLearn course material from B206)",
    publisher: "The Open University (OpenLearn)",
    publicationYear: 2024,
    sourceType: "methodology",
    geography: "global",
    topicTags: ["customer-research", "teaching-material", "marketing-foundations", "openlearn"],
    licence: "cc-by-sa-4.0",
    licenceUrl:
      "https://www.open.edu/openlearn/about-openlearn/frequently-asked-questions-on-openlearn",
    curatorsNote:
      "Open University B206 derivative on customer-understanding fundamentals. CC-BY-SA. Use as the entry-level explainer for any concept Premise hasn't defined yet (segmentation, positioning, behaviour vs attitude) — written for first-time marketing students so it explains everything from scratch.",
  },

  // ==========================================================================
  // METHODOLOGY — Swedish survey-methodology series (academic, 10)
  // The single strongest strand in this corpus. Most are SCB / Statistics
  // Sweden working papers or related journal output. Licence is "unknown"
  // pending verification of each paper's footer / journal terms.
  // ==========================================================================

  {
    file: "corpus/public-library/2022-1 Effects of questionnaire length (Sandelin 2022) v2_2.pdf",
    title: "Effects of Questionnaire Length on Response Quality and Rates",
    publisher: "Sandelin (Statistics Sweden / academic survey methodology)",
    publicationYear: 2022,
    sourceType: "academic",
    geography: "global",
    topicTags: ["questionnaire-length", "response-quality", "survey-methodology", "swedish-series"],
    licence: "unknown",
    licenceUrl: "",
    curatorsNote:
      "Sandelin on the response-cost of long questionnaires — what every researcher feels in their bones but most never measure. Worth citing whenever a Premise questionnaire draft is creeping past 20 questions; the data here suggests where the cliff is.",
  },

  {
    file: "corpus/public-library/Sandelin (2024) Effects of push-to-web in paper-and-pencil and online mixed mode surveys.pdf",
    title: "Effects of Push-to-Web in Paper-and-Pencil and Online Mixed-Mode Surveys",
    publisher: "Sandelin (Statistics Sweden / academic survey methodology)",
    publicationYear: 2024,
    sourceType: "academic",
    geography: "global",
    topicTags: ["mixed-mode-surveys", "push-to-web", "mode-effects", "swedish-series"],
    licence: "unknown",
    licenceUrl: "",
    curatorsNote:
      "Sandelin on mixed-mode surveys — when push-to-web works, when it doesn't, what the response-mix tradeoff is. Cite when a Premise questionnaire is being designed for a population with mixed digital access.",
  },

  {
    file: "corpus/public-library/Sandelin & Falk (2023) Reassessing incentive effects.pdf",
    title: "Reassessing Incentive Effects in Survey Research",
    publisher: "Sandelin & Falk (Statistics Sweden / academic survey methodology)",
    publicationYear: 2023,
    sourceType: "academic",
    geography: "global",
    topicTags: ["incentives", "response-rates", "survey-methodology", "swedish-series"],
    licence: "unknown",
    licenceUrl: "",
    curatorsNote:
      "Sandelin & Falk on incentive design — when monetary incentives raise response quality vs when they just raise response volume from incentive-chasers. Useful for any panel-recruitment hypothesis.",
  },

  {
    file: "corpus/public-library/A simple invitation – The effect of simpler language in recruitment letters on joining a probability-based web panel.pdf",
    title: "A Simple Invitation: The Effect of Simpler Language in Recruitment Letters on Joining a Probability-Based Web Panel",
    publisher: "Andersson / Lundmark series (academic survey methodology)",
    publicationYear: 2023,
    sourceType: "academic",
    geography: "global",
    topicTags: ["panel-recruitment", "plain-language", "response-rates", "swedish-series"],
    licence: "unknown",
    licenceUrl: "",
    curatorsNote:
      "Field experiment on plain-language recruitment letters. The intervention is tiny (rewording the invitation); the effect on panel-join rate is real. Useful for any panel-design hypothesis where recruitment is the bottleneck.",
  },

  {
    file: "corpus/public-library/Cassel & Lundmark (2024) Reporting left-right ideology with different verbally labeled end-points.pdf",
    title: "Reporting Left-Right Ideology with Different Verbally Labeled End-Points",
    publisher: "Cassel & Lundmark (academic survey methodology)",
    publicationYear: 2024,
    sourceType: "academic",
    geography: "global",
    topicTags: ["scale-design", "endpoint-labelling", "political-attitudes", "swedish-series"],
    licence: "unknown",
    licenceUrl: "",
    curatorsNote:
      "Cassel & Lundmark on scale-endpoint labelling — the choice of words at each end of a Likert measurably shifts the distribution of responses. Cite whenever Premise's variant taxonomy is producing wording variants — this is the underlying methodological reason variants matter.",
  },

  {
    file: "corpus/public-library/Effects of SMS Reminders on Online Questionnaire Participation.pdf",
    title: "Effects of SMS Reminders on Online Questionnaire Participation",
    publisher: "Andersson / Lundmark series (academic survey methodology)",
    publicationYear: 2023,
    sourceType: "academic",
    geography: "global",
    topicTags: ["sms-reminders", "response-rates", "survey-methodology", "swedish-series"],
    licence: "unknown",
    licenceUrl: "",
    curatorsNote:
      "SMS reminders vs email reminders vs no reminders. Specific, measured intervention effects on response. Useful for any panel-design hypothesis about completion uplift.",
  },

  {
    file: "corpus/public-library/I want YOU for this survey!_0.pdf",
    title: "I Want YOU for This Survey! Personalisation Effects on Response",
    publisher: "Andersson / Lundmark series (academic survey methodology)",
    publicationYear: 2023,
    sourceType: "academic",
    geography: "global",
    topicTags: ["personalisation", "response-rates", "invitation-design", "swedish-series"],
    licence: "unknown",
    licenceUrl: "",
    curatorsNote:
      "Personalisation effects in survey invitations. The 'YOU' framing matters less than the senior literature suggests; the data here is appropriately humbling.",
  },

  {
    file: "corpus/public-library/Inclusion or illusion - Andersson (2025).pdf",
    title: "Inclusion or Illusion: Web Panel Composition and the Limits of Probability Sampling",
    publisher: "Andersson (academic survey methodology)",
    publicationYear: 2025,
    sourceType: "academic",
    geography: "global",
    topicTags: ["panel-composition", "probability-sampling", "inclusion", "swedish-series"],
    licence: "unknown",
    licenceUrl: "",
    curatorsNote:
      "Andersson on the inclusion-vs-illusion of probability-based web panels. Argues that even rigorously-recruited probability panels show systematic gaps. Useful as the caveat layer on any Premise hypothesis that leans on 'representative' panel data.",
  },

  {
    file: "corpus/public-library/Knock, Knock. Who's there The Effects of Visual Sender Recognition - Andersson, Lundmark & Persson.pdf",
    title: "Knock, Knock. Who's There? The Effects of Visual Sender Recognition on Survey Response",
    publisher: "Andersson, Lundmark & Persson (academic survey methodology)",
    publicationYear: 2024,
    sourceType: "academic",
    geography: "global",
    topicTags: ["sender-recognition", "branding-effects", "response-rates", "swedish-series"],
    licence: "unknown",
    licenceUrl: "",
    curatorsNote:
      "Visual branding of survey invitations and what it does to response. Modest but real effects. Useful for the design-layer of panel recruitment that most methodology guides skip.",
  },

  {
    file: "corpus/public-library/Same, same, but different - Evaluating digital mailbox reminders (not email) in surveys.pdf",
    title: "Same, Same, But Different: Evaluating Digital Mailbox Reminders (Not Email) in Surveys",
    publisher: "Andersson / Lundmark series (academic survey methodology)",
    publicationYear: 2024,
    sourceType: "academic",
    geography: "global",
    topicTags: ["digital-mailbox", "reminders", "mode-effects", "swedish-series"],
    licence: "unknown",
    licenceUrl: "",
    curatorsNote:
      "Digital mailbox (think Kivra / e-Boks) as a reminder channel — different conversion dynamics than email. Niche but relevant for Nordic / EU surveys where digital mailboxes are widespread.",
  },

  {
    file: "corpus/public-library/Sender gender – The effect of signatory gender in an invitation on web panel participation.pdf",
    title: "Sender Gender: The Effect of Signatory Gender in an Invitation on Web Panel Participation",
    publisher: "Andersson / Lundmark series (academic survey methodology)",
    publicationYear: 2023,
    sourceType: "academic",
    geography: "global",
    topicTags: ["sender-gender", "invitation-design", "response-rates", "swedish-series"],
    licence: "unknown",
    licenceUrl: "",
    curatorsNote:
      "Field experiment on signatory gender in panel invitations. Small effects, well-measured. Worth keeping as part of the broader 'micro-design choices in invitations matter' evidence chain.",
  },

  // ==========================================================================
  // ACADEMIC — non-Swedish-series open-access papers (1)
  // ==========================================================================

  {
    file: "corpus/public-library/1-s2.0-S2666784326000203-main.pdf",
    title:
      "Understanding Green Consumer Behavior in E-Commerce: A Bibliometric and Thematic Evolution Study (2000–2025)",
    publisher: "Vu, Tran & Do — Cleaner and Responsible Consumption (Elsevier)",
    publicationYear: 2026,
    sourceType: "academic",
    geography: "global",
    topicTags: ["green-consumer", "e-commerce", "sustainability", "bibliometric"],
    licence: "unknown",
    licenceUrl: "",
    curatorsNote:
      "Bibliometric review of green-consumer e-commerce research over 25 years. Useful as a 'state of the literature' starting point on sustainability in digital-retail hypotheses. **Verify Elsevier OA status on the journal page before publishing the corpus.**",
  },

  // ==========================================================================
  // AGENCY — Ipsos thought-leadership (5)
  // ALL Ipsos pieces carry the same lens caveat: Ipsos publishes these to
  // promote their commercial AI / synthetic-data / consumer-research
  // services. Methodology where stated is rigorous; topic and framing
  // serve the business.
  // ==========================================================================

  {
    file: "corpus/public-library/AI_FutureCX.pdf",
    title: "AI and the Future of CX: Designing Empathetic and Meaningful Experiences",
    publisher: "Ipsos (Ipsos Views)",
    publicationYear: 2024,
    sourceType: "agency",
    geography: "global",
    topicTags: ["ai-in-cx", "customer-experience", "ipsos-views", "ai-adoption"],
    licence: "permission-licensed",
    licenceUrl: "https://www.ipsos.com/en/terms-conditions",
    curatorsNote:
      "Ipsos Views thought-leadership on AI in CX. **Lens: Ipsos is promoting their Ipsos Facto Gen AI platform throughout — every conclusion lands on 'and this is why HI+AI matters.' Useful as one of several vendor views, not as objective research.** Pair with academic and non-Ipsos analyst sources to triangulate.",
  },

  {
    file: "corpus/public-library/AI_in_Advertising_Research_0.pdf",
    title: "AI in Advertising Research: Humanizing AI to Spark Creativity and Brand Success",
    publisher: "Ipsos (Ipsos Views)",
    publicationYear: 2024,
    sourceType: "agency",
    geography: "global",
    topicTags: ["ai-in-research", "advertising-research", "ipsos-views", "creative-testing"],
    licence: "permission-licensed",
    licenceUrl: "https://www.ipsos.com/en/terms-conditions",
    curatorsNote:
      "Ipsos on AI in advertising research. **Same Ipsos-vendor lens caveat.** Useful for the specific question 'how is Ipsos positioning its AI-in-creative-research offering' — a sector-watch signal, not field consensus.",
  },

  {
    file: "corpus/public-library/IpsosViews_ThePowerOfProductTestingWithSyntheticData.pdf",
    title: "The Power of Product Testing with Synthetic Data",
    publisher: "Ipsos (Ipsos Views)",
    publicationYear: 2024,
    sourceType: "agency",
    geography: "global",
    topicTags: ["synthetic-data", "product-testing", "ipsos-views", "ai-research-methods"],
    licence: "permission-licensed",
    licenceUrl: "https://www.ipsos.com/en/terms-conditions",
    curatorsNote:
      "Ipsos's pitch for synthetic-data product testing. **Heavy vendor lens — Ipsos is selling synthetic-data services.** Treat the methodology claims with extra scrutiny; pair with academic critiques of synthetic-data validity before letting this ground any Premise output.",
  },

  {
    file: "corpus/public-library/ipsos-views-misfits-and-the-machine.pdf",
    title: "Misfits and the Machine — When AI Doesn't Behave Like Your Consumer",
    publisher: "Ipsos (Ipsos Views)",
    publicationYear: 2024,
    sourceType: "agency",
    geography: "global",
    topicTags: ["ai-personas", "research-fitness", "ipsos-views", "ai-limits"],
    licence: "permission-licensed",
    licenceUrl: "https://www.ipsos.com/en/terms-conditions",
    curatorsNote:
      "Ipsos on the limits of AI-as-consumer-stand-in. **Same vendor lens.** More balanced than the other Ipsos Views pieces — argues for caution around synthetic-respondent overreach. Worth keeping as the 'Ipsos-acknowledging-the-limit' signal.",
  },

  {
    file: "corpus/public-library/ipsos-views-personas-in-the-age-of-AI.pdf",
    title: "Personas in the Age of AI",
    publisher: "Ipsos (Ipsos Views)",
    publicationYear: 2024,
    sourceType: "agency",
    geography: "global",
    topicTags: ["ai-personas", "persona-methodology", "ipsos-views"],
    licence: "permission-licensed",
    licenceUrl: "https://www.ipsos.com/en/terms-conditions",
    curatorsNote:
      "Ipsos's framing of AI-generated personas. **Vendor lens.** Directly relevant to Premise's own persona artefact — useful as the field-context Premise should be aware of, but don't let it ground Premise's persona prompt design without academic counter-voices.",
  },

  {
    file: "corpus/public-library/ipsos-views-seeing-the-unseen-humanzing-ai-3.pdf",
    title: "Seeing the Unseen: Humanizing AI in Research",
    publisher: "Ipsos (Ipsos Views)",
    publicationYear: 2024,
    sourceType: "agency",
    geography: "global",
    topicTags: ["ai-in-research", "human-ai-collaboration", "ipsos-views"],
    licence: "permission-licensed",
    licenceUrl: "https://www.ipsos.com/en/terms-conditions",
    curatorsNote:
      "Ipsos's 'humanising AI' framing. **Vendor lens.** Sixth Ipsos Views piece in this corpus — flagged as 'over-weighted to one publisher'; balance with the AI-in-research counter-prompts when the corpus is rebuilt.",
  },

  // ==========================================================================
  // AGENCY — Adobe (1)
  // ==========================================================================

  {
    file: "corpus/public-library/adobe-digital-insights-quarterly-report.pdf",
    title: "Adobe Digital Insights Quarterly Report",
    publisher: "Adobe (Adobe Digital Insights)",
    publicationYear: 2025,
    sourceType: "agency",
    geography: "us",
    topicTags: ["digital-commerce", "e-commerce-trends", "adobe-digital-insights"],
    licence: "permission-licensed",
    licenceUrl: "https://www.adobe.com/legal/terms.html",
    curatorsNote:
      "Adobe's quarterly digital-commerce read, drawn from their Adobe Analytics aggregate data. **Lens: serves Adobe's experience-cloud product positioning.** Methodology (aggregate Adobe Analytics traffic) is real and substantial; the lens is digital-spend optimism. Useful as a digital-commerce trend signal; pair with non-vendor sources.",
  },

  // ==========================================================================
  // ANALYST — Ipsos consumer tracker (1)
  // ==========================================================================

  {
    file: "corpus/public-library/ipsos-global-consumer-confidence-index-april-2026-web.pdf",
    title: "Ipsos Global Consumer Confidence Index — April 2026",
    publisher: "Ipsos",
    publicationYear: 2026,
    sourceType: "analyst",
    geography: "global",
    topicTags: ["consumer-confidence", "tracker", "global-cross-country", "ipsos"],
    licence: "permission-licensed",
    licenceUrl: "https://www.ipsos.com/en/terms-conditions",
    curatorsNote:
      "Ipsos's monthly cross-country consumer-confidence tracker, latest reading. **Vendor lens but methodologically real — large sample, consistent fielding.** Use as one of several confidence trackers (pair with Conference Board, Federal Reserve, OECD CCI) — never as the sole signal.",
  },

  // ==========================================================================
  // REGIONAL — Southeast Asia (2)
  // ==========================================================================

  {
    file: "corpus/public-library/uob-asean-consumer-sentiment-study-2025.pdf",
    title: "UOB ASEAN Consumer Sentiment Study 2025",
    publisher: "United Overseas Bank (UOB) Singapore",
    publicationYear: 2025,
    sourceType: "regional",
    geography: "sea",
    topicTags: ["asean", "consumer-sentiment", "singapore", "regional-banking-lens"],
    licence: "permission-licensed",
    licenceUrl: "https://www.uobgroup.com/web-resources/terms-of-use.html",
    curatorsNote:
      "UOB's ASEAN-wide consumer-sentiment study. **Lens: UOB is a regional bank — topic selection reflects consumer-banking and wealth-management priorities (savings, credit, digital banking). Sample and methodology are real and substantial.** The cleanest free pan-ASEAN consumer-attitude data available; pair with NSSO (India) and GASTAT (Saudi) as you expand the regional corpus.",
  },

  {
    file: "corpus/public-library/southeast-asia-food-beverage-ecommerce-market.pdf",
    title: "Trends in Southeast Asia's Food & Beverage eCommerce Market (2024)",
    publisher: "TMO Group",
    publicationYear: 2024,
    sourceType: "regional",
    geography: "sea",
    topicTags: ["sea-fmcg", "food-beverage", "e-commerce", "shopee-lazada"],
    licence: "permission-licensed",
    licenceUrl: "https://www.tmogroup.asia/terms-of-use/",
    curatorsNote:
      "TMO Group's SEA F&B eCommerce piece. **Lens: TMO Group is a Chinese eCommerce consultancy publishing this to win brand-side market-entry clients — 'why you need us to enter SEA.'** Underlying data (1M SKUs across Shopee/Lazada) is real; the conclusion is self-promotional. Use the data; ignore the consultancy-pitch framing.",
  },

  // ==========================================================================
  // METHODOLOGY — teaching with policy/advocacy lens (1)
  // ==========================================================================

  {
    file: "corpus/public-library/carrying_out_research_for_policy_and_advocacy_work_printable.pdf",
    title: "Carrying Out Research for Policy and Advocacy Work (OpenLearn course material)",
    publisher: "The Open University (OpenLearn)",
    publicationYear: 2024,
    sourceType: "methodology",
    geography: "global",
    topicTags: ["advocacy-research", "policy-research", "teaching-material", "openlearn"],
    licence: "cc-by-sa-4.0",
    licenceUrl:
      "https://www.open.edu/openlearn/about-openlearn/frequently-asked-questions-on-openlearn",
    curatorsNote:
      "Open University teaching material on how to do credible research in policy and advocacy contexts. **Note: the title looks like advocacy; the content is methodology-instructional — how researchers should DO advocacy-aimed work rigorously.** Useful as the methodology reference for the boundary where research meets policy.",
  },

  // ==========================================================================
  // META — Chartered Institute of Marketing reference (1)
  // ==========================================================================

  {
    file: "corpus/public-library/CIM - 7Ps document.pdf",
    title: "The 7Ps of the Marketing Mix",
    publisher: "Chartered Institute of Marketing (CIM, UK)",
    publicationYear: 2020,
    sourceType: "methodology",
    geography: "uk",
    topicTags: ["marketing-mix", "7ps", "marketing-foundations", "cim"],
    licence: "permission-licensed",
    licenceUrl: "https://www.cim.co.uk/resources/",
    curatorsNote:
      "CIM's reference document on the 7Ps marketing-mix framework (Product, Price, Place, Promotion, People, Process, Physical Evidence). Foundational; useful when Premise generates a hypothesis that needs the marketing-mix vocabulary to be coherent with how working marketers think.",
  },

  // ==========================================================================
  // WAVE 2 (2026-05-15) — AI counter-voices to balance the Ipsos lean.
  // 24 entries: 7 premier counter-balance, 5 academic on-topic, 5 vendor /
  // tracker with lens-disclosure, 7 tangential IJHCS papers flagged for
  // Aaron to prune if not directly relevant.
  // ==========================================================================

  // ----- Premier AI counter-voices (Stanford HAI + KPMG + UNDP + Munk) -----

  {
    file: "corpus/public-library/ai_index_report_2026.pdf",
    title: "AI Index Report 2026",
    publisher: "Stanford Institute for Human-Centered AI (Stanford HAI)",
    publicationYear: 2026,
    sourceType: "think-tank",
    geography: "global",
    topicTags: ["ai-index", "ai-adoption", "ai-policy", "stanford-hai", "annual-tracker"],
    licence: "cc-by-4.0",
    licenceUrl: "https://hai.stanford.edu/ai-index/",
    curatorsNote:
      "Stanford HAI's annual AI Index — the most-cited free AI report worldwide. Academic, methodologically transparent, CC-BY. The latest reading. Use as the field's base layer for any AI-adoption, AI-policy, or AI-capabilities hypothesis. Distinct lens from Ipsos: HAI tracks the *industry and research*, not the *consumer attitude*.",
  },

  {
    file: "corpus/public-library/hai_ai_index_report_2025.pdf",
    title: "AI Index Report 2025",
    publisher: "Stanford Institute for Human-Centered AI (Stanford HAI)",
    publicationYear: 2025,
    sourceType: "think-tank",
    geography: "global",
    topicTags: ["ai-index", "ai-adoption", "ai-policy", "stanford-hai", "historical"],
    licence: "cc-by-4.0",
    licenceUrl: "https://hai.stanford.edu/ai-index/",
    curatorsNote:
      "Prior year's AI Index. Keeping the 2025 alongside the 2026 lets the bot reason about which predictions and trend-readings landed — useful accountability surface for AI-trend hypotheses.",
  },

  {
    file: "corpus/public-library/Trust_in_AI_Report.pdf",
    title: "Trust, Attitudes and Use of Artificial Intelligence: A Global Study 2025",
    publisher: "University of Melbourne + KPMG International (Gillespie, Lockey, Ward, Macdade, Hassed)",
    publicationYear: 2025,
    sourceType: "think-tank",
    geography: "global",
    topicTags: ["ai-trust", "ai-attitudes", "global-cross-country", "kpmg-melbourne"],
    licence: "cc-by-nc-sa-4.0",
    licenceUrl: "https://doi.org/10.26188/28822919",
    curatorsNote:
      "Gillespie et al.'s global AI-trust study — multi-country, academically-led, CC-BY-NC-SA. **Note: the NC clause means this is fine for Premise's portfolio phase but must be removed or relicensed from KPMG/Melbourne before commercial use.** Strong counter-voice to the Ipsos AI Monitor: same topic, academic methodology, independent of any single vendor's services.",
  },

  {
    file: "corpus/public-library/2025 Global Survey on AI and Human Development_ Main Findings _ Human Development Reports.pdf",
    title: "2025 Global Survey on AI and Human Development — Main Findings",
    publisher: "UNDP Human Development Reports",
    publicationYear: 2025,
    sourceType: "think-tank",
    geography: "global",
    topicTags: ["ai-adoption", "human-development", "global-cross-country", "undp"],
    licence: "unknown",
    licenceUrl: "https://hdr.undp.org/copyright-and-terms-use",
    curatorsNote:
      "UNDP's cross-country AI adoption study via the HDI lens. 21-country pooled sample. **Distinct from every commercial source on this topic**: UN body, development framing, not selling anything. Useful when a hypothesis needs the developing-economy view that Western consultancies routinely miss. Verify the UNDP reuse terms on the linked page before public launch.",
  },

  {
    file: "corpus/public-library/GPO-AI_Final Version_May 27_updated.pdf",
    title: "Global Public Opinion on Artificial Intelligence",
    publisher: "Loewen et al. — Munk School of Global Affairs and Public Policy (University of Toronto)",
    publicationYear: 2024,
    sourceType: "academic",
    geography: "global",
    topicTags: ["ai-public-opinion", "global-cross-country", "munk-school"],
    licence: "unknown",
    licenceUrl: "",
    curatorsNote:
      "Loewen et al.'s academic-policy report on global AI public opinion. 10-author paper from the Munk School, methodologically transparent. Counter-voice to Ipsos AI Monitor: academic provenance, no commercial framing. **Verify reuse terms with the Munk School before public launch — academic policy reports vary widely on attribution policy.**",
  },

  // ----- Consumer-confidence trackers (non-Ipsos alternatives) -----

  {
    file: "corpus/public-library/US Consumer Confidence.pdf",
    title: "Consumer Confidence Survey — April 2026",
    publisher: "The Conference Board",
    publicationYear: 2026,
    sourceType: "analyst",
    geography: "us",
    topicTags: ["consumer-confidence", "tracker", "us-consumer", "conference-board"],
    licence: "permission-licensed",
    licenceUrl: "https://www.conference-board.org/terms-of-use",
    curatorsNote:
      "The Conference Board CCI — the canonical US consumer-confidence tracker, monthly since 1967. Use as the primary US-confidence anchor; pair with Ipsos Global CCI for the cross-country read. **Verify reuse terms — Conference Board content is generally copyrighted with permission-required redistribution.**",
  },

  {
    file: "corpus/public-library/Consumer Index Methodologies.pdf",
    title: "Bloomberg Consumer Comfort Index — Methodology",
    publisher: "Langer Research Associates (for Bloomberg)",
    publicationYear: 2020,
    sourceType: "methodology",
    geography: "us",
    topicTags: ["consumer-confidence", "methodology", "bloomberg-cci", "us-tracker"],
    licence: "unknown",
    licenceUrl: "",
    curatorsNote:
      "Methodology page for the Bloomberg Consumer Comfort Index. Useful as the third pillar of CCI triangulation (Conference Board / Univ. Michigan / Bloomberg) — different sample design, different question structure, different fielding. Cite when Premise's confidence reading is sensitive to the specific tracker chosen. Verify reuse before public launch.",
  },

  {
    file: "corpus/public-library/CCI_methodology_ENG.pdf",
    title: "Consumer Confidence Survey — Methodology (English)",
    publisher: "Bank of Mongolia / National Statistics Office of Mongolia",
    publicationYear: 2020,
    sourceType: "government",
    geography: "global",
    topicTags: ["consumer-confidence", "methodology", "mongolia", "regional-tracker"],
    licence: "unknown",
    licenceUrl: "",
    curatorsNote:
      "Mongolian CCI methodology document. Useful as a regional-Asia methodology comparator — the question structure, sample frame, and definition of confidence differ from the Conference Board / Ipsos standards. Worth keeping for any hypothesis that depends on cross-country CCI comparability. Geography tag is broader than just Mongolia because the methodology principles generalize.",
  },

  // ----- Academic on-topic (AI x CX, AI x research methodology) -----

  {
    file: "corpus/public-library/chen-prentice-2024-integrating-artificial-intelligence-and-customer-experience.pdf",
    title: "Integrating Artificial Intelligence and Customer Experience",
    publisher: "Chen & Prentice (2024) — Australasian Marketing Journal (SAGE)",
    publicationYear: 2024,
    sourceType: "academic",
    geography: "global",
    topicTags: ["ai-in-cx", "customer-experience", "peer-reviewed", "marketing-journal"],
    licence: "unknown",
    licenceUrl: "https://doi.org/10.1177/14413582241252904",
    curatorsNote:
      "Chen & Prentice peer-reviewed piece on AI integration into customer experience. Distinct from the Ipsos AI-in-CX framing: academic, journal-published, no commercial product to sell. **Verify SAGE OA status via the DOI before public launch — many SAGE articles are paywalled by default; this one's OA status is unconfirmed.**",
  },

  {
    file: "corpus/public-library/Ghesh_etal_TR_2023_The_Artificial_Intelligence_enabled_customer_experience_in_tourism.pdf",
    title: "The Artificial Intelligence Enabled Customer Experience in Tourism: A Systematic Literature Review",
    publisher: "Ghesh et al. (2023) — Tourism Review (Emerald)",
    publicationYear: 2023,
    sourceType: "academic",
    geography: "global",
    topicTags: ["ai-in-cx", "tourism", "systematic-review", "peer-reviewed"],
    licence: "unknown",
    licenceUrl: "",
    curatorsNote:
      "Systematic literature review of AI-enabled CX in tourism. Useful as the sector-specific lens — the AI-CX dynamics in travel are well-studied and produce findings that often transfer to other consumer-facing categories. **Verify Emerald OA status before public launch.**",
  },

  {
    file: "corpus/public-library/-She-was-useful--but-a-bit-too-optimistic---Aug_2025_International-Journal-o.pdf",
    title: "\"She Was Useful, but a Bit Too Optimistic\" — User Perceptions of an AI Persona",
    publisher: "International Journal of Human-Computer Studies (Elsevier), August 2025",
    publicationYear: 2025,
    sourceType: "academic",
    geography: "global",
    topicTags: ["ai-personas", "critical-perspective", "user-perception", "peer-reviewed"],
    licence: "unknown",
    licenceUrl: "",
    curatorsNote:
      "Critical academic perspective on AI personas — exactly the counter-voice the corpus needed against Ipsos's three vendor pieces on AI personas. The title alone is the framing: AI personas are useful but their over-optimism is a real research-validity concern. **IJHCS is Elsevier — verify OA status before public launch; most IJHCS articles are paywalled.**",
  },

  {
    file: "corpus/public-library/Conversational-agents-and-charitable-behavioral-inte_2025_International-Jour.pdf",
    title: "Conversational Agents and Charitable Behavioral Intentions",
    publisher: "International Journal of Human-Computer Studies (Elsevier), 2025",
    publicationYear: 2025,
    sourceType: "academic",
    geography: "global",
    topicTags: ["conversational-agents", "behavioural-intention", "chatbots", "peer-reviewed"],
    licence: "unknown",
    licenceUrl: "",
    curatorsNote:
      "Field experiment on how conversational AI affects consumer behavioural intention. Useful for any hypothesis where chatbots / AI assistants are part of the consumer journey. **Verify Elsevier OA status before public launch.**",
  },

  {
    file: "corpus/public-library/Uncovering-the-dynamics-of-human-AI-hybrid-perfor_2025_International-Journal.pdf",
    title: "Uncovering the Dynamics of Human-AI Hybrid Performance",
    publisher: "International Journal of Human-Computer Studies (Elsevier), 2025",
    publicationYear: 2025,
    sourceType: "academic",
    geography: "global",
    topicTags: ["human-ai-hybrid", "augmentation", "research-methodology", "peer-reviewed"],
    licence: "unknown",
    licenceUrl: "",
    curatorsNote:
      "Empirical work on when human-AI hybrid teams outperform either alone. Useful when Premise itself is the human-AI hybrid — gives the field's view on the conditions under which the hybrid lifts performance. **Verify Elsevier OA status before public launch.**",
  },

  // ----- Vendor / agency with explicit lens-disclosure -----

  {
    file: "corpus/public-library/2025 Edelman Trust Barometer_Insights Technology Sector_FINAL.pdf",
    title: "2025 Edelman Trust Barometer — Insights for the Technology Sector",
    publisher: "Edelman",
    publicationYear: 2025,
    sourceType: "think-tank",
    geography: "global",
    topicTags: ["trust", "technology-sector", "sector-cut", "edelman"],
    licence: "attribution-permitted",
    licenceUrl: "https://www.edelman.com/trust",
    curatorsNote:
      "Tech-sector cut of the 2025 Trust Barometer. **Same Edelman PR-firm lens caveat — Edelman publishes Trust Barometer to serve their corporate-trust consulting business.** Useful for any tech-sector trust hypothesis; pair with non-Edelman tech-trust data (Stanford HAI, Pew tech reports) for triangulation.",
  },

  {
    file: "corpus/public-library/2026 AI Consumer Insights - Usage Up, Sentiment Down _ Prophet.pdf",
    title: "The AI-Powered Consumer 2026: Why Use Is Surging While Sentiment Slides",
    publisher: "Prophet (brand consultancy)",
    publicationYear: 2026,
    sourceType: "agency",
    geography: "global",
    topicTags: ["ai-consumer", "ai-sentiment", "prophet", "ai-adoption-paradox"],
    licence: "permission-licensed",
    licenceUrl: "https://www.prophet.com/terms-of-use/",
    curatorsNote:
      "Prophet's 5-country AI-Powered Consumer study (~2,000 respondents in China, Germany, Singapore, UK, US). **Lens: Prophet is a brand-strategy consultancy — this report serves their AI-strategy advisory pipeline.** The 'usage up, sentiment down' framing is the headline finding; methodology is real. Use as one vendor view among several on AI adoption attitudes.",
  },

  {
    file: "corpus/public-library/Salsify 2026 Consumer Research Executive Summary.pdf",
    title: "Salsify 2026 Consumer Research — What Makes Shopping Experiences Matter (Executive Summary)",
    publisher: "Salsify (product-information management vendor)",
    publicationYear: 2026,
    sourceType: "analyst",
    geography: "us",
    topicTags: ["digital-shopping", "product-content", "ai-trust-gap", "salsify"],
    licence: "permission-licensed",
    licenceUrl: "https://www.salsify.com/terms-of-use",
    curatorsNote:
      "Salsify's annual consumer research on digital shopping. **Lens: Salsify sells product-information management software — every finding ladders up to 'brands need better product content.'** The 'AI trust gap' finding is real and useful; the framing serves Salsify's roadmap. **Note: this is the executive summary only; the full report is gated behind a download form.**",
  },

  {
    file: "corpus/public-library/Synthetic Consumers & AI Market Research_ Methods, Validation, Use Cases.pdf",
    title: "Synthetic Consumers in Market Research — A Practical Guide (2026)",
    publisher: "PyMC Labs (Bayesian-analytics consultancy)",
    publicationYear: 2026,
    sourceType: "methodology",
    geography: "global",
    topicTags: ["synthetic-consumers", "synthetic-data", "ai-personas", "pymc-labs"],
    licence: "unknown",
    licenceUrl: "",
    curatorsNote:
      "PyMC Labs's methodology piece on synthetic-consumer validity. **Lens: PyMC Labs sells synthetic-consumer services.** Distinct from the Ipsos synthetic-data pieces because the framing is methodology-shaped — explicit validation claims (90% alignment with human data, 85% distributional similarity). Useful as a non-Ipsos vendor view on synthetic data; pair with critical academic perspective. **Verify reuse terms from PyMC Labs's website footer.**",
  },

  // ----- IJHCS tangentially-relevant academic papers (prune as needed) -----

  {
    file: "corpus/public-library/-I-ve-never-seen-a-glass-ceiling-better-represented---_2025_International-Jo.pdf",
    title: "\"I've Never Seen a Glass Ceiling Better Represented\" — Gender and Bias in AI Systems",
    publisher: "International Journal of Human-Computer Studies (Elsevier), 2025",
    publicationYear: 2025,
    sourceType: "academic",
    geography: "global",
    topicTags: ["ai-bias", "gender-representation", "critical-ai", "peer-reviewed"],
    licence: "unknown",
    licenceUrl: "",
    curatorsNote:
      "IJHCS paper on bias and representation in AI systems. **Tangential to consumer-research methodology — keep if AI-bias hypotheses come up; drop if not directly cited within 3 months.** Verify Elsevier OA status before public launch.",
  },

  {
    file: "corpus/public-library/Engaging-with-ethics-in-the-HCI-design-process--A_2025_International-Journal.pdf",
    title: "Engaging with Ethics in the HCI Design Process",
    publisher: "International Journal of Human-Computer Studies (Elsevier), 2025",
    publicationYear: 2025,
    sourceType: "academic",
    geography: "global",
    topicTags: ["ai-ethics", "hci-design", "research-ethics", "peer-reviewed"],
    licence: "unknown",
    licenceUrl: "",
    curatorsNote:
      "Practical guidance on integrating ethics into HCI design processes. **Tangential — relevant when Premise generates a hypothesis involving AI ethics or design-research ethics.** Verify Elsevier OA status.",
  },

  {
    file: "corpus/public-library/User-centric-evaluation-of-explainability-of-AI-_2025_International-Journal-.pdf",
    title: "User-Centric Evaluation of Explainability of AI",
    publisher: "International Journal of Human-Computer Studies (Elsevier), 2025",
    publicationYear: 2025,
    sourceType: "academic",
    geography: "global",
    topicTags: ["explainable-ai", "xai", "user-evaluation", "peer-reviewed"],
    licence: "unknown",
    licenceUrl: "",
    curatorsNote:
      "XAI evaluation from the user's perspective. **Tangential — relevant for hypotheses about AI transparency or how consumers respond to AI-explanation surfaces.** Verify Elsevier OA status.",
  },

  {
    file: "corpus/public-library/Qualitative-insights-into-cognitive--affective-an_2025_International-Journal.pdf",
    title: "Qualitative Insights into Cognitive, Affective and Behavioural Responses",
    publisher: "International Journal of Human-Computer Studies (Elsevier), 2025",
    publicationYear: 2025,
    sourceType: "academic",
    geography: "global",
    topicTags: ["qualitative-methods", "cognitive-response", "affective-response", "peer-reviewed"],
    licence: "unknown",
    licenceUrl: "",
    curatorsNote:
      "Qualitative methodology piece. **Tangential but worth keeping if it covers qual research design — Premise's qual analysis stage is currently the weakest layer.** Verify Elsevier OA status and read the abstract to confirm direct relevance.",
  },

  {
    file: "corpus/public-library/Designing-for-human-centered-AI-Lessons-learne_2025_International-Journal-of.pdf",
    title: "Designing for Human-Centered AI — Lessons Learned",
    publisher: "International Journal of Human-Computer Studies (Elsevier), 2025",
    publicationYear: 2025,
    sourceType: "academic",
    geography: "global",
    topicTags: ["human-centered-ai", "ai-design", "design-research", "peer-reviewed"],
    licence: "unknown",
    licenceUrl: "",
    curatorsNote:
      "HCI design lessons for human-centred AI. **Tangential — useful as design-research methodology context, less directly applicable to consumer-research hypotheses.** Verify Elsevier OA status.",
  },

  {
    file: "corpus/public-library/StoryPoint--GenAI-supported-domain-specific-d_2025_International-Journal-of-.pdf",
    title: "StoryPoint — GenAI-Supported Domain-Specific Design",
    publisher: "International Journal of Human-Computer Studies (Elsevier), 2025",
    publicationYear: 2025,
    sourceType: "academic",
    geography: "global",
    topicTags: ["genai-design", "domain-specific-design", "ai-tools", "peer-reviewed"],
    licence: "unknown",
    licenceUrl: "",
    curatorsNote:
      "GenAI-supported design methodology paper. **Tangential — keep if Premise hypotheses ever touch GenAI-assisted design; consider dropping otherwise.** Verify Elsevier OA status.",
  },

  {
    file: "corpus/public-library/Agency-and-authorship-in-AI-art--Transformati_2025_International-Journal-of-.pdf",
    title: "Agency and Authorship in AI Art — Transformative Effects on Creative Practice",
    publisher: "International Journal of Human-Computer Studies (Elsevier), 2025",
    publicationYear: 2025,
    sourceType: "academic",
    geography: "global",
    topicTags: ["ai-art", "creative-ai", "authorship", "peer-reviewed"],
    licence: "unknown",
    licenceUrl: "",
    curatorsNote:
      "AI-art-and-authorship piece. **Weakest of the IJHCS tangential entries — niche topic, no direct consumer-research relevance.** Strong candidate to drop unless a creative-industries hypothesis lands. Verify Elsevier OA status.",
  },
];
