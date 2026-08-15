import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getLocations } from "../api/client";
import RiskBadge from "../components/RiskBadge";

export default function HighRiskLocations() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    getLocations()
      .then((data) => {
        // Backend already sorts by risk_score descending, but we can ensure it here
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
    <div className="space-y-6">
      <div className="bg-gray-900 border border-gray-800 rounded-sm p-5">
        <h1 className="text-2xl font-bold text-gray-100 mb-2">High-Risk Locations</h1>
        <p className="text-gray-400 text-sm max-w-3xl">
          Ranked list of all monitored junctions sorted by risk score. Unmanned critical 
          locations are highlighted and require immediate attention. Click any row for 
          detailed explainability and history.
        </p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-gray-500 text-sm animate-pulse">Loading locations...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-48">
            <p className="text-red-400 font-semibold mb-2">Failed to load data</p>
            <p className="text-gray-500 text-sm">{error}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead>
                <tr className="border-b border-gray-800 text-xs uppercase tracking-wider text-gray-500 bg-gray-800/30">
                  <th className="px-5 py-3 font-medium w-16 text-center">Rank</th>
                  <th className="px-5 py-3 font-medium">Location Name</th>
                  <th className="px-5 py-3 font-medium">Risk Score</th>
                  <th className="px-5 py-3 font-medium">Risk Level</th>
                  <th className="px-5 py-3 font-medium">Police Assigned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {locations.map((loc, idx) => {
                  const isUnmannedCritical = loc.unmanned_critical;
                  return (
                    <tr 
                      key={loc.junction_id} 
                      onClick={() => navigate(`/locations/${loc.junction_id}`)}
                      className={`cursor-pointer transition-colors ${
                        isUnmannedCritical 
                          ? "bg-red-900/10 hover:bg-red-900/20 border-l-2 border-l-red-500" 
                          : "hover:bg-gray-800/40 border-l-2 border-l-transparent"
                      }`}
                    >
                      <td className="px-5 py-4 font-mono text-gray-500 text-center">
                        #{idx + 1}
                      </td>
                      <td className="px-5 py-4 font-medium text-gray-200 flex items-center gap-2">
                        {loc.name}
                        {isUnmannedCritical && (
                          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                          </svg>
                        )}
                      </td>
                      <td className={`px-5 py-4 font-mono font-bold ${
                        loc.risk_level === 'Critical' ? 'text-red-500' :
                        loc.risk_level === 'High' ? 'text-orange-500' :
                        loc.risk_level === 'Medium' ? 'text-yellow-500' : 'text-emerald-500'
                      }`}>
                        {loc.risk_score}
                      </td>
                      <td className="px-5 py-4">
                        <RiskBadge level={loc.risk_level} />
                      </td>
                      <td className="px-5 py-4 font-mono text-gray-400">
                        {loc.police_assigned}
                        {isUnmannedCritical && (
                          <span className="ml-2 text-xs font-bold text-red-400 bg-red-900/30 px-2 py-0.5 rounded uppercase tracking-wider">
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
