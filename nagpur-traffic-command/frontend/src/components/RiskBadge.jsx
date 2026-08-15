const levelStyles = {
  Critical: "bg-red-900/50 text-red-400 border border-red-700/40",
  High: "bg-orange-900/50 text-orange-400 border border-orange-700/40",
  Medium: "bg-yellow-900/50 text-yellow-400 border border-yellow-700/40",
  Low: "bg-green-900/50 text-green-400 border border-green-700/40",
};

export default function RiskBadge({ level }) {
  const style = levelStyles[level] || levelStyles.Low;

  return (
    <span
      className={`inline-block px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide rounded-sm ${style}`}
    >
      {level}
    </span>
  );
}
