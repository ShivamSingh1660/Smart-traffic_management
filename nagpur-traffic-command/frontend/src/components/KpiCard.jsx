import { HelpCircle } from "lucide-react";

export default function KpiCard({ label, value, variant = "default", icon }) {
  const isWarning = variant === "warning";

  return (
    <div className="bg-bg-card backdrop-blur-xl backdrop-saturate-150 rounded-2xl shadow-[var(--shadow-card)] border border-transparent hover:border-amber-500 hover:scale-[1.03] p-6 flex flex-col justify-between transition-all duration-200">
      <div className="flex items-center gap-2 mb-6">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isWarning ? 'bg-risk-critical-bg' : 'bg-bg-content'}`}>
          {icon || <HelpCircle className={isWarning ? 'text-risk-critical' : 'text-text-secondary'} size={20} strokeWidth={1.5} />}
        </div>
        <span className="text-text-secondary font-medium text-sm ml-2 transition-colors">{label}</span>
      </div>
      
      <div>
        <span className={`text-4xl md:text-5xl font-bold tracking-tight transition-colors ${isWarning ? 'text-risk-critical' : 'text-text-primary'}`}>
          {value}
        </span>
      </div>
    </div>
  );
}
