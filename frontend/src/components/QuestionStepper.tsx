import type { Question } from "../types";

export default function QuestionStepper({
  questions,
  current,
  passedSet,
  onSelect,
}: {
  questions: Question[];
  current: number;
  passedSet: Set<string>;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {questions.map((q, i) => {
        const isPassed = passedSet.has(q.id);
        const isCurrent = i === current;
        // 第 1 题始终可做；第 i 题(i≥2)仅当第 i-1 题通过才解锁
        const isLocked = i > 0 && !passedSet.has(questions[i - 1].id);
        return (
          <button
            key={q.id}
            disabled={isLocked}
            onClick={() => onSelect(i)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              isCurrent
                ? "bg-primary text-white"
                : isLocked
                  ? "bg-slate-50 text-slate-300 cursor-not-allowed"
                  : isPassed
                    ? "bg-success/10 text-success hover:bg-success/20"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <span className="font-medium">{i + 1}</span>
            {isPassed && <span>✓</span>}
            {isLocked && <span>🔒</span>}
          </button>
        );
      })}
    </div>
  );
}
