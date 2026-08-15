import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getLocations } from "../api/client";
import RiskBadge from "../components/RiskBadge";

const TOTAL_AVAILABLE_OFFICERS = 25;

function getCoverageStatus(loc) {
  if (loc.unmanned_critical) {
    return { label: "Unmanned", color: "text-red-400", bg: "bg-red-900/30" };
  }
  if (
    loc.police_assigned === 1 &&
    (loc.risk_level === "High" || loc.risk_level === "Critical")
  ) {
    return { label: "Light Coverage", color: "text-amber-400", bg: "bg-amber-900/30" };
  }
  return { label: "Covered", color: "text-emerald-500", bg: "bg-emerald-900/20" };
}

export default function PoliceDeployment() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState("police"); // "police" | "risk"
  const navigate = useNavigate();

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);
    getLocations()
      .then((data) => {
        setLocations(data);
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
    "text-cyan-400 border-b border-cyan-400 cursor-pointer";
  const headerInactive =
    "text-gray-500 hover:text-gray-300 cursor-pointer";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-900 border border-gray-800 rounded-sm p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 mb-1">
            Police Deployment
          </h1>
          <p className="text-gray-400 text-sm max-w-2xl">
            Current officer-to-junction assignments and deployment coverage
            status across all monitored locations. Read-only view — use the
            Recommendations page to adjust assignments.
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

      {/* Summary strip */}
      {!loading && !error && (
        <div className="bg-gray-900 border border-gray-800 rounded-sm p-4 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-sm uppercase tracking-wider font-medium">
              Total Officers Deployed
            </span>
            <span className="font-mono text-lg font-bold text-cyan-400">
              {totalDeployed}
            </span>
            <span className="text-gray-600 font-mono text-lg">/</span>
            <span className="font-mono text-lg text-gray-400">
              {TOTAL_AVAILABLE_OFFICERS}
            </span>
            <span className="text-gray-600 text-sm">Available</span>
          </div>

          {/* Utilisation bar */}
          <div className="flex-1 min-w-[160px] max-w-xs">
            <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(
                    (totalDeployed / TOTAL_AVAILABLE_OFFICERS) * 100,
                    100
                  )}%`,
                  backgroundColor:
                    totalDeployed > TOTAL_AVAILABLE_OFFICERS
                      ? "#ef4444"
                      : totalDeployed / TOTAL_AVAILABLE_OFFICERS > 0.8
                      ? "#f59e0b"
                      : "#06b6d4",
                }}
              />
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex items-center gap-4 text-xs">
            <span className="text-red-400 font-medium">
              {locations.filter((l) => l.unmanned_critical).length} Unmanned
            </span>
            <span className="text-amber-400 font-medium">
              {
                locations.filter(
                  (l) =>
                    l.police_assigned === 1 &&
                    (l.risk_level === "High" || l.risk_level === "Critical")
                ).length
              }{" "}
              Light
            </span>
            <span className="text-emerald-500 font-medium">
              {
                locations.filter(
                  (l) =>
                    !l.unmanned_critical &&
                    !(
                      l.police_assigned === 1 &&
                      (l.risk_level === "High" || l.risk_level === "Critical")
                    )
                ).length
              }{" "}
              Covered
            </span>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-gray-500 text-sm animate-pulse">
              Loading deployment data…
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-48">
            <p className="text-red-400 font-semibold mb-2">
              Failed to load data
            </p>
            <p className="text-gray-500 text-sm">{error}</p>
            <button
              onClick={fetchData}
              className="mt-4 px-4 py-1.5 text-sm rounded-sm bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead>
                <tr className="border-b border-gray-800 text-xs uppercase tracking-wider bg-gray-800/30">
                  <th className="px-5 py-3 font-medium text-gray-500">
                    Location Name
                  </th>
                  <th className="px-5 py-3 font-medium text-gray-500">
                    Risk Level
                  </th>
                  <th
                    className={`px-5 py-3 font-medium select-none ${
                      sortBy === "risk" ? headerActive : headerInactive
                    }`}
                    onClick={() => setSortBy("risk")}
                    title="Sort by Risk Score"
                  >
                    Risk Score {sortBy === "risk" && "▼"}
                  </th>
                  <th
                    className={`px-5 py-3 font-medium select-none ${
                      sortBy === "police" ? headerActive : headerInactive
                    }`}
                    onClick={() => setSortBy("police")}
                    title="Sort by Police Assigned"
                  >
                    Police Assigned {sortBy === "police" && "▼"}
                  </th>
                  <th className="px-5 py-3 font-medium text-gray-500">
                    Coverage Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {sorted.map((loc) => {
                  const status = getCoverageStatus(loc);
                  return (
                    <tr
                      key={loc.junction_id}
                      onClick={() =>
                        navigate(`/locations/${loc.junction_id}`)
                      }
                      className={`cursor-pointer transition-colors ${
                        loc.unmanned_critical
                          ? "bg-red-900/10 hover:bg-red-900/20 border-l-2 border-l-red-500"
                          : "hover:bg-gray-800/40 border-l-2 border-l-transparent"
                      }`}
                    >
                      <td className="px-5 py-4 font-medium text-gray-200">
                        {loc.name}
                      </td>
                      <td className="px-5 py-4">
                        <RiskBadge level={loc.risk_level} />
                      </td>
                      <td
                        className={`px-5 py-4 font-mono font-bold ${
                          loc.risk_level === "Critical"
                            ? "text-red-500"
                            : loc.risk_level === "High"
                            ? "text-orange-500"
                            : loc.risk_level === "Medium"
                            ? "text-yellow-500"
                            : "text-emerald-500"
                        }`}
                      >
                        {loc.risk_score}
                      </td>
                      <td className="px-5 py-4 font-mono text-gray-300">
                        {loc.police_assigned}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide rounded-sm ${status.color} ${status.bg}`}
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
