// Synthesise typed Hypothesis / Persona / Analysis / Recommendation shapes
// from compact JSON-fixture payloads (D-046).
//
// The deep-chain generators (recommendations, story angles) require
// upstream artefacts as typed inputs. The eval harness shouldn't need
// to chain real generations + DB writes for every probe — instead, each
// probe fixture inlines the upstream state and we cast it into the
// expected shapes here. Synthetic IDs are real UUIDs so any downstream
// validation that just checks shape doesn't break.

import { randomUUID } from "node:crypto";
import type {
  Analysis,
  Hypothesis,
  Persona,
  Recommendation,
  RecommendationConfidence,
} from "@/lib/rag/types";

export type SynthHypothesis = {
  statement: string;
  assumptions?: string[];
  expected_direction?: string;
  confirmation_criteria?: string;
  priority?: 1 | 2 | 3 | 4 | 5;
};

export type SynthPersona = {
  name: string;
  description: string;
  demographic_profile?: string;
  behavioural_profile?: string;
  under_represents?: string;
  priority?: 1 | 2 | 3 | 4 | 5;
};

export type SynthAnalysis = {
  hypothesis_verdicts?: Array<{
    hypothesis_index: number; // index into the hypotheses array
    verdict: "confirmed" | "refuted" | "inconclusive";
    confidence: "high" | "medium" | "low";
    summary: string;
    supporting_evidence?: string;
    caveats?: string[];
  }>;
  emergent_patterns?: Array<{
    pattern: string;
    description: string;
    evidence?: string;
    why_interesting: string;
    priority: 1 | 2 | 3 | 4 | 5;
  }>;
  caveats?: string[];
};

export type SynthRecommendation = {
  insight: string;
  recommended_action: string;
  confidence: RecommendationConfidence;
  caveats: string[];
};

const NOW = () => new Date().toISOString();

export function synthHypothesis(
  s: SynthHypothesis,
  projectId: string,
  briefId: string,
  ordinal: number,
): Hypothesis {
  return {
    id: randomUUID(),
    brief_id: briefId,
    project_id: projectId,
    ordinal,
    statement: s.statement,
    assumptions: s.assumptions ?? [],
    expected_direction: s.expected_direction ?? null,
    confirmation_criteria: s.confirmation_criteria ?? null,
    supporting_chunk_ids: [],
    contradicting_chunk_ids: [],
    priority: s.priority ?? 3,
    status: "accepted",
    notes: null,
    revised_after_analysis: false,
    revision_rationale: null,
    created_at: NOW(),
    updated_at: NOW(),
  };
}

export function synthPersona(
  p: SynthPersona,
  projectId: string,
  briefId: string,
  ordinal: number,
): Persona {
  return {
    id: randomUUID(),
    project_id: projectId,
    brief_id: briefId,
    ordinal,
    name: p.name,
    description: p.description,
    demographic_profile: p.demographic_profile ?? null,
    behavioural_profile: p.behavioural_profile ?? null,
    assumptions: [],
    under_represents: p.under_represents ?? null,
    supporting_chunk_ids: [],
    priority: p.priority ?? 3,
    status: "accepted",
    created_at: NOW(),
    updated_at: NOW(),
  };
}

export function synthAnalysis(
  a: SynthAnalysis | null,
  hypotheses: Hypothesis[],
  projectId: string,
  briefId: string,
): Analysis | null {
  if (!a) return null;
  const verdicts = (a.hypothesis_verdicts ?? [])
    .filter((v) => hypotheses[v.hypothesis_index])
    .map((v) => ({
      hypothesis_id: hypotheses[v.hypothesis_index].id,
      verdict: v.verdict,
      confidence: v.confidence,
      summary: v.summary,
      supporting_evidence: v.supporting_evidence ?? v.summary,
      caveats: v.caveats ?? [],
    }));
  const patterns = (a.emergent_patterns ?? []).map((p) => ({
    pattern: p.pattern,
    description: p.description,
    evidence: p.evidence ?? p.description,
    why_interesting: p.why_interesting,
    priority: p.priority,
  }));
  return {
    id: randomUUID(),
    brief_id: briefId,
    project_id: projectId,
    status: "complete",
    hypothesis_verdicts: verdicts,
    emergent_patterns: patterns,
    caveats: a.caveats ?? [],
    last_run_at: NOW(),
    last_error: null,
    created_at: NOW(),
    updated_at: NOW(),
  };
}

export function synthRecommendation(
  r: SynthRecommendation | null,
  hypothesisIds: string[],
  projectId: string,
  briefId: string,
): Recommendation | null {
  if (!r) return null;
  return {
    id: randomUUID(),
    brief_id: briefId,
    project_id: projectId,
    ordinal: 1,
    insight: r.insight,
    recommended_action: r.recommended_action,
    confidence: r.confidence,
    supporting_hypothesis_ids: hypothesisIds,
    supporting_emergent_patterns: [],
    caveats: r.caveats,
    status: "accepted",
    rejection_reason: null,
    created_at: NOW(),
    updated_at: NOW(),
  };
}

export function makeSyntheticBriefId(): string {
  return randomUUID();
}
