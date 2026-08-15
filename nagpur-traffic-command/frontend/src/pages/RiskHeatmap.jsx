import { useState, useEffect } from "react";
import { getLocations } from "../api/client";
import RiskMap from "../components/RiskMap";

export default function RiskHeatmap() {
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Risk Heatmap</h1>
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

      {loading && (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500 text-sm animate-pulse">
            Loading map data...
          </p>
        </div>
      )}

      {error && (
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
      )}

      {!loading && !error && (
        <div className="border border-gray-800 rounded-sm overflow-hidden">
          <RiskMap
            locations={locations}
            height="calc(100vh - 220px)"
            zoom={12}
            showLegend={true}
          />
        </div>
      )}
    </div>
  );
}
