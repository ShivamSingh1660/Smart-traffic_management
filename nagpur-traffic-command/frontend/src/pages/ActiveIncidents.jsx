import { useState, useEffect } from "react";
import { getIncidents, getLocations, postIncident, getLocationDetail, resolveIncident } from "../api/client";
import RiskBadge from "../components/RiskBadge";
import { RefreshCw, ShieldAlert } from "lucide-react";

export default function ActiveIncidents() {
  const [incidents, setIncidents] = useState([]);
  const [locations, setLocations] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoReturns, setAutoReturns] = useState([]);

  const [formJunction, setFormJunction] = useState("");
  const [formType, setFormType] = useState("accident");
  const [formSeverity, setFormSeverity] = useState("medium");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [injectionLogs, setInjectionLogs] = useState([]);
  const [toastMessage, setToastMessage] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [incidentsData, locationsData] = await Promise.all([
        getIncidents(),
        getLocations()
      ]);
      setIncidents(incidentsData.filter(i => !i.resolved_flag));
      setLocations(locationsData.locations || []);
      
      if (locationsData.auto_returns && locationsData.auto_returns.length > 0) {
        setAutoReturns(locationsData.auto_returns);
        setTimeout(() => setAutoReturns([]), 5000);
      }
      
      if (locationsData.locations && locationsData.locations.length > 0 && !formJunction) {
        setFormJunction(locationsData.locations[0].junction_id);
      }
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInject = async (e) => {
    e.preventDefault();
    if (!formJunction) return;
    
    setIsSubmitting(true);
    setToastMessage("");
    
    try {
      // 1. Fetch "before" state
      const beforeLoc = await getLocationDetail(formJunction);
      
      // 2. Inject incident
      const payload = {
        junction_id: formJunction,
        type: formType,
        severity: formSeverity
      };
      const afterLoc = await postIncident(payload);
      
      // 3. Re-fetch incidents to update the list
      const updatedIncidents = await getIncidents();
      setIncidents(updatedIncidents);
      
      // 4. Update the injection logs
      const newLog = {
        id: Date.now(),
        locationName: afterLoc.name,
        beforeScore: beforeLoc.risk_score,
        beforeLevel: beforeLoc.risk_level,
        afterScore: afterLoc.risk_score,
        afterLevel: afterLoc.risk_level,
        timestamp: new Date().toLocaleTimeString()
      };
      
      setInjectionLogs((prev) => [newLog, ...prev].slice(0, 10)); // Keep last 10
      setToastMessage("Incident injected. Risk recalculated. Check Dashboard, Locations, and Recommendations for updated rankings and deployment.");
      
      // Clear toast after 5 seconds
      setTimeout(() => setToastMessage(""), 5000);
      
    } catch (err) {
      alert("Failed to inject incident: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolve = async (incidentId, junctionId) => {
    if (!window.confirm("Are you sure you want to resolve this incident? Risk scores will be recalculated.")) return;
    
    setToastMessage("");
    try {
      const beforeLoc = await getLocationDetail(junctionId);
      const afterLoc = await resolveIncident(incidentId);
      
      const updatedIncidents = await getIncidents();
      setIncidents(updatedIncidents.filter(i => !i.resolved_flag));
      
      const newLog = {
        id: Date.now(),
        locationName: afterLoc.name,
        beforeScore: beforeLoc.risk_score,
        beforeLevel: beforeLoc.risk_level,
        afterScore: afterLoc.risk_score,
        afterLevel: afterLoc.risk_level,
        timestamp: new Date().toLocaleTimeString(),
        note: "(Resolved)"
      };
      
      setInjectionLogs((prev) => [newLog, ...prev].slice(0, 10));
      setToastMessage("Incident resolved. Risk score decreased.");
      setTimeout(() => setToastMessage(""), 5000);
      
    } catch (err) {
      alert("Failed to resolve incident: " + err.message);
    }
  };

  // Helper to get location name for the incidents list
  const getLocationName = (jid) => {
    const loc = locations.find(l => l.junction_id === jid);
    return loc ? loc.name : jid;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end mb-12">
        <div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-text-primary tracking-tight">Active Incidents</h1>
          <p className="mt-4 text-text-secondary font-medium">
            Live feed of active traffic incidents and simulation controls.
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

      {/* Toast Notification */}
      {toastMessage && (
        <div className="bg-risk-low-bg text-risk-low px-6 py-4 rounded-xl mb-4">
          <p className="text-sm font-semibold">{toastMessage}</p>
        </div>
      )}

      {error && (
         <div className="flex items-center justify-center h-32 bg-bg-card backdrop-blur-xl backdrop-saturate-150 rounded-2xl shadow-[var(--shadow-card)]">
           <div className="text-center max-w-md p-8">
             <p className="text-risk-critical font-bold text-lg mb-2">Could not load incidents</p>
             <p className="text-text-secondary text-sm">{error}</p>
           </div>
         </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Incidents List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-bg-card backdrop-blur-xl backdrop-saturate-150 rounded-2xl shadow-[var(--shadow-card)] border border-transparent hover:border-amber-500 overflow-hidden transition-colors duration-200">
            <div className="px-8 py-6 border-b border-border-subtle flex justify-between items-center">
              <h2 className="text-text-primary font-bold text-xl">
                Live Feed
              </h2>
              <span className="text-xs bg-bg-card backdrop-blur-xl backdrop-saturate-150-hover text-text-primary px-3 py-1.5 rounded-full font-bold">
                {incidents.length} active
              </span>
            </div>
            
            {loading ? (
              <div className="p-8 text-center text-text-secondary animate-pulse text-sm font-medium">
                Loading incidents...
              </div>
            ) : incidents.length === 0 ? (
              <div className="p-8 text-center text-text-secondary text-sm font-medium">
                No active incidents reported.
              </div>
            ) : (
              <div className="divide-y divide-black/5 max-h-[600px] overflow-y-auto">
                {incidents.map((inc) => (
                  <div key={inc.incident_id} className="p-6 hover:bg-black/[0.02] transition-colors flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide
                          ${inc.severity === 'high' ? 'bg-risk-critical-bg text-risk-critical' : 
                            inc.severity === 'medium' ? 'bg-risk-high-bg text-risk-high' : 
                            'bg-risk-medium-bg text-risk-medium'}`}>
                          {inc.severity}
                        </span>
                        <span className="text-text-primary font-semibold capitalize">{inc.type}</span>
                      </div>
                      <p className="text-text-secondary text-sm font-medium">{getLocationName(inc.junction_id)}</p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <p className="text-text-secondary text-xs font-medium">{new Date(inc.timestamp).toLocaleString()}</p>
                      <p className="text-text-tertiary text-xs mt-1 mb-2">ID: {inc.incident_id}</p>
                      <button 
                        onClick={() => handleResolve(inc.incident_id, inc.junction_id)}
                        className="text-[10px] font-bold px-3 py-1.5 bg-risk-low/10 text-risk-low hover:bg-risk-low hover:text-white rounded-lg transition-colors border border-risk-low/20"
                      >
                        Resolve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Injector Form & Logs */}
        <div className="space-y-8">
          
          {/* Form */}
          <div className="bg-bg-card backdrop-blur-xl backdrop-saturate-150 rounded-2xl shadow-[var(--shadow-card)] border border-transparent hover:border-amber-500 p-8 transition-colors duration-200">
            <h2 className="text-text-primary font-bold text-xl mb-6">
              Inject New Incident
            </h2>
            <form onSubmit={handleInject} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-2 uppercase tracking-wider">Location</label>
                <select 
                  className="w-full bg-bg-content border border-border-subtle rounded-xl text-text-primary text-sm p-3 focus:outline-none focus:ring-2 focus:ring-[var(--risk-low)]/50 font-medium"
                  value={formJunction}
                  onChange={(e) => setFormJunction(e.target.value)}
                  disabled={loading || locations.length === 0}
                >
                  {locations.map(loc => (
                    <option key={loc.junction_id} value={loc.junction_id}>{loc.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-2 uppercase tracking-wider">Type</label>
                <select 
                  className="w-full bg-bg-content border border-border-subtle rounded-xl text-text-primary text-sm p-3 focus:outline-none focus:ring-2 focus:ring-[var(--risk-low)]/50 font-medium"
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                >
                  <option value="accident">Accident</option>
                  <option value="congestion">Congestion</option>
                  <option value="obstruction">Obstruction</option>
                  <option value="violation">Traffic Violation</option>
                  <option value="illegal_parking">Illegal Parking</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-2 uppercase tracking-wider">Severity</label>
                <select 
                  className="w-full bg-bg-content border border-border-subtle rounded-xl text-text-primary text-sm p-3 focus:outline-none focus:ring-2 focus:ring-[var(--risk-low)]/50 font-medium"
                  value={formSeverity}
                  onChange={(e) => setFormSeverity(e.target.value)}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting || !formJunction}
                className="w-full mt-2 bg-text-primary hover:opacity-80 text-bg-app font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Simulating..." : "Simulate Incident"}
              </button>
            </form>
          </div>

          {/* Logs */}
          <div className="bg-bg-card backdrop-blur-xl backdrop-saturate-150 rounded-2xl shadow-[var(--shadow-card)] border border-transparent hover:border-amber-500 overflow-hidden flex flex-col max-h-[300px] transition-colors duration-200">
            <div className="px-8 py-6 border-b border-border-subtle">
              <h2 className="text-text-primary font-bold text-xl">
                Injection Log
              </h2>
            </div>
            <div className="overflow-y-auto p-6 space-y-3 flex-1">
              {injectionLogs.length === 0 ? (
                <p className="text-text-secondary text-sm text-center py-4 font-medium">No recent injections.</p>
              ) : (
                injectionLogs.map((log) => (
                  <div key={log.id} className="bg-bg-content p-4 rounded-xl text-sm">
                    <p className="text-text-primary font-bold mb-2">{log.locationName}</p>
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="text-text-tertiary line-through font-medium">
                        {log.beforeScore} ({log.beforeLevel})
                      </span>
                      <span className="text-text-secondary">→</span>
                      <span className="font-bold text-text-primary flex items-center space-x-1">
                        <span>{log.afterScore}</span>
                        <span className="opacity-80 scale-75 origin-left inline-block">
                          <RiskBadge level={log.afterLevel} />
                        </span>
                      </span>
                    </div>
                    <p className="text-text-tertiary text-[10px] mt-2 text-right font-medium">{log.timestamp}</p>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
