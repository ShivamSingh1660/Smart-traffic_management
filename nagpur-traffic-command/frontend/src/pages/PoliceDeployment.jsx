import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getLocations } from "../api/client";
import RiskBadge from "../components/RiskBadge";
import EmergencyDispatchPanel from "../components/EmergencyDispatchPanel";
import { RefreshCw, ShieldAlert } from "lucide-react";

const TOTAL_AVAILABLE_OFFICERS = 60;

function getCoverageStatus(loc) {
  if (loc.unmanned_critical) {
    return { label: "Unmanned", color: "text-risk-critical", bg: "bg-risk-critical-bg" };
  }
  if (loc.police_assigned === 0) {
    return { label: "Unassigned", color: "text-risk-high", bg: "bg-risk-high-bg" };
  }
  return { label: "Covered", color: "text-risk-low", bg: "bg-risk-low-bg" };
}

export default function PoliceDeployment() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoReturns, setAutoReturns] = useState([]);
  const [sortBy, setSortBy] = useState("police"); // "police" | "risk"
  const navigate = useNavigate();

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);
    setAutoReturns([]);
    getLocations()
      .then((data) => {
        setLocations(data.locations || []);
        if (data.auto_returns && data.auto_returns.length > 0) {
          setAutoReturns(data.auto_returns);
          setTimeout(() => setAutoReturns([]), 5000);
        }
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

  const sorted = [...locations].sort((a, b) =>
    sortBy === "police"
      ? b.police_assigned - a.police_assigned
      : b.risk_score - a.risk_score
  );

  const totalDeployed = locations.reduce(
    (sum, loc) => sum + loc.police_assigned,
    0
  );

  const headerActive =
    "text-text-primary font-bold cursor-pointer";
  const headerInactive =
    "text-text-secondary hover:text-text-primary cursor-pointer font-medium";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12">
        <div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-text-primary tracking-tight">
            Police Deployment
          </h1>
          <p className="mt-4 text-text-secondary font-medium max-w-2xl">
            Current officer-to-junction assignments and deployment coverage
            status across all monitored locations.
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

      {/* Auto-Returns Toast */}
      {autoReturns.length > 0 && (
        <div className="bg-risk-low/10 border border-risk-low/30 p-4 rounded-xl shadow-lg mb-6 flex items-start gap-3">
          <div className="text-risk-low font-bold">
            <ShieldAlert size={20} />
          </div>
          <div>
            <h3 className="text-risk-low font-bold text-sm">AI auto-returned {autoReturns.reduce((sum, r) => sum + r.count, 0)} officer(s)</h3>
            <ul className="text-sm text-text-primary mt-1 space-y-1">
              {autoReturns.map((r, i) => (
                <li key={i}>
                  [{r.to_junction}] risk resolved, officers sent back to [{r.from_junction}].
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Emergency Dispatch Panel */}
      <EmergencyDispatchPanel onDispatchSuccess={fetchData} />

      {/* Summary strip */}
      {!loading && !error && (
        <div className="bg-bg-card backdrop-blur-xl backdrop-saturate-150 rounded-2xl shadow-[var(--shadow-card)] border border-transparent hover:border-amber-500 p-6 flex flex-wrap items-center gap-8 transition-colors duration-200">
          <div className="flex items-center gap-3">
            <span className="text-text-secondary text-sm font-medium">
              Total Officers Deployed
            </span>
            <span className="text-2xl font-bold text-text-primary">
              {totalDeployed}
            </span>
            <span className="text-text-tertiary text-lg font-medium">/</span>
            <span className="text-lg text-text-secondary font-semibold">
              {TOTAL_AVAILABLE_OFFICERS}
            </span>
            <span className="text-text-tertiary text-sm font-medium">Available</span>
          </div>

          {/* Utilisation bar */}
          <div className="flex-1 min-w-[160px] max-w-xs">
            <div className="h-2.5 rounded-full bg-bg-card backdrop-blur-xl backdrop-saturate-150-hover overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(
                    (totalDeployed / TOTAL_AVAILABLE_OFFICERS) * 100,
                    100
                  )}%`,
                  backgroundColor:
                    totalDeployed > TOTAL_AVAILABLE_OFFICERS
                      ? "var(--risk-critical)"
                      : totalDeployed / TOTAL_AVAILABLE_OFFICERS > 0.8
                      ? "var(--risk-high)"
                      : "var(--risk-low)",
                }}
              />
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex items-center gap-4 text-xs font-bold">
            <span className="text-risk-critical bg-risk-critical-bg px-2.5 py-1 rounded-full">
              {locations.filter((l) => l.unmanned_critical).length} Unmanned
            </span>
            <span className="text-risk-high bg-risk-high-bg px-2.5 py-1 rounded-full">
              {
                locations.filter(
                  (l) => !l.unmanned_critical && l.police_assigned === 0
                ).length
              }{" "}
              Unassigned
            </span>
            <span className="text-risk-low bg-risk-low-bg px-2.5 py-1 rounded-full">
              {
                locations.filter((l) => l.police_assigned > 0).length
              }{" "}
              Covered
            </span>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-bg-card backdrop-blur-xl backdrop-saturate-150 rounded-2xl shadow-[var(--shadow-card)] border border-transparent hover:border-amber-500 overflow-hidden transition-colors duration-200">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-text-secondary text-sm animate-pulse font-medium">
              Loading deployment data…
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-48 p-8">
            <p className="text-risk-critical font-bold text-lg mb-2">
              Failed to load data
            </p>
            <p className="text-text-secondary text-sm mb-4">{error}</p>
            <button
              onClick={fetchData}
              className="px-5 py-2 text-sm rounded-xl bg-bg-card backdrop-blur-xl backdrop-saturate-150 border border-border-strong text-text-primary font-semibold hover:bg-bg-card backdrop-blur-xl backdrop-saturate-150-hover transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead>
                <tr className="border-b border-border-subtle text-text-secondary">
                  <th className="px-6 py-4 font-medium">
                    Location Name
                  </th>
                  <th className="px-6 py-4 font-medium">
                    Risk Level
                  </th>
                  <th
                    className={`px-6 py-4 select-none ${
                      sortBy === "risk" ? headerActive : headerInactive
                    }`}
                    onClick={() => setSortBy("risk")}
                    title="Sort by Risk Score"
                  >
                    Risk Score {sortBy === "risk" && "▼"}
                  </th>
                  <th
                    className={`px-6 py-4 select-none ${
                      sortBy === "police" ? headerActive : headerInactive
                    }`}
                    onClick={() => setSortBy("police")}
                    title="Sort by Police Assigned"
                  >
                    Police Assigned {sortBy === "police" && "▼"}
                  </th>
                  <th className="px-6 py-4 font-medium">
                    Coverage Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((loc) => {
                  const status = getCoverageStatus(loc);
                  return (
                    <tr
                      key={loc.junction_id}
                      onClick={() =>
                        navigate(`/locations/${loc.junction_id}`)
                      }
                      className={`cursor-pointer transition-colors border-b border-border-subtle last:border-0 ${
                        loc.unmanned_critical
                          ? "bg-risk-critical-bg/40 hover:bg-risk-critical-bg border-l-4 border-l-[var(--risk-critical)]"
                          : "hover:bg-black/5 border-l-4 border-l-transparent"
                      }`}
                    >
                      <td className="px-6 py-5 font-bold text-text-primary">
                        {loc.name}
                      </td>
                      <td className="px-6 py-5">
                        <RiskBadge level={loc.risk_level} />
                      </td>
                      <td
                        className={`px-6 py-5 font-bold ${
                          loc.risk_level === "Critical"
                            ? "text-risk-critical"
                            : loc.risk_level === "High"
                            ? "text-risk-high"
                            : loc.risk_level === "Medium"
                            ? "text-risk-medium"
                            : "text-risk-low"
                        }`}
                      >
                        {loc.risk_score}
                      </td>
                      <td className="px-6 py-5 font-semibold text-text-secondary">
                        {loc.police_assigned}
                      </td>
                      <td className="px-6 py-5">
                        <span
                          className={`inline-block px-3 py-1 text-xs font-bold rounded-full ${status.color} ${status.bg}`}
                        >
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
