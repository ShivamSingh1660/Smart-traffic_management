import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getLocations } from "../api/client";
import KpiCard from "../components/KpiCard";
import RiskBadge from "../components/RiskBadge";
import RiskMap from "../components/RiskMap";
import { MapPin, ShieldAlert, Users, LayoutGrid, RefreshCw } from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();

  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoReturns, setAutoReturns] = useState([]);

  const fetchData = () => {
    setLoading(true);
    setAutoReturns([]);
    getLocations()
      .then((data) => {
        setLocations(data.locations || []);
        if (data.auto_returns && data.auto_returns.length > 0) {
          setAutoReturns(data.auto_returns);
          // auto hide after 5s
          setTimeout(() => setAutoReturns([]), 5000);
        }
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

  const topRiskLocations = [...locations]
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-text-secondary text-sm animate-pulse font-medium">
          Loading dashboard data...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 bg-bg-card backdrop-blur-xl backdrop-saturate-150 rounded-2xl shadow-[var(--shadow-card)]">
        <div className="text-center max-w-md p-8">
          <p className="text-risk-critical font-bold text-lg mb-2">
            Could not load location data
          </p>
          <p className="text-text-secondary text-sm mb-4">{error}</p>
          <p className="text-text-secondary text-xs">
            Is the backend running? Start it with: <br />
            <code className="text-text-primary bg-bg-card backdrop-blur-xl backdrop-saturate-150-hover px-2 py-1 rounded-md mt-2 inline-block">
              uvicorn main:app --reload --port 8000
            </code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
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

      {/* Page heading */}
      <div className="flex justify-between items-end mb-12">
        <div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-text-primary tracking-tight">Dashboard</h1>
          <p className="mt-4 text-text-secondary font-medium">
            Overview of live traffic conditions and risk metrics.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-5 py-2.5 bg-bg-card backdrop-blur-xl backdrop-saturate-150 hover:bg-bg-card backdrop-blur-xl backdrop-saturate-150-hover text-text-primary text-sm font-semibold rounded-xl shadow-sm transition-all"
        >
          <RefreshCw size={16} strokeWidth={2} />
          Refresh
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard label="Monitored Locations" value={totalLocations} icon={<LayoutGrid size={20} className="text-text-secondary" strokeWidth={1.5} />} />
        <KpiCard label="Critical Risk" value={criticalLocations} icon={<ShieldAlert size={20} className="text-text-secondary" strokeWidth={1.5} />} />
        <KpiCard
          label="Unmanned Critical"
          value={unmannedCritical}
          variant="warning"
          icon={<MapPin size={20} className="text-risk-critical" strokeWidth={1.5} />}
        />
        <KpiCard
          label="Officers Deployed"
          value={officersDeployed}
          icon={<Users size={20} className="text-text-secondary" strokeWidth={1.5} />}
        />
      </div>

      {/* Two-column: risk list + map */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ---- Top 5 High-Risk Locations ---- */}
        <div className="bg-bg-card backdrop-blur-xl backdrop-saturate-150 rounded-2xl shadow-[var(--shadow-card)] overflow-hidden flex flex-col">
          <div className="px-8 py-6 border-b border-border-subtle">
            <h2 className="text-text-primary font-bold text-xl">
              Top 5 High-Risk Locations
            </h2>
          </div>

          <div className="overflow-x-auto flex-1 p-2">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-border-subtle text-text-secondary font-medium">
                  <th className="px-6 py-4 font-medium">#</th>
                  <th className="px-6 py-4 font-medium">Location</th>
                  <th className="px-6 py-4 font-medium text-right">Risk</th>
                  <th className="px-6 py-4 font-medium">Level</th>
                  <th className="px-6 py-4 font-medium text-right">Police</th>
                </tr>
              </thead>
              <tbody>
                {topRiskLocations.map((loc, idx) => (
                  <tr
                    key={loc.junction_id}
                    onClick={() => navigate(`/locations/${loc.junction_id}`)}
                    className="border-b border-border-subtle hover:bg-black/5 transition-colors cursor-pointer last:border-0"
                  >
                    <td className="px-6 py-4 text-text-secondary font-semibold">
                      {idx + 1}
                    </td>
                    <td className="px-6 py-4 text-text-primary font-semibold">
                      {loc.name}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-text-primary">
                      {loc.risk_score}
                    </td>
                    <td className="px-6 py-4">
                      <RiskBadge level={loc.risk_level} />
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-text-secondary">
                      {loc.police_assigned}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ---- Live Risk Map ---- */}
        <div className="bg-bg-card backdrop-blur-xl backdrop-saturate-150 rounded-2xl shadow-[var(--shadow-card)] overflow-hidden flex flex-col min-h-[400px]">
          <div className="px-8 py-6 border-b border-border-subtle relative z-10 bg-bg-card backdrop-blur-xl backdrop-saturate-150">
            <h2 className="text-text-primary font-bold text-xl">
              Live Risk Map
            </h2>
          </div>
          <div className="flex-1 relative z-0">
            <RiskMap
              locations={locations}
              height="100%"
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
