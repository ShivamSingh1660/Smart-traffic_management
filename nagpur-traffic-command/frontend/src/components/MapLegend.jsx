const legendItems = [
  { color: "#ef4444", label: "Critical (81–100)" },
  { color: "#f97316", label: "High (61–80)" },
  { color: "#eab308", label: "Medium (31–60)" },
  { color: "#22c55e", label: "Low (0–30)" },
];

export default function MapLegend({ compact = false }) {
  if (compact) {
    return (
      <div className="absolute bottom-3 left-3 z-[1000] bg-gray-900/95 border border-gray-700 rounded-sm px-2.5 py-2 text-[10px] text-gray-400 pointer-events-auto">
        <div className="flex items-center gap-2.5 flex-wrap">
          {legendItems.map((item) => (
            <span key={item.label} className="flex items-center gap-1">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              {item.label.split(" ")[0]}
            </span>
          ))}
          <span className="flex items-center gap-1">
            <span
              className="inline-block w-2 h-2 rounded-full border border-white"
              style={{ backgroundColor: "#ef4444" }}
            />
            Unmanned
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute bottom-6 left-6 z-[1000] bg-gray-900/95 border border-gray-700 rounded-sm px-4 py-3 text-xs text-gray-300 space-y-2 pointer-events-auto">
      <p className="font-semibold uppercase tracking-wider text-gray-400 text-[10px] mb-1">
        Risk Level
      </p>
      {legendItems.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span
            className="inline-block w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: item.color }}
          />
          <span>{item.label}</span>
        </div>
      ))}
      {/* Unmanned critical indicator */}
      <div className="border-t border-gray-700 pt-2 mt-2 flex items-center gap-2">
        <span className="relative inline-flex items-center justify-center w-3 h-3 flex-shrink-0">
          <span
            className="absolute inset-0 rounded-full opacity-50"
            style={{ backgroundColor: "#ef4444", boxShadow: "0 0 0 3px rgba(239,68,68,0.35)" }}
          />
          <span
            className="inline-block w-3 h-3 rounded-full border-2 border-white"
            style={{ backgroundColor: "#ef4444" }}
          />
        </span>
        <span>Unmanned Critical</span>
      </div>
    </div>
  );
}
