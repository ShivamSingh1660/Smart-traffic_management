import { useState } from "react";
import { 
  getCurrentDeployment, 
  getDeploymentRecommendation, 
  getDeploymentMoves,
  postOverride
} from "../api/client";
import RiskBadge from "../components/RiskBadge";

// Sub-component for individual rows to handle inline states cleanly
function RecommendationRow({ row, onActionSuccess }) {
  const [isModifying, setIsModifying] = useState(false);
  const [modifyValue, setModifyValue] = useState(row.recommended);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultTag, setResultTag] = useState(null);
  const [error, setError] = useState(null);

  const hasChanged = row.current !== row.recommended;

  const handleOverride = async (action, officers = null) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await postOverride({ junction_id: row.junctionId, action, officers });
      
      let newCurrent = row.current;
      if (action === "accept") newCurrent = row.recommended;
      if (action === "modify") newCurrent = officers;
      
      let message = "";
      if (action === "accept") {
        message = "Recommendation accepted";
        setResultTag("Accepted");
      } else if (action === "modify") {
        message = `Modified to ${officers} officers`;
        setResultTag("Modified");
        setIsModifying(false);
      } else if (action === "reject") {
        message = "Recommendation rejected";
        setResultTag("Rejected");
      }

      setTimeout(() => setResultTag(null), 3000);

      onActionSuccess({ 
        junctionId: row.junctionId, 
        name: row.name, 
        newCurrent, 
        message 
      });

    } catch (err) {
      setError("Failed: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <tr 
      className={`hover:bg-gray-800/40 transition-colors ${
        hasChanged ? "bg-indigo-900/10 border-l-2 border-l-indigo-500" : "border-l-2 border-l-transparent"
      }`}
    >
      <td className="px-5 py-3 font-medium text-gray-200">{row.name}</td>
      <td className="px-5 py-3 font-mono text-gray-400">{row.current}</td>
      <td className="px-5 py-3 font-mono text-indigo-300 font-bold">{row.recommended}</td>
      <td className="px-5 py-3"><RiskBadge level={row.riskLevel} /></td>
      <td className="px-5 py-3 text-gray-400 truncate max-w-xs" title={row.reason}>
        {row.reason}
      </td>
      <td className="px-5 py-3 min-w-[200px]">
        {error && <span className="text-red-400 text-xs block mb-1 truncate" title={error}>{error}</span>}
        
        {resultTag ? (
          <span className="inline-flex items-center text-emerald-400 text-xs font-bold uppercase tracking-wider bg-emerald-900/20 px-2 py-1 rounded border border-emerald-800/50">
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
            {resultTag}
          </span>
        ) : isSubmitting ? (
          <span className="text-gray-500 text-xs font-medium animate-pulse">Processing...</span>
        ) : isModifying ? (
          <div className="flex items-center gap-2">
            <input 
              type="number" 
              min="0" 
              value={modifyValue} 
              onChange={e => setModifyValue(parseInt(e.target.value) || 0)} 
              className="w-16 bg-gray-900 border border-gray-700 rounded text-gray-200 text-xs p-1 focus:outline-none focus:border-indigo-500 font-mono"
            />
            <button 
              onClick={() => handleOverride('modify', modifyValue)} 
              className="text-xs font-medium px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded transition-colors"
            >
              Confirm
            </button>
            <button 
              onClick={() => setIsModifying(false)} 
              className="text-xs font-medium px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button 
              onClick={() => handleOverride('accept')}
              className="text-xs font-medium px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-800/50 rounded transition-colors"
            >
              Accept
            </button>
            <button 
              onClick={() => setIsModifying(true)}
              className="text-xs font-medium px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 rounded transition-colors"
            >
              Modify
            </button>
            <button 
              onClick={() => handleOverride('reject')}
              className="text-xs font-medium px-2 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-800/50 rounded transition-colors"
            >
              Reject
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

export default function Recommendations() {
  const [availableOfficers, setAvailableOfficers] = useState(25);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [recentActions, setRecentActions] = useState([]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const [currentList, recList, movesList] = await Promise.all([
        getCurrentDeployment(),
        getDeploymentRecommendation(availableOfficers),
        getDeploymentMoves(availableOfficers)
      ]);

      const locMap = {};
      currentList.forEach(c => {
        locMap[c.junction_id] = c.name;
      });

      const rows = currentList.map(c => {
        const recItem = recList.find(r => r.junction_id === c.junction_id);
        const rec = recItem ? recItem.recommended_officers : 0;
        const reason = recItem ? recItem.reason : "N/A";
        return {
          junctionId: c.junction_id,
          name: c.name,
          riskLevel: c.risk_level,
          current: c.police_assigned,
          recommended: rec,
          reason: reason
        };
      });

      rows.sort((a, b) => b.recommended - a.recommended);

      const readableMoves = movesList.map((m, idx) => {
        const fromName = locMap[m.from_junction_id] || m.from_junction_id;
        const toName = locMap[m.to_junction_id] || m.to_junction_id;
        return { id: idx, count: m.count, fromName, toName };
      });

      setData({ rows, moves: readableMoves });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleActionSuccess = ({ junctionId, name, newCurrent, message }) => {
    // Update the row locally so we don't have to refetch everything
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rows: prev.rows.map(r => r.junctionId === junctionId ? { ...r, current: newCurrent } : r)
      };
    });

    // Add to recent actions log
    setRecentActions(prev => {
      const log = { id: Date.now(), text: `${name}: ${message}`, timestamp: new Date().toLocaleTimeString() };
      return [log, ...prev].slice(0, 10);
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Persistent Recent Actions Log */}
      {recentActions.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-sm">
          <div className="px-5 py-2 border-b border-gray-800 bg-gray-800/30 flex justify-between items-center">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Recent Actions Log
            </h2>
            <span className="text-[10px] text-gray-500 uppercase tracking-widest">Client-side only</span>
          </div>
          <div className="p-3 max-h-32 overflow-y-auto space-y-2">
            {recentActions.map(action => (
              <div key={action.id} className="flex justify-between items-center text-sm border-b border-gray-800/50 pb-2 last:border-0 last:pb-0">
                <span className="text-gray-300">{action.text}</span>
                <span className="text-gray-500 text-xs font-mono">{action.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header & Controls */}
      <div className="bg-gray-900 border border-gray-800 rounded-sm p-5">
        <h1 className="text-2xl font-bold text-gray-100 mb-2">AI Recommendations</h1>
        <p className="text-gray-400 text-sm mb-6 max-w-3xl">
          Generate deployment recommendations based on live risk levels and available personnel. 
          View side-by-side comparisons and take action to Accept, Modify, or Reject AI suggestions.
        </p>

        <div className="flex flex-col sm:flex-row items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Available Officers
            </label>
            <input
              type="number"
              min="0"
              value={availableOfficers}
              onChange={(e) => setAvailableOfficers(parseInt(e.target.value) || 0)}
              className="w-32 bg-gray-800 border border-gray-700 rounded text-gray-200 text-sm p-2 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded transition-colors disabled:opacity-50 flex items-center justify-center min-w-[200px]"
          >
            {loading ? (
              <span className="animate-pulse">Generating...</span>
            ) : "Generate Recommendation"}
          </button>
        </div>

        {error && (
          <div className="mt-4 bg-red-900/20 border border-red-800/50 text-red-400 px-4 py-3 rounded text-sm font-medium">
            Error: {error}
          </div>
        )}
      </div>

      {/* Results View */}
      {data && (
        <div className="space-y-6">
          {/* Table */}
          <div className="bg-gray-900 border border-gray-800 rounded-sm overflow-x-auto">
            <div className="px-5 py-3 border-b border-gray-800">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                Deployment Comparison & Overrides
              </h2>
            </div>
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead>
                <tr className="border-b border-gray-800 text-xs uppercase tracking-wider text-gray-500 bg-gray-800/30">
                  <th className="px-5 py-3 font-medium">Location</th>
                  <th className="px-5 py-3 font-medium">Current</th>
                  <th className="px-5 py-3 font-medium text-indigo-300">Recommended</th>
                  <th className="px-5 py-3 font-medium">Risk Level</th>
                  <th className="px-5 py-3 font-medium">Reasoning</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {data.rows.map(row => (
                  <RecommendationRow 
                    key={row.junctionId} 
                    row={row} 
                    onActionSuccess={handleActionSuccess} 
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Suggested Moves Panel */}
          <div className="bg-gray-900 border border-gray-800 rounded-sm">
            <div className="px-5 py-3 border-b border-gray-800">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                Suggested Moves
              </h2>
            </div>
            <div className="p-5">
              {data.moves.length === 0 ? (
                <div className="text-emerald-400 flex items-center gap-2 font-medium">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  Deployment already matches recommendation. No changes needed.
                </div>
              ) : (
                <ul className="space-y-3">
                  {data.moves.map(move => (
                    <li key={move.id} className="flex items-center text-sm text-gray-300 bg-gray-800/50 p-3 rounded border border-gray-700/50">
                      <span className="font-semibold text-indigo-400 w-36 shrink-0">
                        Move {move.count} officer{move.count !== 1 ? 's' : ''}:
                      </span>
                      <span className="text-gray-400">{move.fromName}</span>
                      <svg className="w-4 h-4 mx-2 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                      </svg>
                      <span className="text-gray-100 font-medium">{move.toName}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
