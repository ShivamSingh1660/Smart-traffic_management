import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getLocations } from "../api/client";
import RiskBadge from "../components/RiskBadge";
import { AlertTriangle } from "lucide-react";

export default function HighRiskLocations() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    getLocations()
      .then((data) => {
        const sorted = [...data].sort((a, b) => b.risk_score - a.risk_score);
        setLocations(sorted);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-8">
      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold text-text-primary tracking-tight">High-Risk Locations</h1>
        <p className="mt-4 text-text-secondary font-medium max-w-3xl">
          Ranked list of all monitored junctions sorted by risk score. Unmanned critical 
          locations are highlighted and require immediate attention. Click any row for 
          detailed explainability and history.
        </p>
      </div>

      <div className="bg-bg-card backdrop-blur-xl backdrop-saturate-150 rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-text-secondary text-sm animate-pulse font-medium">Loading locations...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-48 p-8">
            <p className="text-risk-critical font-bold text-lg mb-2">Failed to load data</p>
            <p className="text-text-secondary text-sm">{error}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead>
                <tr className="border-b border-border-subtle text-text-secondary font-medium">
                  <th className="px-6 py-4 font-medium w-16 text-center">Rank</th>
                  <th className="px-6 py-4 font-medium">Location Name</th>
                  <th className="px-6 py-4 font-medium">Risk Score</th>
                  <th className="px-6 py-4 font-medium">Risk Level</th>
                  <th className="px-6 py-4 font-medium">Police Assigned</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((loc, idx) => {
                  const isUnmannedCritical = loc.unmanned_critical;
                  return (
                    <tr 
                      key={loc.junction_id} 
                      onClick={() => navigate(`/locations/${loc.junction_id}`)}
                      className={`cursor-pointer transition-colors border-b border-border-subtle last:border-0 ${
                        isUnmannedCritical 
                          ? "bg-risk-critical-bg/40 hover:bg-risk-critical-bg border-l-4 border-l-[var(--risk-critical)]" 
                          : "hover:bg-black/5 border-l-4 border-l-transparent"
                      }`}
                    >
                      <td className="px-6 py-5 font-semibold text-text-secondary text-center">
                        #{idx + 1}
                      </td>
                      <td className="px-6 py-5 font-bold text-text-primary flex items-center gap-2">
                        {loc.name}
                        {isUnmannedCritical && (
                          <AlertTriangle size={16} strokeWidth={2.5} className="text-risk-critical" />
                        )}
                      </td>
                      <td className={`px-6 py-5 font-bold ${
                        loc.risk_level === 'Critical' ? 'text-risk-critical' :
                        loc.risk_level === 'High' ? 'text-risk-high' :
                        loc.risk_level === 'Medium' ? 'text-risk-medium' : 'text-risk-low'
                      }`}>
                        {loc.risk_score}
                      </td>
                      <td className="px-6 py-5">
                        <RiskBadge level={loc.risk_level} />
                      </td>
                      <td className="px-6 py-5 font-semibold text-text-secondary">
                        {loc.police_assigned}
                        {isUnmannedCritical && (
                          <span className="ml-3 text-xs font-bold text-risk-critical bg-risk-critical-bg px-2 py-1 rounded-full uppercase tracking-wider">
                            Unmanned
                          </span>
                        )}
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
