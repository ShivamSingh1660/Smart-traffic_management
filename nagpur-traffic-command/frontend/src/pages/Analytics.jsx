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
import { RefreshCw } from "lucide-react";

const RISK_COLORS = {
  Low: "var(--risk-low)",
  Medium: "var(--risk-medium)",
  High: "var(--risk-high)",
  Critical: "var(--risk-critical)",
};

const INCIDENT_COLORS = {
  accident: "var(--risk-critical)",
  congestion: "var(--risk-high)",
  obstruction: "#a78bfa",
  violation: "var(--risk-low)",
  illegal_parking: "#f4c9a8",
};

const TOP_FEATURES = [
  { name: "Recent Accidents", key: "accident_count_recent", importance: 0.913 },
  { name: "Congestion Level", key: "congestion_level", importance: 0.051 },
  { name: "Average Speed", key: "avg_speed", importance: 0.015 },
];

function SoftTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-card backdrop-blur-xl backdrop-saturate-150 border border-border-subtle rounded-xl px-4 py-3 text-xs shadow-[var(--shadow-card)]">
      <p className="text-text-primary font-bold mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color || "var(--risk-low)" }}>
          {entry.name}: <span className="font-bold">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

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
      fill: INCIDENT_COLORS[type] || "var(--text-secondary)",
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12">
        <div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-text-primary tracking-tight">Analytics</h1>
          <p className="mt-4 text-text-secondary font-medium max-w-2xl">
            Current-snapshot distributions across risk levels and incident
            types. These charts reflect the live state of the system.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-bg-card backdrop-blur-xl backdrop-saturate-150 hover:bg-bg-card backdrop-blur-xl backdrop-saturate-150-hover text-text-primary text-sm font-semibold rounded-xl shadow-sm transition-all disabled:opacity-40"
        >
          <RefreshCw size={16} strokeWidth={2} />
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* Loading / Error */}
      {loading ? (
        <div className="bg-bg-card backdrop-blur-xl backdrop-saturate-150 rounded-2xl shadow-[var(--shadow-card)] flex items-center justify-center h-48">
          <p className="text-text-secondary text-sm animate-pulse font-medium">
            Loading analytics data…
          </p>
        </div>
      ) : error ? (
        <div className="bg-bg-card backdrop-blur-xl backdrop-saturate-150 rounded-2xl shadow-[var(--shadow-card)] flex flex-col items-center justify-center h-48 p-8">
          <p className="text-risk-critical font-bold text-lg mb-2">Failed to load data</p>
          <p className="text-text-secondary text-sm mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="px-5 py-2 text-sm rounded-xl bg-bg-card backdrop-blur-xl backdrop-saturate-150 border border-border-strong text-text-primary font-semibold hover:bg-bg-card backdrop-blur-xl backdrop-saturate-150-hover transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Panel 1: Risk Level Distribution */}
          <div className="bg-bg-card backdrop-blur-xl backdrop-saturate-150 rounded-2xl shadow-[var(--shadow-card)] p-8">
            <h2 className="text-text-primary font-bold text-xl mb-2">
              Risk Level Distribution
            </h2>
            <p className="text-xs text-text-secondary mb-8 font-medium">
              Count of locations in each risk bucket — current snapshot
            </p>

            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={riskDistribution}
                margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border-subtle)"
                  vertical={false}
                />
                <XAxis
                  dataKey="level"
                  tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
                  axisLine={{ stroke: "var(--border-strong)" }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<SoftTooltip />} />
                <Bar dataKey="count" name="Locations" radius={[8, 8, 0, 0]}>
                  {riskDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Panel 2: Incident Type Breakdown */}
          <div className="bg-bg-card backdrop-blur-xl backdrop-saturate-150 rounded-2xl shadow-[var(--shadow-card)] p-8">
            <h2 className="text-text-primary font-bold text-xl mb-2">
              Incident Type Breakdown
            </h2>
            <p className="text-xs text-text-secondary mb-8 font-medium">
              Active incidents grouped by type — current snapshot
            </p>

            {incidentBreakdown.length === 0 ? (
              <div className="flex items-center justify-center h-[240px]">
                <p className="text-text-tertiary text-sm font-medium">No incidents recorded</p>
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
                      stroke="var(--bg-card)"
                      strokeWidth={3}
                    >
                      {incidentBreakdown.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<SoftTooltip />} />
                  </PieChart>
                </ResponsiveContainer>

                {/* Legend */}
                <div className="flex-1 space-y-3">
                  {incidentBreakdown.map((entry) => (
                    <div
                      key={entry.rawType}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: entry.fill }}
                        />
                        <span className="text-text-primary font-medium">{entry.type}</span>
                      </div>
                      <span className="font-bold text-text-primary">
                        {entry.count}
                      </span>
                    </div>
                  ))}
                  <div className="pt-3 mt-3 border-t border-border-subtle flex items-center justify-between text-sm">
                    <span className="text-text-secondary font-medium">Total</span>
                    <span className="font-bold text-text-primary">
                      {incidents.length}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Panel 3: Model Info */}
          <div className="bg-bg-card backdrop-blur-xl backdrop-saturate-150 rounded-2xl shadow-[var(--shadow-card)] p-8 lg:col-span-2">
            <h2 className="text-text-primary font-bold text-xl mb-2">
              Model Info
            </h2>
            <p className="text-xs text-text-secondary mb-8 font-medium">
              Static metadata about the risk prediction model powering this
              dashboard
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Model type card */}
              <div className="bg-bg-content rounded-xl p-6">
                <p className="text-xs text-text-secondary uppercase tracking-wider mb-3 font-bold">
                  Model Type
                </p>
                <p className="text-lg font-extrabold text-text-primary">
                  Random Forest Regressor
                </p>
                <p className="text-xs text-text-secondary mt-2 font-medium">
                  scikit-learn · 100 estimators
                </p>
              </div>

              {/* Data disclaimer card */}
              <div className="bg-bg-content rounded-xl p-6">
                <p className="text-xs text-text-secondary uppercase tracking-wider mb-3 font-bold">
                  Data Source
                </p>
                <p className="text-base font-extrabold text-risk-high">
                  Simulated Data
                </p>
                <p className="text-xs text-text-secondary mt-2 font-medium">
                  All location features, incidents, and risk scores shown in
                  this dashboard are generated from synthetic data for
                  demonstration purposes.
                </p>
              </div>

              {/* Top feature importances card */}
              <div className="bg-bg-content rounded-xl p-6">
                <p className="text-xs text-text-secondary uppercase tracking-wider mb-3 font-bold">
                  Global Model Feature Importance
                </p>
                <p className="text-[10px] text-text-tertiary mb-4 font-medium">
                  Learned by the model across all training data — not a
                  single-prediction explanation
                </p>
                <div className="space-y-3">
                  {TOP_FEATURES.map((feat) => (
                    <div key={feat.key}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-text-primary font-semibold">{feat.name}</span>
                        <span className="font-bold text-risk-low">
                          {(feat.importance * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-border-strong overflow-hidden">
                        <div
                          className="h-full rounded-full bg-risk-low transition-all duration-500"
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
