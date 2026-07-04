interface CreditScoreProps {
  score: number;
  isLoading?: boolean;
}

function getScoreMeta(score: number) {
  if (score >= 750) return { color: "#3b82f6", dotColor: "#f59e0b", label: "Ekselan" };
  if (score >= 650) return { color: "#22c55e", dotColor: "#22c55e", label: "Bon" };
  if (score >= 500) return { color: "#eab308", dotColor: "#eab308", label: "Pasab" };
  return { color: "#ef4444", dotColor: "#ef4444", label: "Move" };
}

export function CreditScore({ score, isLoading }: CreditScoreProps) {
  const size = 120;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const min = 300;
  const max = 850;
  const normalized = Math.min(Math.max(score, min), max);
  const percentage = (normalized - min) / (max - min);
  const offset = circumference - percentage * circumference;

  const meta = getScoreMeta(normalized);

  if (isLoading) {
    return (
      <div className="flex items-center gap-6">
        <div className="w-[120px] h-[120px] rounded-full bg-slate-100 animate-pulse flex-shrink-0" />
        <div className="space-y-2">
          <div className="h-4 w-20 bg-slate-100 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-8">
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={meta.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1s ease-out, stroke 0.5s ease" }}
          />
        </svg>
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ pointerEvents: "none" }}
        >
          <span className="text-2xl font-semibold text-slate-900 leading-none">{normalized}</span>
          <span className="text-xs text-slate-400 mt-1 leading-none">/ 850</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: meta.dotColor }}
        />
        <span className="text-base font-medium text-slate-800">{meta.label}</span>
      </div>
    </div>
  );
}
