const variants = {
  default: "bg-gray-800 border-gray-700",
  warning: "bg-gray-800 border-amber-600/60",
};

export default function KpiCard({ label, value, variant = "default" }) {
  const style = variants[variant] || variants.default;

  return (
    <div className={`border rounded-sm px-5 py-4 ${style}`}>
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
        {label}
      </p>
      <p
        className={`text-2xl font-bold tabular-nums ${
          variant === "warning" ? "text-amber-400" : "text-gray-100"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
