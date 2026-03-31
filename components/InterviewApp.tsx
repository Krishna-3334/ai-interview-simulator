"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  ChevronRight,
  Clock,
  Code2,
  Loader2,
  MessageSquareText,
  Sparkles,
  Timer,
  Users,
} from "lucide-react";
import type {
  Difficulty,
  InterviewReport,
  InterviewTrack,
  Question,
} from "@/lib/types";
import { ScoreBars } from "./ScoreBars";
import { postJson } from "@/lib/client-api";

type Step = "setup" | "interview" | "loading" | "report";

const TRACK_META: Record<
  InterviewTrack,
  { label: string; icon: typeof Code2; description: string }
> = {
  DSA: {
    label: "DSA / Coding",
    icon: Code2,
    description: "Algorithms, complexity, problem solving",
  },
  HR: {
    label: "HR / Behavioral",
    icon: Users,
    description: "STAR stories, culture, soft skills",
  },
  ML: {
    label: "Machine Learning",
    icon: Brain,
    description: "Theory, metrics, system intuition",
  },
};

function trackStyle(t: InterviewTrack) {
  if (t === "DSA") return "text-sky-300 bg-sky-500/15 border-sky-500/30";
  if (t === "HR") return "text-violet-300 bg-violet-500/15 border-violet-500/30";
  return "text-emerald-300 bg-emerald-500/15 border-emerald-500/30";
}

