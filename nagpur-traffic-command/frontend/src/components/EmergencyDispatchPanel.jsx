import React, { useState, useEffect } from "react";
import { getReservePool, getLocations, dispatchEmergency } from "../api/client";
import { AlertOctagon, ShieldAlert, CheckCircle, AlertTriangle } from "lucide-react";

export default function EmergencyDispatchPanel({ onDispatchSuccess }) {
  const [reserve, setReserve] = useState(null);
  const [reserveLoading, setReserveLoading] = useState(true);
  
  const [locations, setLocations] = useState([]);
  const [selectedJunction, setSelectedJunction] = useState("");
  const [officersNeeded, setOfficersNeeded] = useState(1);
  
  const [dispatching, setDispatching] = useState(false);
  const [dispatchResult, setDispatchResult] = useState(null);
  const [error, setError] = useState(null);

  const fetchInitialData = () => {
    setReserveLoading(true);
    Promise.all([getReservePool(), getLocations()])
      .then(([reserveData, locationsData]) => {
        setReserve(reserveData);
        setLocations(locationsData.locations || []);
        if (locationsData.locations && locationsData.locations.length > 0) {
           // auto-select first critical/high risk location if available
           const urgent = locationsData.locations.find(l => l.risk_level === 'Critical' || l.risk_level === 'High');
           setSelectedJunction(urgent ? urgent.junction_id : locationsData.locations[0].junction_id);
        }
        setReserveLoading(false);
      })
      .catch(err => {
        setError("Failed to load dispatch data: " + err.message);
        setReserveLoading(false);
      });
  };

  const fetchReserve = () => {
    getReservePool().then(setReserve).catch(console.error);
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleDispatch = async (e) => {
    e.preventDefault();
    if (!selectedJunction) return;
    
    const loc = locations.find(l => l.junction_id === selectedJunction);
    const locName = loc ? loc.name : selectedJunction;

    if (!window.confirm(`Dispatch emergency officers to ${locName}? This will pull from reserve first, then from low-risk locations if needed.`)) {
      return;
    }

    setDispatching(true);
    setDispatchResult(null);
    setError(null);

    try {
      const result = await dispatchEmergency({
        junction_id: selectedJunction,
        officers_needed: parseInt(officersNeeded, 10)
      });
      setDispatchResult(result);
      fetchReserve();
      if (onDispatchSuccess) {
        onDispatchSuccess();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div className="bg-bg-card backdrop-blur-xl backdrop-saturate-150 rounded-2xl shadow-[var(--shadow-card)] border border-transparent hover:border-amber-500 p-6 relative overflow-hidden transition-colors duration-200">
      <div className="px-6 py-4 bg-risk-critical/10 border-b border-risk-critical/20 flex items-center gap-3">
        <AlertOctagon className="text-risk-critical" size={24} strokeWidth={2} />
        <h2 className="text-xl font-bold text-risk-critical tracking-tight">Emergency Dispatch</h2>
      </div>

      <div className="p-6">
        {/* Reserve Pool Display */}
        <div className="mb-6 p-4 bg-bg-content rounded-xl border border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert className="text-text-secondary" size={20} />
            <span className="font-semibold text-text-primary">Reserve Pool Status</span>
          </div>
          <div>
            {reserveLoading ? (
              <span className="text-text-secondary text-sm animate-pulse">Loading...</span>
            ) : reserve ? (
              <span className="font-bold text-lg text-text-primary">
                {reserve.reserve_pool} <span className="text-text-secondary text-sm font-medium">/ {reserve.total_force_size} officers on standby</span>
              </span>
            ) : (
              <span className="text-text-secondary">Unavailable</span>
            )}
          </div>
        </div>

        <form onSubmit={handleDispatch} className="flex flex-col sm:flex-row gap-4 items-end mb-6">
          <div className="flex-1 min-w-[280px]">
            <label className="block text-sm font-semibold text-text-secondary mb-2">
              Target Location
            </label>
            <select
              value={selectedJunction}
              onChange={(e) => setSelectedJunction(e.target.value)}
              className="w-full bg-bg-content border border-border-subtle rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-risk-critical transition-colors truncate"
              required
            >
              {locations.map((loc) => (
                <option key={loc.junction_id} value={loc.junction_id}>
                  {loc.name} ({loc.risk_level} Risk - {loc.police_assigned} deployed)
                </option>
              ))}
            </select>
          </div>
          
          <div className="w-full sm:w-28 shrink-0">
            <label className="block text-sm font-semibold text-text-secondary mb-2 whitespace-nowrap">
              Officers Needed
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={officersNeeded}
              onChange={(e) => setOfficersNeeded(e.target.value)}
              className="w-full bg-bg-content border border-border-subtle rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:border-risk-critical transition-colors"
              required
            />
          </div>

          <button
            type="submit"
            disabled={dispatching || reserveLoading}
            className="w-full sm:w-auto shrink-0 px-6 py-2.5 rounded-xl bg-risk-critical hover:opacity-90 text-white font-bold flex items-center justify-center gap-2 transition-opacity shadow-lg shadow-risk-critical/20 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
          >
            {dispatching ? "Dispatching..." : "Dispatch Emergency"}
          </button>
        </form>

        {error && (
          <div className="p-4 bg-risk-critical/10 border border-risk-critical/30 rounded-xl text-risk-critical text-sm font-semibold mb-4">
            {error}
          </div>
        )}

        {/* Dispatch Result */}
        {dispatchResult && (
          <div className="p-5 bg-risk-low/10 border border-risk-low/30 rounded-xl">
            <div className="flex items-start gap-3 mb-3">
              {dispatchResult.fulfilled < dispatchResult.requested ? (
                 <AlertTriangle className="text-risk-high mt-0.5" size={20} />
              ) : (
                 <CheckCircle className="text-risk-low mt-0.5" size={20} />
              )}
              
              <div>
                <p className="font-bold text-text-primary text-lg">
                  Dispatched {dispatchResult.fulfilled} of {dispatchResult.requested} requested officers.
                </p>
                {dispatchResult.fulfilled < dispatchResult.requested && (
                  <p className="text-risk-high text-sm font-semibold mt-1">
                    Only {dispatchResult.fulfilled} could be supplied - insufficient reserve and low-risk coverage available.
                  </p>
                )}
              </div>
            </div>
            
            <div className="mt-4">
              <p className="text-sm font-semibold text-text-secondary mb-2">Sources utilized:</p>
              <ul className="space-y-1">
                {dispatchResult.sources.map((src, idx) => {
                  if (src.from === 'reserve') {
                     return <li key={idx} className="text-sm text-text-primary flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-risk-low"></div> {src.count} from Reserve</li>;
                  } else {
                     const locMatch = locations.find(l => l.junction_id === src.from);
                     const srcName = locMatch ? locMatch.name : src.from;
                     const tierName = src.tier ? src.tier : "Low risk";
                     return <li key={idx} className="text-sm text-text-primary flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-risk-low"></div> {src.count} from {srcName} ({tierName})</li>;
                  }
                })}
                {dispatchResult.sources.length === 0 && (
                  <li className="text-sm text-text-secondary italic">No officers were available to dispatch.</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
