import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getLocations } from "../api/client";
import KpiCard from "../components/KpiCard";
import RiskBadge from "../components/RiskBadge";
import RiskMap from "../components/RiskMap";

/* ------------------------------------------------------------------ */
/*  Dashboard page — fetches live data from the backend               */
/* ------------------------------------------------------------------ */

export default function Dashboard() {
  const navigate = useNavigate();

  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = () => {
    setLoading(true);
    getLocations()
      .then((data) => {
        setLocations(data);
        setLoading(false);
        setError(null);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  /* ---- Derive KPIs from fetched data ---- */
  const totalLocations = locations.length;
  const criticalLocations = locations.filter(
    (l) => l.risk_level === "Critical"
  ).length;
  const unmannedCritical = locations.filter(
    (l) => l.unmanned_critical
  ).length;
  const officersDeployed = locations.reduce(
    (sum, l) => sum + l.police_assigned,
    0
  );

  /* ---- Top 5 by risk score ---- */
  const topRiskLocations = [...locations]
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, 5);

  /* ---- Loading state ---- */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 text-sm animate-pulse">
          Loading dashboard data...
        </p>
      </div>
    );
  }

  /* ---- Error state ---- */
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center max-w-md">
          <p className="text-red-400 font-semibold mb-2">
            Could not load location data
          </p>
          <p className="text-gray-500 text-sm">{error}</p>
          <p className="text-gray-600 text-xs mt-3">
            Is the backend running? Start it with:{" "}
            <code className="text-gray-400">
              uvicorn main:app --reload --port 8000
            </code>
          </p>
        </div>
      </div>
    );
  }

  /* ---- Loaded state ---- */
  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Showing simulated data. Live data will connect in a later development
            stage.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium rounded border border-gray-700 transition-colors"
        >
          Refresh Data
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Monitored Locations" value={totalLocations} />
        <KpiCard label="Critical Risk Locations" value={criticalLocations} />
        <KpiCard
          label="Unmanned Critical Locations"
          value={unmannedCritical}
          variant="warning"
        />
        <KpiCard
          label="Officers Deployed"
          value={officersDeployed}
        />
      </div>

      {/* Two-column: risk list + map */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ---- Top 5 High-Risk Locations ---- */}
        <div className="bg-gray-900 border border-gray-800 rounded-sm">
          <div className="px-5 py-3 border-b border-gray-800">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
              Top 5 High-Risk Locations
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-gray-800 text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-5 py-3 font-medium">#</th>
                  <th className="px-5 py-3 font-medium">Location</th>
                  <th className="px-5 py-3 font-medium text-right">Risk</th>
                  <th className="px-5 py-3 font-medium">Level</th>
                  <th className="px-5 py-3 font-medium text-right">Police</th>
                </tr>
              </thead>
              <tbody>
                {topRiskLocations.map((loc, idx) => (
                  <tr
                    key={loc.junction_id}
                    onClick={() => navigate(`/locations/${loc.junction_id}`)}
                    className="border-b border-gray-800/50 hover:bg-gray-800/40 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3 text-gray-500 font-mono">
                      {idx + 1}
                    </td>
                    <td className="px-5 py-3 text-gray-200 font-medium">
                      {loc.name}
                    </td>
                    <td className="px-5 py-3 text-right font-mono font-semibold text-gray-100">
                      {loc.risk_score}
                    </td>
                    <td className="px-5 py-3">
                      <RiskBadge level={loc.risk_level} />
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-gray-300">
                      {loc.police_assigned}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ---- Live Risk Map ---- */}
        <div className="bg-gray-900 border border-gray-800 rounded-sm flex flex-col">
          <div className="px-5 py-3 border-b border-gray-800">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
              Live Risk Map
            </h2>
          </div>
          <div className="flex-1">
            <RiskMap
              locations={locations}
              height="400px"
              zoom={11}
              showLegend={true}
              compact={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