export function InterviewApp() {
  const [step, setStep] = useState<Step>("setup");
  const [tracks, setTracks] = useState<InterviewTrack[]>(["DSA", "HR"]);
  const [difficulty, setDifficulty] = useState<Difficulty>("Mid");
  const [questionCount, setQuestionCount] = useState(5);
  const [minutesPerQuestion, setMinutesPerQuestion] = useState(8);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [openAiUnreachable, setOpenAiUnreachable] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answerDraft, setAnswerDraft] = useState("");
  const [answers, setAnswers] = useState<{ secondsSpent: number; text: string }[]>([]);
  const [questionStarted, setQuestionStarted] = useState<number | null>(null);
  const [remainingSec, setRemainingSec] = useState(0);
  const [showHints, setShowHints] = useState(false);
  const [report, setReport] = useState<InterviewReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const advancingRef = useRef(false);
  const prevRemainingRef = useRef(-1);

  const currentQuestion = questions[currentIndex];

  useEffect(() => {
    if (step !== "interview" || !currentQuestion) return;
    setQuestionStarted(Date.now());
    setAnswerDraft(answers[currentIndex]?.text ?? "");
    setShowHints(false);
    advancingRef.current = false;
    prevRemainingRef.current = -1;
  }, [step, currentIndex, currentQuestion, answers]);

  useEffect(() => {
    if (step !== "interview" || !currentQuestion) return;
    const limit = minutesPerQuestion * 60;
    let left = limit;
    setRemainingSec(left);
    const id = setInterval(() => {
      left -= 1;
      setRemainingSec(left);
      if (left <= 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [step, currentIndex, currentQuestion, minutesPerQuestion]);

  const toggleTrack = (t: InterviewTrack) => {
    setTracks((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const startInterview = async () => {
    setError(null);
    if (tracks.length === 0) {
      setError("Pick at least one interview track.");
      return;
    }
    setStep("loading");
    try {
      const data = await postJson<{
        questions: Question[];
        aiEnabled: boolean;
        openAiUnreachable?: boolean;
      }>("/api/questions", { tracks, difficulty, questionCount });
      setQuestions(data.questions);
      setAiEnabled(Boolean(data.aiEnabled));
      setOpenAiUnreachable(Boolean(data.openAiUnreachable));
      setCurrentIndex(0);
      setAnswers(Array(data.questions.length).fill(null).map(() => ({ secondsSpent: 0, text: "" })));
      setStep("interview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setStep("setup");
    }
  };

  const runEvaluate = useCallback(
    async (finalAnswers: { secondsSpent: number; text: string }[]) => {
      setStep("loading");
      setError(null);
      try {
        const items = questions.map((q, i) => ({
          question: q,
          answer: finalAnswers[i]?.text ?? "",
          secondsSpent: finalAnswers[i]?.secondsSpent ?? 0,
        }));
        const data = await postJson<{ report: InterviewReport; openAiUnreachable?: boolean }>(
          "/api/evaluate",
          { difficulty, tracks, items },
        );
        setReport(data.report);
        setOpenAiUnreachable(Boolean(data.openAiUnreachable));
        setStep("report");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Evaluation failed");
        setStep("interview");
      } finally {
        advancingRef.current = false;
      }
    },
    [questions, difficulty, tracks],
  );

  const recordAndGoNext = useCallback(
    (opts?: { spentCap?: number }) => {
      if (!currentQuestion || advancingRef.current) return;
      if (questionStarted == null) return;
      advancingRef.current = true;
      const limit = minutesPerQuestion * 60;
      const spent = Math.min(
        limit,
        opts?.spentCap ?? Math.max(0, Math.round((Date.now() - questionStarted) / 1000)),
      );
      const nextAnswers = [...answers];
      nextAnswers[currentIndex] = { secondsSpent: spent, text: answerDraft };
      setAnswers(nextAnswers);
      if (currentIndex + 1 >= questions.length) {
        void runEvaluate(nextAnswers);
      } else {
        setCurrentIndex((i) => i + 1);
        advancingRef.current = false;
      }
    },
    [
      currentIndex,
      currentQuestion,
      questionStarted,
      answerDraft,
      minutesPerQuestion,
      questions.length,
      answers,
      runEvaluate,
    ],
  );

  const recordRef = useRef(recordAndGoNext);
  recordRef.current = recordAndGoNext;

  useEffect(() => {
    if (step !== "interview" || !currentQuestion) {
      prevRemainingRef.current = -1;
      return;
    }
    const prev = prevRemainingRef.current;
    if (prev > 0 && remainingSec === 0) {
      const limit = minutesPerQuestion * 60;
      recordRef.current({ spentCap: limit });
    }
    prevRemainingRef.current = remainingSec;
  }, [remainingSec, step, currentQuestion, minutesPerQuestion]);

  const resetAll = () => {
    advancingRef.current = false;
    prevRemainingRef.current = -1;
    setStep("setup");
    setQuestions([]);
    setReport(null);
    setAnswers([]);
    setCurrentIndex(0);
    setError(null);
    setOpenAiUnreachable(false);
  };

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-10 md:py-16">
      <header className="mb-12 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-[var(--muted)] mb-4">
          <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
          LeetCode + coach-grade feedback
        </div>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-3 bg-gradient-to-r from-[var(--text)] to-[var(--muted)] bg-clip-text text-transparent">
          AI Interview Simulator
        </h1>
        <p className="text-[var(--muted)] max-w-xl mx-auto text-sm md:text-base leading-relaxed">
          Timed mock sessions across coding, behavioral, and ML. Answers are scored on correctness,
          clarity, and structure — with strengths, gaps, and a personalized roadmap.
        </p>
      </header>

      {error && (
        <div
          className="mb-6 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-200 text-sm"
          role="alert"
        >
          {error}
        </div>
      )}

      {openAiUnreachable && (step === "interview" || step === "report") && (
        <div
          className="mb-6 p-4 rounded-xl border border-amber-500/35 bg-amber-500/10 text-amber-100 text-sm leading-relaxed"
          role="status"
        >
          OpenAI returned a connection error while your API key is set. Using offline questions and
          scoring instead. Check VPN, firewall, corporate proxy, or api.openai.com reachability, then
          try again.
        </div>
      )}

      {step === "setup" && (
        <div className="glass p-6 md:p-8 space-y-8">
          <section>
            <h2 className="text-sm font-medium text-[var(--muted)] uppercase tracking-wider mb-3">
              Tracks
            </h2>
            <div className="grid sm:grid-cols-3 gap-3">
              {(Object.keys(TRACK_META) as InterviewTrack[]).map((t) => {
                const meta = TRACK_META[t];
                const Icon = meta.icon;
                const on = tracks.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTrack(t)}
                    className={`text-left p-4 rounded-xl border transition-all ${
                      on
                        ? "border-[var(--accent)]/50 bg-[var(--accent)]/10"
                        : "border-[var(--border)] hover:border-white/20"
                    }`}
                  >
                    <Icon className="w-5 h-5 mb-2 text-[var(--accent)]" />
                    <div className="font-medium text-sm">{meta.label}</div>
                    <div className="text-xs text-[var(--muted)] mt-1 leading-snug">
                      {meta.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm text-[var(--muted)] block mb-2">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                className="w-full rounded-xl bg-[var(--surface2)] border border-[var(--border)] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
              >
                <option value="Junior">Junior</option>
                <option value="Mid">Mid</option>
                <option value="Senior">Senior</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-[var(--muted)] block mb-2">Questions</label>
              <input
                type="range"
                min={3}
                max={10}
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full accent-[var(--accent)]"
              />
              <div className="text-xs text-[var(--muted)] mt-1">{questionCount} questions</div>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-[var(--muted)] block mb-2">Time per question</label>
              <input
                type="range"
                min={3}
                max={20}
                value={minutesPerQuestion}
                onChange={(e) => setMinutesPerQuestion(Number(e.target.value))}
                className="w-full accent-[var(--accent)]"
              />
              <div className="text-xs text-[var(--muted)] mt-1">{minutesPerQuestion} minutes</div>
            </div>
          </section>

          <button
            type="button"
            onClick={startInterview}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 hover:from-sky-400 hover:to-violet-400 text-white font-medium py-3.5 px-4 transition shadow-lg shadow-sky-500/20"
          >
            Start mock interview
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {step === "interview" && currentQuestion && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="text-[var(--muted)]">
              Question {currentIndex + 1} / {questions.length}
            </span>
            <div
              className={`flex items-center gap-2 tabular-nums font-medium ${
                remainingSec <= 60 ? "text-[var(--warning)]" : "text-[var(--accent)]"
              }`}
            >
              <Timer className="w-4 h-4" />
              {fmtTime(remainingSec)}
            </div>
          </div>

          <div className="glass p-6 md:p-8 space-y-4">
            <div className="flex flex-wrap items-start gap-2">
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-md border ${trackStyle(currentQuestion.track)}`}
              >
                {currentQuestion.track}
              </span>
              <h2 className="text-lg md:text-xl font-semibold flex-1">{currentQuestion.title}</h2>
            </div>
            <p className="text-[var(--muted)] leading-relaxed whitespace-pre-wrap">
              {currentQuestion.prompt}
            </p>
            {currentQuestion.constraints && (
              <div className="text-xs text-[var(--muted)] border-l-2 border-[var(--accent)]/40 pl-3">
                {currentQuestion.constraints}
              </div>
            )}
            {currentQuestion.hints && currentQuestion.hints.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowHints(!showHints)}
                  className="text-xs text-[var(--accent)] hover:underline"
                >
                  {showHints ? "Hide hints" : "Show hints"}
                </button>
                {showHints && (
                  <ul className="mt-2 text-sm text-[var(--muted)] list-disc pl-5 space-y-1">
                    {currentQuestion.hints.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div>
              <label className="flex items-center gap-2 text-sm text-[var(--muted)] mb-2">
                <MessageSquareText className="w-4 h-4" />
                Your answer {currentQuestion.track === "DSA" ? "(code or pseudocode welcome)" : ""}
              </label>
              <textarea
                value={answerDraft}
                onChange={(e) => setAnswerDraft(e.target.value)}
                rows={currentQuestion.track === "DSA" ? 14 : 8}
                className="code-area w-full rounded-xl bg-[var(--bg)] border border-[var(--border)] px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--muted)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 resize-y min-h-[120px]"
                placeholder="Think out loud: approach, trade-offs, examples…"
              />
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={() => recordAndGoNext()}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)]/20 hover:bg-[var(--accent)]/30 border border-[var(--accent)]/40 text-[var(--text)] font-medium py-2.5 px-5 text-sm"
              >
                {currentIndex + 1 >= questions.length ? "Finish & evaluate" : "Submit & next"}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {step === "loading" && (
        <div className="glass p-12 flex flex-col items-center justify-center text-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
          <p className="text-[var(--muted)] text-sm">
            {questions.length > 0 && !report
              ? "Analyzing your answers — scoring and building your roadmap…"
              : "Preparing your session…"}
          </p>
        </div>
      )}

      {step === "report" && report && (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-[var(--success)]" />
              Interview report
            </h2>
            <button
              type="button"
              onClick={resetAll}
              className="text-sm text-[var(--accent)] hover:underline"
            >
              New session
            </button>
          </div>

          {!aiEnabled && (
            <p className="text-xs text-[var(--warning)] border border-amber-500/25 bg-amber-500/10 rounded-lg px-3 py-2">
              Running in demo mode without <code className="text-amber-200">OPENAI_API_KEY</code>.
              Add the key for AI-generated questions and rich feedback.
            </p>
          )}

          <div className="glass p-6 md:p-8 space-y-6">
            <p className="text-[var(--muted)] leading-relaxed">{report.narrative}</p>
            <div>
              <h3 className="text-sm font-medium text-[var(--muted)] uppercase tracking-wider mb-3">
                Overall scores
              </h3>
              <ScoreBars scores={report.overall} />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="glass p-5">
              <h3 className="text-sm font-medium text-[var(--success)] mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Strengths
              </h3>
              <ul className="text-sm text-[var(--muted)] space-y-2 list-disc pl-4">
                {report.globalStrengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
            <div className="glass p-5">
              <h3 className="text-sm font-medium text-[var(--danger)] mb-3">Watch areas</h3>
              <ul className="text-sm text-[var(--muted)] space-y-2 list-disc pl-4">
                {report.globalWeaknesses.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="glass p-6 md:p-8 space-y-4">
            <h3 className="text-sm font-medium text-[var(--muted)] uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4" /> Per-question feedback
            </h3>
            <div className="space-y-6">
              {report.perQuestion.map((pq) => {
                const q = questions.find((x) => x.id === pq.questionId);
                return (
                  <div
                    key={pq.questionId}
                    className="border-t border-[var(--border)] pt-5 first:border-0 first:pt-0"
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {q && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-md border ${trackStyle(q.track)}`}
                        >
                          {q.track}
                        </span>
                      )}
                      <span className="font-medium text-sm">{q?.title ?? "Question"}</span>
                    </div>
                    <p className="text-sm text-[var(--muted)] mb-3">{pq.summary}</p>
                    <ScoreBars scores={pq.scores} size="sm" />
                    <div className="grid sm:grid-cols-3 gap-3 mt-4 text-xs">
                      <div>
                        <span className="text-[var(--success)] font-medium">+ Strengths</span>
                        <ul className="mt-1 text-[var(--muted)] list-disc pl-4 space-y-1">
                          {pq.strengths.map((x, i) => (
                            <li key={i}>{x}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <span className="text-[var(--warning)] font-medium">Gaps</span>
                        <ul className="mt-1 text-[var(--muted)] list-disc pl-4 space-y-1">
                          {pq.weaknesses.map((x, i) => (
                            <li key={i}>{x}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <span className="text-[var(--accent)] font-medium">Improve</span>
                        <ul className="mt-1 text-[var(--muted)] list-disc pl-4 space-y-1">
                          {pq.improvements.map((x, i) => (
                            <li key={i}>{x}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="glass p-6 md:p-8">
            <h3 className="text-sm font-medium text-[var(--muted)] uppercase tracking-wider mb-4">
              Personalized roadmap
            </h3>
            <div className="space-y-3">
              {[...report.roadmap]
                .sort(
                  (a, b) =>
                    ({ high: 0, medium: 1, low: 2 }[a.priority] -
                      { high: 0, medium: 1, low: 2 }[b.priority]),
                )
                .map((item, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/50 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{item.title}</span>
                      <span
                        className={`text-[10px] uppercase px-2 py-0.5 rounded ${
                          item.priority === "high"
                            ? "bg-red-500/20 text-red-300"
                            : item.priority === "medium"
                              ? "bg-amber-500/20 text-amber-200"
                              : "bg-white/10 text-[var(--muted)]"
                        }`}
                      >
                        {item.priority}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--muted)] leading-relaxed">{item.description}</p>
                    {item.suggestedResources && item.suggestedResources.length > 0 && (
                      <ul className="mt-2 text-xs text-[var(--accent)] space-y-1">
                        {item.suggestedResources.map((r, j) => (
                          <li key={j}>
                            <a href={r} target="_blank" rel="noreferrer" className="hover:underline">
                              {r}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      <footer className="mt-16 text-center text-xs text-[var(--muted)]">
        Built for practice — pair with real mock interviews for best results.
      </footer>
    </main>
  );
}
