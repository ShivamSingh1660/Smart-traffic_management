const levelStyles = {
  Critical: "bg-risk-critical-bg text-risk-critical",
  High: "bg-risk-high-bg text-risk-high",
  Medium: "bg-risk-medium-bg text-risk-medium",
  Low: "bg-risk-low-bg text-risk-low",
};

export default function RiskBadge({ level }) {
  const style = levelStyles[level] || levelStyles.Low;

  return (
    <span
      className={`inline-block px-3 py-1 text-xs font-bold tracking-wide rounded-full transition-colors ${style}`}
    >
      {level}
    </span>
  );
}
