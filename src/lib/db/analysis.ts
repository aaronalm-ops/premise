import { getSupabaseServer } from "@/lib/db/supabase";
import type {
  Analysis,
  AnalysisData,
  AnalysisGenerationResult,
  AnalysisSourceType,
  AnalysisWithData,
} from "@/lib/rag/types";

// One analysis per brief (uniqued at the schema level). Returns the existing
// row, or creates an idle one on demand.
export async function getOrCreateAnalysis(
  briefId: string,
  projectId: string,
): Promise<Analysis> {
  const supabase = getSupabaseServer();

  const { data: existing, error: getErr } = await supabase
    .from("analyses")
    .select("*")
    .eq("brief_id", briefId)
    .maybeSingle();
  if (getErr) throw new Error(`getOrCreateAnalysis: ${getErr.message}`);
  if (existing) return existing as Analysis;

  const { data: created, error: createErr } = await supabase
    .from("analyses")
    .insert({ brief_id: briefId, project_id: projectId, status: "idle" })
    .select("*")
    .single();
  if (createErr || !created) {
    throw new Error(`getOrCreateAnalysis insert: ${createErr?.message}`);
  }
  return created as Analysis;
}

export async function getAnalysisWithData(
  briefId: string,
): Promise<AnalysisWithData | null> {
  const supabase = getSupabaseServer();
  const { data: analysis, error: aErr } = await supabase
    .from("analyses")
    .select("*")
    .eq("brief_id", briefId)
    .maybeSingle();
  if (aErr) throw new Error(`getAnalysisWithData: ${aErr.message}`);
  if (!analysis) return null;

  const { data: dataRows, error: dErr } = await supabase
    .from("analysis_data")
    .select("*")
    .eq("analysis_id", analysis.id)
    .order("created_at", { ascending: true });
  if (dErr) throw new Error(`getAnalysisWithData/data: ${dErr.message}`);

  return {
    ...(analysis as Analysis),
    data: (dataRows ?? []) as AnalysisData[],
  };
}

export async function addAnalysisData(input: {
  analysisId: string;
  briefId: string;
  projectId: string;
  sourceType: AnalysisSourceType;
  title: string;
  content: string;
}): Promise<AnalysisData> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("analysis_data")
    .insert({
      analysis_id: input.analysisId,
      brief_id: input.briefId,
      project_id: input.projectId,
      source_type: input.sourceType,
      title: input.title,
      content: input.content,
      char_count: input.content.length,
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(`addAnalysisData: ${error?.message}`);
  return data as AnalysisData;
}

export async function deleteAnalysisData(id: string): Promise<void> {
  const supabase = getSupabaseServer();
  const { error } = await supabase.from("analysis_data").delete().eq("id", id);
  if (error) throw new Error(`deleteAnalysisData: ${error.message}`);
}

export async function setAnalysisRunning(analysisId: string): Promise<void> {
  const supabase = getSupabaseServer();
  await supabase
    .from("analyses")
    .update({
      status: "running",
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", analysisId);
}

export async function persistAnalysisResult(input: {
  analysisId: string;
  result: AnalysisGenerationResult;
}): Promise<Analysis> {
  const supabase = getSupabaseServer();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("analyses")
    .update({
      status: "complete",
      hypothesis_verdicts: input.result.hypothesis_verdicts,
      emergent_patterns: input.result.emergent_patterns,
      caveats: input.result.caveats,
      last_run_at: now,
      last_error: null,
      updated_at: now,
    })
    .eq("id", input.analysisId)
    .select("*")
    .single();
  if (error || !data) throw new Error(`persistAnalysisResult: ${error?.message}`);
  return data as Analysis;
}

export async function setAnalysisFailed(
  analysisId: string,
  message: string,
): Promise<void> {
  const supabase = getSupabaseServer();
  await supabase
    .from("analyses")
    .update({
      status: "failed",
      last_error: message,
      updated_at: new Date().toISOString(),
    })
    .eq("id", analysisId);
}
