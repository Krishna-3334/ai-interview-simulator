import { z } from "zod";

const scoreBreakdownSchema = z.object({
  correctness: z.number().min(0).max(100),
  clarity: z.number().min(0).max(100),
  structure: z.number().min(0).max(100),
});

export const interviewReportSchema = z.object({
  overall: scoreBreakdownSchema,
  narrative: z.string(),
  perQuestion: z.array(
    z.object({
      questionId: z.string(),
      summary: z.string(),
      scores: scoreBreakdownSchema,
      strengths: z.array(z.string()),
      weaknesses: z.array(z.string()),
      improvements: z.array(z.string()),
    }),
  ),
  globalStrengths: z.array(z.string()),
  globalWeaknesses: z.array(z.string()),
  roadmap: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      priority: z.enum(["high", "medium", "low"]),
      suggestedResources: z.array(z.string()).optional(),
    }),
  ),
});

export type ParsedReport = z.infer<typeof interviewReportSchema>;

const questionSchema = z.object({
  id: z.string(),
  track: z.enum(["DSA", "HR", "ML"]),
  title: z.string(),
  prompt: z.string(),
  hints: z.array(z.string()).optional(),
  constraints: z.string().optional(),
});

export const questionsResponseSchema = z.object({
  questions: z.array(questionSchema),
});
