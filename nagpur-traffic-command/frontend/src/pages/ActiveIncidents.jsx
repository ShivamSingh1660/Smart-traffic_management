import { useState, useEffect } from "react";
import { getIncidents, getLocations, postIncident, getLocationDetail } from "../api/client";
import RiskBadge from "../components/RiskBadge";

export default function ActiveIncidents() {
  const [incidents, setIncidents] = useState([]);
  const [locations, setLocations] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      setIncidents(incidentsData);
      setLocations(locationsData);
      if (locationsData.length > 0 && !formJunction) {
        setFormJunction(locationsData[0].junction_id);
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

  // Helper to get location name for the incidents list
  const getLocationName = (jid) => {
    const loc = locations.find(l => l.junction_id === jid);
    return loc ? loc.name : jid;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Active Incidents</h1>
          <p className="mt-1 text-sm text-gray-500">
            Live feed of active traffic incidents and simulation controls.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium rounded border border-gray-700 transition-colors"
        >
          Refresh Feed
        </button>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="bg-emerald-900/50 border border-emerald-800 text-emerald-200 px-4 py-3 rounded mb-4">
          <p className="text-sm font-medium">{toastMessage}</p>
        </div>
      )}

      {error && (
         <div className="flex items-center justify-center h-32">
           <div className="text-center max-w-md">
             <p className="text-red-400 font-semibold mb-2">Could not load incidents</p>
             <p className="text-gray-500 text-sm">{error}</p>
           </div>
         </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Incidents List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-sm">
            <div className="px-5 py-3 border-b border-gray-800 flex justify-between items-center">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                Live Feed
              </h2>
              <span className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded">
                {incidents.length} active
              </span>
            </div>
            
            {loading ? (
              <div className="p-8 text-center text-gray-500 animate-pulse text-sm">
                Loading incidents...
              </div>
            ) : incidents.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                No active incidents reported.
              </div>
            ) : (
              <div className="divide-y divide-gray-800/50 max-h-[600px] overflow-y-auto">
                {incidents.map((inc) => (
                  <div key={inc.incident_id} className="p-4 hover:bg-gray-800/40 transition-colors flex items-start justify-between">
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
                      <p className="text-gray-400 text-sm">{getLocationName(inc.junction_id)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-500 text-xs font-mono">{new Date(inc.timestamp).toLocaleString()}</p>
                      <p className="text-gray-600 text-xs mt-1">ID: {inc.incident_id}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Injector Form & Logs */}
        <div className="space-y-6">
          
          {/* Form */}
          <div className="bg-gray-900 border border-gray-800 rounded-sm p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">
              Inject New Incident
            </h2>
            <form onSubmit={handleInject} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Location</label>
                <select 
                  className="w-full bg-gray-800 border border-gray-700 rounded text-gray-200 text-sm p-2 focus:outline-none focus:border-indigo-500"
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
                <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                <select 
                  className="w-full bg-gray-800 border border-gray-700 rounded text-gray-200 text-sm p-2 focus:outline-none focus:border-indigo-500"
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
                <label className="block text-xs font-medium text-gray-500 mb-1">Severity</label>
                <select 
                  className="w-full bg-gray-800 border border-gray-700 rounded text-gray-200 text-sm p-2 focus:outline-none focus:border-indigo-500"
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
                className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 rounded transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Simulating..." : "Simulate Incident"}
              </button>
            </form>
          </div>

          {/* Logs */}
          <div className="bg-gray-900 border border-gray-800 rounded-sm flex flex-col max-h-[300px]">
            <div className="px-5 py-3 border-b border-gray-800">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                Injection Log
              </h2>
            </div>
            <div className="overflow-y-auto p-4 space-y-3 flex-1">
              {injectionLogs.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">No recent injections.</p>
              ) : (
                injectionLogs.map((log) => (
                  <div key={log.id} className="bg-gray-800/50 p-3 rounded text-sm border border-gray-700/50">
                    <p className="text-gray-300 font-medium mb-1">{log.locationName}</p>
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="text-gray-500 line-through">
                        {log.beforeScore} ({log.beforeLevel})
                      </span>
                      <span className="text-gray-400">→</span>
                      <span className="font-bold text-gray-100 flex items-center space-x-1">
                        <span>{log.afterScore}</span>
                        <span className="opacity-80 scale-75 origin-left inline-block">
                          <RiskBadge level={log.afterLevel} />
                        </span>
                      </span>
                    </div>
                    <p className="text-gray-600 text-[10px] mt-1 text-right">{log.timestamp}</p>
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
