import type { Difficulty, InterviewTrack, Question } from "./types";

function id() {
  return `demo-${Math.random().toString(36).slice(2, 10)}`;
}

const dsaPool: Question[] = [
  {
    id: id(),
    track: "DSA",
    title: "Two Sum variant",
    prompt:
      "Given an array of integers and a target, return indices of two numbers that sum to the target. Explain your approach and time complexity.",
    hints: ["Consider hash map for O(n)"],
    constraints: "Array length ≤ 10^4. Values fit in 32-bit signed int.",
  },
  {
    id: id(),
    track: "DSA",
    title: "Valid parentheses",
    prompt:
      "Determine if a string of brackets `(`, `)`, `{`, `}`, `[`, `]` is valid. Walk through your algorithm.",
    hints: ["Stack-based typical solution"],
  },
  {
    id: id(),
    track: "DSA",
    title: "Merge intervals",
    prompt:
      "Given a list of intervals, merge all overlapping intervals. How would you sort and merge?",
    hints: ["Sort by start time"],
  },
];

const hrPool: Question[] = [
  {
    id: id(),
    track: "HR",
    title: "Conflict on a team",
    prompt:
      "Tell me about a time you disagreed with a teammate. What was the situation, what did you do, and what was the outcome?",
    hints: ["STAR: Situation, Task, Action, Result"],
  },
  {
    id: id(),
    track: "HR",
    title: "Prioritization under pressure",
    prompt:
      "Describe how you prioritize when multiple stakeholders need deliverables in the same week.",
    hints: ["Mention trade-offs and communication"],
  },
  {
    id: id(),
    track: "HR",
    title: "Learning from failure",
    prompt: "Share an example of a project that did not go as planned. What did you learn?",
  },
];

const mlPool: Question[] = [
  {
    id: id(),
    track: "ML",
    title: "Bias–variance tradeoff",
    prompt:
      "Explain the bias–variance tradeoff in supervised learning. How would you diagnose high bias vs high variance?",
    hints: ["Learning curves, regularization"],
  },
  {
    id: id(),
    track: "ML",
    title: "Evaluation metrics",
    prompt:
      "When would you prefer precision over recall (or vice versa)? Give a concrete product example.",
  },
  {
    id: id(),
    track: "ML",
    title: "Overfitting prevention",
    prompt:
      "List techniques to reduce overfitting in deep learning models and when you would use each.",
    hints: ["Dropout, data augmentation, early stopping"],
  },
];

const pools: Record<InterviewTrack, Question[]> = {
  DSA: dsaPool,
  HR: hrPool,
  ML: mlPool,
};

export function demoQuestions(
  tracks: InterviewTrack[],
  count: number,
  difficulty: Difficulty,
): Question[] {
  const pool = tracks.flatMap((t) => pools[t]);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, Math.min(count, shuffled.length));
  while (picked.length < count && pool.length > 0) {
    const extra = { ...pool[picked.length % pool.length], id: id() };
    picked.push(extra);
  }
  void difficulty;
  return picked.map((q) => ({ ...q, id: id() }));
}
