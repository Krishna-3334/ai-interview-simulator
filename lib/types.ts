export type InterviewTrack = "DSA" | "HR" | "ML";

export type Difficulty = "Junior" | "Mid" | "Senior";

export interface InterviewConfig {
  tracks: InterviewTrack[];
  difficulty: Difficulty;
  questionCount: number;
  minutesPerQuestion: number;
}

export interface Question {
  id: string;
  track: InterviewTrack;
  title: string;
  prompt: string;
  hints?: string[];
  /** For DSA: constraints / examples text */
  constraints?: string;
}

export interface AnswerRecord {
  questionId: string;
  answer: string;
  secondsSpent: number;
}

export interface ScoreBreakdown {
  correctness: number;
  clarity: number;
  structure: number;
}

export interface QuestionFeedback {
  questionId: string;
  summary: string;
  scores: ScoreBreakdown;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
}

export interface InterviewReport {
  overall: ScoreBreakdown;
  narrative: string;
  perQuestion: QuestionFeedback[];
  globalStrengths: string[];
  globalWeaknesses: string[];
  roadmap: RoadmapItem[];
}

export interface RoadmapItem {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  suggestedResources?: string[];
}
