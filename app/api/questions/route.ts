import { NextResponse } from "next/server";
import { z } from "zod";
import { generateQuestions } from "@/lib/ai";
import type { Difficulty, InterviewTrack } from "@/lib/types";

const bodySchema = z.object({
  tracks: z.array(z.enum(["DSA", "HR", "ML"])).min(1),
  difficulty: z.enum(["Junior", "Mid", "Senior"]),
  questionCount: z.number().int().min(1).max(12),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const { tracks, difficulty, questionCount } = bodySchema.parse(json);
    const { questions, openAiUnreachable } = await generateQuestions(
      tracks as InterviewTrack[],
      difficulty as Difficulty,
      questionCount,
    );
    const { hasOpenAI } = await import("@/lib/ai");
    return NextResponse.json({
      questions,
      aiEnabled: hasOpenAI(),
      openAiUnreachable,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
