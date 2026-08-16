import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getLocationDetail } from "../api/client";
import RiskBadge from "../components/RiskBadge";
import RiskMap from "../components/RiskMap";
import { ArrowLeft, Users } from "lucide-react";

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
      <div className="flex items-center justify-center h-64 bg-bg-card backdrop-blur-xl backdrop-saturate-150 rounded-2xl shadow-[var(--shadow-card)]">
        <p className="text-text-secondary text-sm animate-pulse font-medium">Loading location data...</p>
      </div>
    );
  }

  if (error === "Location not found") {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-bg-card backdrop-blur-xl backdrop-saturate-150 rounded-2xl shadow-[var(--shadow-card)]">
        <p className="text-risk-critical font-bold text-lg mb-4">Location not found</p>
        <Link to="/locations" className="text-text-primary hover:text-text-secondary font-semibold text-sm flex items-center gap-2">
          <ArrowLeft size={16} /> Back to locations list
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-bg-card backdrop-blur-xl backdrop-saturate-150 rounded-2xl shadow-[var(--shadow-card)] text-center max-w-md mx-auto p-8">
        <p className="text-risk-critical font-bold text-lg mb-2">Could not load location data</p>
        <p className="text-text-secondary text-sm mb-4">{error}</p>
        <Link to="/locations" className="text-text-primary hover:text-text-secondary font-semibold text-sm flex items-center gap-2">
          <ArrowLeft size={16} /> Back to locations list
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
    <div className="space-y-8 max-w-5xl">
      <Link to="/locations" className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary font-semibold transition-colors">
        <ArrowLeft size={16} /> Back to list
      </Link>
      
      {/* Header Section */}
      <div className="bg-bg-card backdrop-blur-xl backdrop-saturate-150 rounded-2xl shadow-[var(--shadow-card)] p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl md:text-4xl font-extrabold text-text-primary tracking-tight">{location.name}</h1>
            <RiskBadge level={location.risk_level} />
          </div>
          <p className="text-text-secondary text-sm font-medium">ID: {location.junction_id}</p>
        </div>
        <div className="flex items-center gap-4 text-right">
          <div className="flex flex-col items-end">
            <span className="text-text-secondary text-xs font-bold uppercase tracking-wider mb-2">Risk Score</span>
            <span className={`text-5xl font-bold tracking-tight ${
              location.risk_level === 'Critical' ? 'text-risk-critical' :
              location.risk_level === 'High' ? 'text-risk-high' :
              location.risk_level === 'Medium' ? 'text-risk-medium' : 'text-risk-low'
            }`}>
              {location.risk_score}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Why this score panel */}
          <div className="bg-bg-card backdrop-blur-xl backdrop-saturate-150 rounded-2xl shadow-[var(--shadow-card)] p-8">
            <h2 className="text-text-primary font-bold text-xl mb-6">
              Why this score? (Top Contributors)
            </h2>
            {sortedFactors.length === 0 ? (
              <p className="text-text-secondary text-sm font-medium">No specific risk factors identified.</p>
            ) : (
              <div className="space-y-5">
                {sortedFactors.map((rf, idx) => {
                  // Normalize width relative to max contribution for visual scaling
                  const widthPercent = Math.max(5, Math.abs(rf.contribution) / maxContribution * 100);
                  return (
                    <div key={idx}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-text-primary font-semibold">{rf.factor}</span>
                        <span className="text-text-secondary font-medium">{(rf.contribution * 100).toFixed(1)}% weight</span>
                      </div>
                      <div className="w-full bg-bg-card backdrop-blur-xl backdrop-saturate-150-hover rounded-full h-2.5">
                        <div 
                          className="bg-risk-low h-2.5 rounded-full transition-all duration-500" 
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
          <div className="bg-bg-card backdrop-blur-xl backdrop-saturate-150 rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
             <div className="px-8 py-6 border-b border-border-subtle">
              <h2 className="text-text-primary font-bold text-xl">
                Recent Incidents
              </h2>
            </div>
            <div className="p-6">
              {sortedIncidents.length === 0 ? (
                <p className="text-text-secondary text-sm font-medium">No recent incidents.</p>
              ) : (
                <div className="divide-y divide-black/5">
                  {sortedIncidents.map(inc => (
                    <div key={inc.incident_id} className="py-4 first:pt-0 last:pb-0 flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide
                            ${inc.severity === 'high' ? 'bg-risk-critical-bg text-risk-critical' : 
                              inc.severity === 'medium' ? 'bg-risk-high-bg text-risk-high' : 
                              'bg-risk-medium-bg text-risk-medium'}`}>
                            {inc.severity}
                          </span>
                          <span className="text-text-primary font-semibold capitalize">{inc.type}</span>
                        </div>
                        <p className="text-text-tertiary text-xs mt-1">ID: {inc.incident_id}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-text-secondary text-xs font-medium">{new Date(inc.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column */}
        <div className="space-y-8">
          
          {/* Coverage panel */}
          <div className="bg-bg-card backdrop-blur-xl backdrop-saturate-150 rounded-2xl shadow-[var(--shadow-card)] p-8">
            <h2 className="text-text-primary font-bold text-xl mb-6">
              Coverage
            </h2>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-full bg-bg-content flex items-center justify-center">
                <span className="text-2xl font-bold text-text-primary">
                  {location.police_assigned}
                </span>
              </div>
              <div>
                <p className="text-text-primary font-semibold">Officers Assigned</p>
                {location.unmanned_critical && (
                  <p className="text-risk-critical text-xs font-bold mt-1">UNMANNED CRITICAL</p>
                )}
              </div>
            </div>
            <p className="text-text-secondary text-xs mt-6">
              See <Link to="/recommendations" className="text-text-primary hover:text-text-secondary font-semibold underline">Recommendations page</Link> for AI-suggested staffing and moves.
            </p>
          </div>

          {/* Mini-map */}
          <div className="bg-bg-card backdrop-blur-xl backdrop-saturate-150 rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
            <div className="px-8 py-6 border-b border-border-subtle">
              <h2 className="text-text-primary font-bold text-xl">
                Location Map
              </h2>
            </div>
            <div>
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
