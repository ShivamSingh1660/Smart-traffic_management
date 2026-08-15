import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getLocationDetail } from "../api/client";
import RiskBadge from "../components/RiskBadge";
import RiskMap from "../components/RiskMap";

export default function LocationDetail() {
  const { id } = useParams();
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    getLocationDetail(id)
      .then((data) => {
        setLocation(data);
        setLoading(false);
        setError(null);
      })
      .catch((err) => {
        if (err.message.includes("404")) {
          setError("Location not found");
        } else {
          setError(err.message);
        }
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 text-sm animate-pulse">Loading location data...</p>
      </div>
    );
  }

  if (error === "Location not found") {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-red-400 font-semibold mb-4 text-lg">Location not found</p>
        <Link to="/locations" className="text-indigo-400 hover:text-indigo-300 underline">
          &larr; Back to locations list
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center max-w-md mx-auto">
        <p className="text-red-400 font-semibold mb-2">Could not load location data</p>
        <p className="text-gray-500 text-sm mb-4">{error}</p>
        <Link to="/locations" className="text-indigo-400 hover:text-indigo-300 underline">
          &larr; Back to locations list
        </Link>
      </div>
    );
  }

  // Sort risk factors descending by contribution magnitude
  const sortedFactors = [...(location.risk_factors || [])].sort(
    (a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)
  );

  const maxContribution = sortedFactors.length > 0 ? Math.abs(sortedFactors[0].contribution) : 1;

  // Sort incidents most recent first
  const sortedIncidents = [...(location.recent_incidents || [])].sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );

  return (
    <div className="space-y-6 max-w-5xl">
      <Link to="/locations" className="inline-flex items-center text-sm text-indigo-400 hover:text-indigo-300 mb-2">
        &larr; Back to list
      </Link>
      
      {/* Header Section */}
      <div className="bg-gray-900 border border-gray-800 rounded-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-100">{location.name}</h1>
            <RiskBadge level={location.risk_level} />
          </div>
          <p className="text-gray-500 text-sm font-mono">ID: {location.junction_id}</p>
          <p className="text-indigo-500/80 text-xs font-bold uppercase tracking-widest mt-3">Simulated Data</p>
        </div>
        <div className="flex items-center gap-4 text-right">
          <div className="flex flex-col items-end">
            <span className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Risk Score</span>
            <span className={`text-5xl font-mono font-bold ${
              location.risk_level === 'Critical' ? 'text-red-500' :
              location.risk_level === 'High' ? 'text-orange-500' :
              location.risk_level === 'Medium' ? 'text-yellow-500' : 'text-emerald-500'
            }`}>
              {location.risk_score}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Why this score panel */}
          <div className="bg-gray-900 border border-gray-800 rounded-sm p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">
              Why this score? (Top Contributors)
            </h2>
            {sortedFactors.length === 0 ? (
              <p className="text-gray-500 text-sm">No specific risk factors identified.</p>
            ) : (
              <div className="space-y-4">
                {sortedFactors.map((rf, idx) => {
                  // Normalize width relative to max contribution for visual scaling
                  const widthPercent = Math.max(5, Math.abs(rf.contribution) / maxContribution * 100);
                  return (
                    <div key={idx}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-300 font-medium">{rf.factor}</span>
                        <span className="text-gray-500 font-mono">{(rf.contribution * 100).toFixed(1)}% weight</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-2">
                        <div 
                          className="bg-indigo-500 h-2 rounded-full" 
                          style={{ width: `${widthPercent}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Incidents panel */}
          <div className="bg-gray-900 border border-gray-800 rounded-sm">
             <div className="px-5 py-3 border-b border-gray-800">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                Recent Incidents
              </h2>
            </div>
            <div className="p-5">
              {sortedIncidents.length === 0 ? (
                <p className="text-gray-500 text-sm">No recent incidents.</p>
              ) : (
                <div className="divide-y divide-gray-800/50">
                  {sortedIncidents.map(inc => (
                    <div key={inc.incident_id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide
                            ${inc.severity === 'high' ? 'bg-red-900/50 text-red-400 border border-red-800' : 
                              inc.severity === 'medium' ? 'bg-orange-900/50 text-orange-400 border border-orange-800' : 
                              'bg-yellow-900/50 text-yellow-400 border border-yellow-800'}`}>
                            {inc.severity}
                          </span>
                          <span className="text-gray-300 font-medium capitalize">{inc.type}</span>
                        </div>
                        <p className="text-gray-600 text-xs mt-1">ID: {inc.incident_id}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-500 text-xs font-mono">{new Date(inc.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column */}
        <div className="space-y-6">
          
          {/* Coverage panel */}
          <div className="bg-gray-900 border border-gray-800 rounded-sm p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">
              Coverage
            </h2>
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center">
                <span className="text-xl font-bold font-mono text-gray-200">
                  {location.police_assigned}
                </span>
              </div>
              <div>
                <p className="text-gray-300 font-medium">Officers Assigned</p>
                {location.unmanned_critical && (
                  <p className="text-red-400 text-xs font-bold mt-0.5">UNMANNED CRITICAL</p>
                )}
              </div>
            </div>
            <p className="text-gray-500 text-xs mt-4">
              See <Link to="/recommendations" className="text-indigo-400 hover:text-indigo-300 underline">Recommendations page</Link> for AI-suggested staffing and moves.
            </p>
          </div>

          {/* Mini-map */}
          <div className="bg-gray-900 border border-gray-800 rounded-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-800">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                Location Map
              </h2>
            </div>
            <div className="bg-gray-800 pointer-events-none">
              <RiskMap 
                locations={[location]} 
                height="250px" 
                zoom={14} 
                compact={true} 
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
