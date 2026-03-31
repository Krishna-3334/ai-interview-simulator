import { NextResponse } from "next/server";
import { z } from "zod";
import { evaluateInterview } from "@/lib/ai";
import type { Difficulty, InterviewTrack, Question } from "@/lib/types";

const questionSchema = z.object({
  id: z.string(),
  track: z.enum(["DSA", "HR", "ML"]),
  title: z.string(),
  prompt: z.string(),
  hints: z.array(z.string()).optional(),
  constraints: z.string().optional(),
});

const bodySchema = z.object({
  difficulty: z.enum(["Junior", "Mid", "Senior"]),
  tracks: z.array(z.enum(["DSA", "HR", "ML"])),
  items: z.array(
    z.object({
      question: questionSchema,
      answer: z.string(),
      secondsSpent: z.number().nonnegative(),
    }),
  ),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const { difficulty, tracks, items } = bodySchema.parse(json);
    const { report, openAiUnreachable } = await evaluateInterview(
      difficulty as Difficulty,
      tracks as InterviewTrack[],
      items as { question: Question; answer: string; secondsSpent: number }[],
    );
    return NextResponse.json({ report, openAiUnreachable });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
