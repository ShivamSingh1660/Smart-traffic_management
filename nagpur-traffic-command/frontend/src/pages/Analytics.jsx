import { useState, useEffect, useCallback } from "react";
import { getLocations, getIncidents } from "../api/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const RISK_COLORS = {
  Low: "#22c55e",
  Medium: "#eab308",
  High: "#f97316",
  Critical: "#ef4444",
};

const INCIDENT_COLORS = {
  accident: "#ef4444",
  congestion: "#f59e0b",
  obstruction: "#8b5cf6",
  violation: "#06b6d4",
  illegal_parking: "#ec4899",
};

const TOP_FEATURES = [
  { name: "Recent Accidents", key: "accident_count_recent", importance: 0.913 },
  { name: "Congestion Level", key: "congestion_level", importance: 0.051 },
  { name: "Average Speed", key: "avg_speed", importance: 0.015 },
];

/* ------------------------------------------------------------------ */
/*  Custom dark-themed tooltip                                        */
/* ------------------------------------------------------------------ */

function DarkTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-sm px-3 py-2 text-xs shadow-lg">
      <p className="text-gray-300 font-medium mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color || "#06b6d4" }}>
          {entry.name}: <span className="font-mono font-bold">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function Analytics() {
  const [locations, setLocations] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([getLocations(), getIncidents()])
      .then(([locs, incs]) => {
        setLocations(locs);
        setIncidents(incs);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ---------- Derived data ---------- */

  // Risk level distribution
  const riskDistribution = ["Low", "Medium", "High", "Critical"].map(
    (level) => ({
      level,
      count: locations.filter((l) => l.risk_level === level).length,
      fill: RISK_COLORS[level],
    })
  );

  // Incident type breakdown
  const typeCounts = {};
  incidents.forEach((inc) => {
    const t = inc.type || "unknown";
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  });
  const incidentBreakdown = Object.entries(typeCounts)
    .map(([type, count]) => ({
      type: type.charAt(0).toUpperCase() + type.slice(1),
      rawType: type,
      count,
      fill: INCIDENT_COLORS[type] || "#6b7280",
    }))
    .sort((a, b) => b.count - a.count);

  /* ------------------------------------------------------------------ */
  /*  Render                                                            */
  /* ------------------------------------------------------------------ */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-900 border border-gray-800 rounded-sm p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 mb-1">Analytics</h1>
          <p className="text-gray-400 text-sm max-w-2xl">
            Current-snapshot distributions across risk levels and incident
            types. These charts reflect the live state of the system, not
            historical trends.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="shrink-0 px-4 py-2 text-sm font-medium rounded-sm bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors disabled:opacity-40"
        >
          {loading ? "Refreshing…" : "↻ Refresh"}
        </button>
      </div>

      {/* Loading / Error */}
      {loading ? (
        <div className="bg-gray-900 border border-gray-800 rounded-sm flex items-center justify-center h-48">
          <p className="text-gray-500 text-sm animate-pulse">
            Loading analytics data…
          </p>
        </div>
      ) : error ? (
        <div className="bg-gray-900 border border-gray-800 rounded-sm flex flex-col items-center justify-center h-48">
          <p className="text-red-400 font-semibold mb-2">Failed to load data</p>
          <p className="text-gray-500 text-sm">{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-1.5 text-sm rounded-sm bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ====== Panel 1: Risk Level Distribution ====== */}
          <div className="bg-gray-900 border border-gray-800 rounded-sm p-5">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-1">
              Risk Level Distribution
            </h2>
            <p className="text-xs text-gray-500 mb-5">
              Count of locations in each risk bucket — current snapshot
            </p>

            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={riskDistribution}
                margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#1f2937"
                  vertical={false}
                />
                <XAxis
                  dataKey="level"
                  tick={{ fill: "#9ca3af", fontSize: 12 }}
                  axisLine={{ stroke: "#374151" }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<DarkTooltip />} />
                <Bar dataKey="count" name="Locations" radius={[4, 4, 0, 0]}>
                  {riskDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ====== Panel 2: Incident Type Breakdown ====== */}
          <div className="bg-gray-900 border border-gray-800 rounded-sm p-5">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-1">
              Incident Type Breakdown
            </h2>
            <p className="text-xs text-gray-500 mb-5">
              Active incidents grouped by type — current snapshot
            </p>

            {incidentBreakdown.length === 0 ? (
              <div className="flex items-center justify-center h-[240px]">
                <p className="text-gray-600 text-sm">No incidents recorded</p>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="55%" height={240}>
                  <PieChart>
                    <Pie
                      data={incidentBreakdown}
                      dataKey="count"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={3}
                      stroke="#111827"
                      strokeWidth={2}
                    >
                      {incidentBreakdown.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<DarkTooltip />} />
                  </PieChart>
                </ResponsiveContainer>

                {/* Legend */}
                <div className="flex-1 space-y-2">
                  {incidentBreakdown.map((entry) => (
                    <div
                      key={entry.rawType}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-sm shrink-0"
                          style={{ backgroundColor: entry.fill }}
                        />
                        <span className="text-gray-300">{entry.type}</span>
                      </div>
                      <span className="font-mono font-bold text-gray-200">
                        {entry.count}
                      </span>
                    </div>
                  ))}
                  <div className="pt-2 mt-2 border-t border-gray-800 flex items-center justify-between text-sm">
                    <span className="text-gray-500">Total</span>
                    <span className="font-mono font-bold text-cyan-400">
                      {incidents.length}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ====== Panel 3: Model Info ====== */}
          <div className="bg-gray-900 border border-gray-800 rounded-sm p-5 lg:col-span-2">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-1">
              Model Info
            </h2>
            <p className="text-xs text-gray-500 mb-5">
              Static metadata about the risk prediction model powering this
              dashboard
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Model type card */}
              <div className="bg-gray-800/50 border border-gray-700/40 rounded-sm p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                  Model Type
                </p>
                <p className="text-lg font-bold text-gray-100">
                  Random Forest Regressor
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  scikit-learn · 100 estimators
                </p>
              </div>

              {/* Data disclaimer card */}
              <div className="bg-gray-800/50 border border-gray-700/40 rounded-sm p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                  Data Source
                </p>
                <p className="text-base font-semibold text-amber-400">
                  Simulated Data
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  All location features, incidents, and risk scores shown in
                  this dashboard are generated from synthetic data for
                  demonstration purposes.
                </p>
              </div>

              {/* Top feature importances card */}
              <div className="bg-gray-800/50 border border-gray-700/40 rounded-sm p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                  Global Model Feature Importance
                </p>
                <p className="text-[10px] text-gray-600 mb-3">
                  Learned by the model across all training data — not a
                  single-prediction explanation
                </p>
                <div className="space-y-2.5">
                  {TOP_FEATURES.map((feat) => (
                    <div key={feat.key}>
                      <div className="flex items-center justify-between text-xs mb-0.5">
                        <span className="text-gray-300">{feat.name}</span>
                        <span className="font-mono text-cyan-400">
                          {(feat.importance * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-700 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-cyan-500 transition-all duration-500"
                          style={{ width: `${feat.importance * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
