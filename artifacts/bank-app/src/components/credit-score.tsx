interface CreditScoreProps {
  score: number;
  isLoading?: boolean;
}

export function CreditScore({ score, isLoading }: CreditScoreProps) {
  if (isLoading) {
    return (
      <div className="w-48 h-48 rounded-full bg-slate-200 animate-pulse mx-auto" />
    );
  }

  // Score range: 300 - 850
  const min = 300;
  const max = 850;
  const normalizedScore = Math.min(Math.max(score, min), max);
  const percentage = (normalizedScore - min) / (max - min);
  
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - percentage * circumference;

  let colorClass = "text-red-500";
  let statusText = "Poor";
  if (normalizedScore >= 740) {
    colorClass = "text-emerald-500";
    statusText = "Excellent";
  } else if (normalizedScore >= 670) {
    colorClass = "text-amber-500";
    statusText = "Good";
  } else if (normalizedScore >= 580) {
    colorClass = "text-orange-500";
    statusText = "Fair";
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative w-48 h-48">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
          <circle
            className="text-slate-100"
            strokeWidth="12"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx="80"
            cy="80"
          />
          <circle
            className={`${colorClass} transition-all duration-1000 ease-out`}
            strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx="80"
            cy="80"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-light text-slate-900">{normalizedScore}</span>
          <span className={`text-sm font-medium mt-1 ${colorClass}`}>{statusText}</span>
        </div>
      </div>
      <p className="text-xs text-slate-500 mt-4 text-center">
        Scores range from 300 to 850.<br/>Updated automatically.
      </p>
    </div>
  );
}
