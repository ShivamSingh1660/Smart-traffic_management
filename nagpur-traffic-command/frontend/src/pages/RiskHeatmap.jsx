import { useState, useEffect } from "react";
import { getLocations } from "../api/client";
import RiskMap from "../components/RiskMap";
import { RefreshCw, ShieldAlert } from "lucide-react";

export default function RiskHeatmap() {
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

  return (
    <div className="space-y-8 h-full flex flex-col">
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

      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-text-primary tracking-tight">Risk Heatmap</h1>
          <p className="mt-4 text-text-secondary font-medium">
            Showing simulated data. Live data will connect in a later development
            stage.
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

      {loading && (
        <div className="flex items-center justify-center h-64 bg-bg-card backdrop-blur-xl backdrop-saturate-150 rounded-2xl shadow-[var(--shadow-card)]">
          <p className="text-text-secondary text-sm animate-pulse font-medium">
            Loading map data...
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center h-64 bg-bg-card backdrop-blur-xl backdrop-saturate-150 rounded-2xl shadow-[var(--shadow-card)]">
          <div className="text-center max-w-md p-8">
            <p className="text-risk-critical font-bold text-lg mb-2">
              Could not load location data
            </p>
            <p className="text-text-secondary text-sm mb-4">{error}</p>
            <p className="text-text-secondary text-xs mt-3">
              Is the backend running? Start it with: <br />
              <code className="text-text-primary bg-bg-card backdrop-blur-xl backdrop-saturate-150-hover px-2 py-1 rounded-md mt-2 inline-block">
                uvicorn main:app --reload --port 8000
              </code>
            </p>
          </div>
        </div>
      )}

      {!loading && !error && (
        <div className="bg-bg-card backdrop-blur-xl backdrop-saturate-150 rounded-2xl shadow-[var(--shadow-card)] border border-transparent hover:border-amber-500 overflow-hidden flex-1 flex flex-col min-h-[500px] transition-colors duration-200">
          <RiskMap
            locations={locations}
            height="100%"
            zoom={12}
            showLegend={true}
          />
        </div>
      )}
    </div>
  );
}
