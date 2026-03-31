import OpenAI, { APIConnectionError, APIConnectionTimeoutError } from "openai";
import type { Difficulty, InterviewTrack, Question } from "./types";
import { demoQuestions } from "./demo";
import { interviewReportSchema, questionsResponseSchema } from "./schemas";
import type { InterviewReport } from "./types";

export function hasOpenAI() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

function client() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function isOpenAiTransportFailure(error: unknown): boolean {
  return (
    error instanceof APIConnectionError ||
    error instanceof APIConnectionTimeoutError ||
    (error instanceof Error &&
      /connection error|econnreset|etimedout|socket|network|fetch failed|tls|certificate/i.test(
        error.message,
      ))
  );
}

export async function generateQuestions(
  tracks: InterviewTrack[],
  difficulty: Difficulty,
  count: number,
): Promise<{ questions: Question[]; openAiUnreachable: boolean }> {
  if (!hasOpenAI()) {
    return { questions: demoQuestions(tracks, count, difficulty), openAiUnreachable: false };
  }

  const openai = client();
  const user = `Generate exactly ${count} interview questions for a mock interview.
Tracks to cover (distribute across these): ${tracks.join(", ")}.
Difficulty level: ${difficulty}.
Each question must be realistic for real interviews.
For DSA: include problem statement suitable for coding; include optional constraints string.
For HR: behavioral / situational.
For ML: conceptual and applied ML.

Return JSON only with shape: {"questions":[{"id":"uuid-like","track":"DSA"|"HR"|"ML","title":"short","prompt":"full question","hints":["optional"],"constraints":"optional for DSA"}]}`;

  try {
    const res = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are an expert hiring manager and staff engineer. Output only valid JSON matching the user schema.",
        },
        { role: "user", content: user },
      ],
    });

    const raw = res.choices[0]?.message?.content;
    if (!raw) throw new Error("Empty model response");
    const parsed = questionsResponseSchema.parse(JSON.parse(raw));
    const qs = parsed.questions.slice(0, count);
    if (qs.length < count) {
      const pad = demoQuestions(tracks, count - qs.length, difficulty);
      return { questions: [...qs, ...pad], openAiUnreachable: false };
    }
    return { questions: qs, openAiUnreachable: false };
  } catch (e) {
    if (isOpenAiTransportFailure(e)) {
      console.error("[AI Interview] OpenAI unreachable; using demo questions.", e);
      return {
        questions: demoQuestions(tracks, count, difficulty),
        openAiUnreachable: true,
      };
    }
    throw e;
  }
}

export async function evaluateInterview(
  difficulty: Difficulty,
  tracks: InterviewTrack[],
  items: { question: Question; answer: string; secondsSpent: number }[],
): Promise<{ report: InterviewReport; openAiUnreachable: boolean }> {
  if (!hasOpenAI()) {
    return { report: mockReport(items), openAiUnreachable: false };
  }

  const openai = client();
  const payload = items.map((i) => ({
    questionId: i.question.id,
    track: i.question.track,
    title: i.question.title,
    prompt: i.question.prompt,
    answer: i.answer,
    secondsSpent: i.secondsSpent,
  }));

  const user = `You are a rigorous but supportive interview coach. Difficulty context: ${difficulty}. Tracks: ${tracks.join(", ")}.

Evaluate each answer. For code/algorithm questions, judge algorithmic thinking and complexity discussion, not just syntax. For HR, use STAR and clarity. For ML, check conceptual correctness.

Input:
${JSON.stringify(payload, null, 2)}

Return JSON with:
- overall: {correctness, clarity, structure} each 0-100 (aggregate).
- narrative: 2-3 sentences summarizing performance.
- perQuestion: array matching each questionId with summary, scores {correctness, clarity, structure}, strengths[], weaknesses[], improvements[] (arrays of short bullets).
- globalStrengths: 3-5 bullets across the session.
- globalWeaknesses: 3-5 bullets.
- roadmap: 4-7 items with title, description, priority high|medium|low, optional suggestedResources (books/courses/links as strings).`;

  try {
    const res = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You output only valid JSON. Be specific and actionable, not generic.",
        },
        { role: "user", content: user },
      ],
    });

    const raw = res.choices[0]?.message?.content;
    if (!raw) throw new Error("Empty evaluation response");
    const parsed = interviewReportSchema.parse(JSON.parse(raw));
    return { report: parsed, openAiUnreachable: false };
  } catch (e) {
    if (isOpenAiTransportFailure(e)) {
      console.error("[AI Interview] OpenAI unreachable; using demo evaluation.", e);
      const report = mockReport(items);
      report.narrative =
        "OpenAI could not be reached (network, VPN, firewall, or API outage). Showing offline-style scores. " +
        report.narrative;
      return { report, openAiUnreachable: true };
    }
    throw e;
  }
}

function mockReport(
  items: { question: Question; answer: string; secondsSpent: number }[],
): InterviewReport {
  const perQuestion = items.map((i) => {
    const len = i.answer.trim().length;
    const base = Math.min(100, 35 + Math.floor(len / 8));
    const correctness = Math.min(100, base + (i.question.track === "DSA" ? 5 : 10));
    return {
      questionId: i.question.id,
      summary:
        len < 40
          ? "Answer was quite short; expand with examples and structure."
          : "Solid effort in demo mode — connect API key for full AI critique.",
      scores: {
        correctness,
        clarity: Math.min(100, base + 5),
        structure: Math.min(100, base + (i.answer.includes("\n") ? 15 : 0)),
      },
      strengths: len > 80 ? ["You provided substantive content"] : ["You attempted every prompt"],
      weaknesses:
        len < 60
          ? ["Add more depth and concrete examples"]
          : ["Fine-tune structure for interview pacing"],
      improvements: [
        "Add time/space complexity for DSA answers",
        "Use STAR for behavioral prompts",
        "Set OPENAI_API_KEY for personalized coaching",
      ],
    };
  });

  const avg = (k: keyof (typeof perQuestion)[0]["scores"]) =>
    Math.round(perQuestion.reduce((s, p) => s + p.scores[k], 0) / perQuestion.length);

  return {
    overall: {
      correctness: avg("correctness"),
      clarity: avg("clarity"),
      structure: avg("structure"),
    },
    narrative:
      "Demo evaluation mode is active. Configure OpenAI for detailed, question-specific feedback and roadmap.",
    perQuestion,
    globalStrengths: ["Completed all prompts", "Engaged with varied question types"],
    globalWeaknesses: ["Connect LLM for deeper technical critique"],
    roadmap: [
      {
        title: "Enable AI evaluation",
        description: "Add OPENAI_API_KEY to .env.local and rerun the interview for full scoring.",
        priority: "high" as const,
        suggestedResources: ["https://platform.openai.com/docs"],
      },
      {
        title: "Timed practice",
        description: "Repeat sessions with shorter per-question limits to build pacing.",
        priority: "medium" as const,
      },
      {
        title: "Portfolio stories",
        description: "Prepare 5 STAR stories for HR rounds tied to your real projects.",
        priority: "medium" as const,
      },
    ],
  };
}
