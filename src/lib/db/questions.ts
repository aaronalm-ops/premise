import { getSupabaseServer } from "@/lib/db/supabase";
import type {
  HypothesisStatus,
  Question,
  QuestionDraft,
  QuestionVariant,
  QuestionWithVariants,
} from "@/lib/rag/types";

export async function listQuestionsWithVariants(
  briefId: string,
): Promise<QuestionWithVariants[]> {
  const supabase = getSupabaseServer();
  const { data: questions, error: qErr } = await supabase
    .from("questions")
    .select("*")
    .eq("brief_id", briefId)
    .order("ordinal", { ascending: true });
  if (qErr) throw new Error(`listQuestions: ${qErr.message}`);
  if (!questions || questions.length === 0) return [];

  const ids = questions.map((q) => q.id);
  const { data: variants, error: vErr } = await supabase
    .from("question_variants")
    .select("*")
    .in("question_id", ids)
    .order("ordinal", { ascending: true });
  if (vErr) throw new Error(`listVariants: ${vErr.message}`);

  const byQuestion = new Map<string, QuestionVariant[]>();
  for (const v of (variants ?? []) as QuestionVariant[]) {
    if (!byQuestion.has(v.question_id)) byQuestion.set(v.question_id, []);
    byQuestion.get(v.question_id)!.push(v);
  }

  return (questions as Question[]).map((q) => ({
    ...q,
    variants: byQuestion.get(q.id) ?? [],
  }));
}

export async function replaceProposedQuestions(input: {
  briefId: string;
  projectId: string;
  drafts: QuestionDraft[];
}): Promise<QuestionWithVariants[]> {
  const supabase = getSupabaseServer();

  await supabase
    .from("questions")
    .delete()
    .eq("brief_id", input.briefId)
    .eq("status", "proposed");

  const { data: existing } = await supabase
    .from("questions")
    .select("ordinal")
    .eq("brief_id", input.briefId)
    .order("ordinal", { ascending: false })
    .limit(1);

  const startOrdinal = (existing?.[0]?.ordinal ?? -1) + 1;

  if (input.drafts.length === 0) return [];

  const out: QuestionWithVariants[] = [];

  for (let i = 0; i < input.drafts.length; i++) {
    const d = input.drafts[i];
    const { data: question, error: qErr } = await supabase
      .from("questions")
      .insert({
        project_id: input.projectId,
        brief_id: input.briefId,
        hypothesis_id: d.hypothesis_id,
        ordinal: startOrdinal + i,
        target_construct: d.target_construct,
        rationale: d.rationale,
        status: "proposed" as const,
      })
      .select("*")
      .single();
    if (qErr || !question) throw new Error(`insertQuestion: ${qErr?.message}`);

    const variantRows = d.variants.map((v, vi) => ({
      question_id: question.id,
      ordinal: vi,
      variant_type: v.variant_type,
      statement: v.statement,
      response_format: v.response_format,
      response_options: v.response_options,
      what_it_elicits: v.what_it_elicits,
      caveat: v.caveat,
    }));

    const { data: insertedVariants, error: vErr } = await supabase
      .from("question_variants")
      .insert(variantRows)
      .select("*");
    if (vErr) throw new Error(`insertVariants: ${vErr.message}`);

    out.push({
      ...(question as Question),
      variants: (insertedVariants ?? []) as QuestionVariant[],
    });
  }

  return out;
}

export async function updateQuestion(input: {
  id: string;
  selected_variant_id?: string | null;
  status?: HypothesisStatus;
  notes?: string | null;
  target_construct?: string;
  rationale?: string | null;
}): Promise<Question> {
  const supabase = getSupabaseServer();
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (input.selected_variant_id !== undefined)
    patch.selected_variant_id = input.selected_variant_id;
  if (input.status !== undefined) patch.status = input.status;
  if (input.notes !== undefined) patch.notes = input.notes;
  if (input.target_construct !== undefined)
    patch.target_construct = input.target_construct;
  if (input.rationale !== undefined) patch.rationale = input.rationale;

  const { data, error } = await supabase
    .from("questions")
    .update(patch)
    .eq("id", input.id)
    .select("*")
    .single();
  if (error) throw new Error(`updateQuestion: ${error.message}`);
  return data as Question;
}

export async function updateQuestionVariant(input: {
  id: string;
  statement?: string;
  response_format?: string | null;
  response_options?: string[];
}): Promise<QuestionVariant> {
  const supabase = getSupabaseServer();
  const patch: Record<string, unknown> = {};
  if (input.statement !== undefined) patch.statement = input.statement;
  if (input.response_format !== undefined)
    patch.response_format = input.response_format;
  if (input.response_options !== undefined)
    patch.response_options = input.response_options;

  const { data, error } = await supabase
    .from("question_variants")
    .update(patch)
    .eq("id", input.id)
    .select("*")
    .single();
  if (error) throw new Error(`updateQuestionVariant: ${error.message}`);
  return data as QuestionVariant;
}
