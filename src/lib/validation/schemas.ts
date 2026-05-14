// Zod schemas for every API request body. Validating at the boundary turns
// "trust client input" into "verify client input" — the difference between
// a 400 with a clear field-level error and a 500 with a stack trace.

import { z } from "zod";

const Confidentiality = z.enum([
  "public",
  "client-confidential",
  "nda-restricted",
]);

const ItemStatus = z.enum(["proposed", "accepted", "rejected"]);

// ===== Projects =====

export const CreateProjectBody = z.object({
  name: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  confidentiality: Confidentiality.optional(),
});
export type CreateProjectBody = z.infer<typeof CreateProjectBody>;

// ===== Briefs =====

export const CreateBriefBody = z.object({
  projectId: z.string().uuid(),
  title: z.string().nullable().optional(),
  content: z.string().min(1),
});

export const UpdateBriefBody = z
  .object({
    title: z.string().nullable().optional(),
    content: z.string().min(1).optional(),
  })
  .refine((b) => b.title !== undefined || b.content !== undefined, {
    message: "patch must include at least one field",
  });

// ===== Hypotheses =====

export const UpdateHypothesisBody = z
  .object({
    status: ItemStatus.optional(),
    notes: z.string().nullable().optional(),
    rejection_reason: z.string().nullable().optional(),
    statement: z.string().min(1).optional(),
    expected_direction: z.string().nullable().optional(),
    confirmation_criteria: z.string().nullable().optional(),
    assumptions: z.array(z.string()).optional(),
    priority: z.number().int().min(1).max(5).optional(),
    // D-041: required by the API when an *accepted* hypothesis is being
    // structurally revised AFTER an analysis has run on the brief. The route
    // enforces the conditional; here we just allow the field through.
    revision_rationale: z.string().min(1).optional(),
  })
  .refine((b) => Object.keys(b).length > 0, {
    message: "patch must include at least one field",
  });

// ===== Personas =====

export const UpdatePersonaBody = z
  .object({
    status: ItemStatus.optional(),
    rejection_reason: z.string().nullable().optional(),
    name: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    demographic_profile: z.string().nullable().optional(),
    behavioural_profile: z.string().nullable().optional(),
    under_represents: z.string().nullable().optional(),
    assumptions: z.array(z.string()).optional(),
  })
  .refine((b) => Object.keys(b).length > 0, {
    message: "patch must include at least one field",
  });

// ===== Questions =====

export const UpdateQuestionBody = z
  .object({
    selected_variant_id: z.string().uuid().nullable().optional(),
    status: ItemStatus.optional(),
    notes: z.string().nullable().optional(),
    rejection_reason: z.string().nullable().optional(),
    target_construct: z.string().min(1).optional(),
    rationale: z.string().nullable().optional(),
  })
  .refine((b) => Object.keys(b).length > 0, {
    message: "patch must include at least one field",
  });

export const UpdateQuestionVariantBody = z
  .object({
    statement: z.string().min(1).optional(),
    response_format: z.string().nullable().optional(),
    response_options: z.array(z.string()).optional(),
  })
  .refine((b) => Object.keys(b).length > 0, {
    message: "patch must include at least one field",
  });

// ===== Recommendations (D-039) =====

export const UpdateRecommendationBody = z
  .object({
    status: ItemStatus.optional(),
    rejection_reason: z.string().nullable().optional(),
    insight: z.string().min(1).optional(),
    recommended_action: z.string().min(1).optional(),
    caveats: z.array(z.string()).optional(),
  })
  .refine((b) => Object.keys(b).length > 0, {
    message: "patch must include at least one field",
  });

// ===== Ask =====

export const AskBody = z.object({
  question: z.string().min(1),
  projectId: z.string().uuid(),
});

// ===== Param schemas (route params) =====

export const IdParam = z.object({ id: z.string().uuid() });
