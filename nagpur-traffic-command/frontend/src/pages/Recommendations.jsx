import { useState } from "react";
import { 
  getCurrentDeployment, 
  getDeploymentRecommendation, 
  getDeploymentMoves,
  postOverride,
  resetDeployment,
  getLocationDetail,
  applyAllRecommendations
} from "../api/client";
import RiskBadge from "../components/RiskBadge";
import { Check, ArrowRight, RotateCcw, RefreshCw, CheckCircle } from "lucide-react";

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
      
      // Re-fetch actual current data from the backend to confirm what was really saved
      const updatedLoc = await getLocationDetail(row.junctionId);
      const newCurrent = updatedLoc.police_assigned;
      
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
      className={`hover:bg-black/[0.02] transition-colors border-b border-border-subtle last:border-0 ${
        hasChanged ? "bg-risk-low-bg/30 border-l-4 border-l-[var(--risk-low)]" : "border-l-4 border-l-transparent"
      }`}
    >
      <td className="px-4 py-4 font-bold text-text-primary whitespace-normal min-w-[120px]">{row.name}</td>
      <td className="px-4 py-4 font-semibold text-text-secondary text-center">{row.current}</td>
      <td className="px-4 py-4 font-bold text-risk-low text-center">{row.recommended}</td>
      <td className="px-4 py-4"><RiskBadge level={row.riskLevel} /></td>
      <td className="px-4 py-4 text-text-secondary truncate max-w-[100px] md:max-w-[150px] lg:max-w-[200px] font-medium" title={row.reason}>
        {row.reason}
      </td>
      <td className="px-4 py-4 min-w-[160px] text-right">
        {error && <span className="text-risk-critical text-xs block mb-1 truncate font-medium" title={error}>{error}</span>}
        
        {resultTag ? (
          <span className="inline-flex items-center text-risk-low text-xs font-bold uppercase tracking-wider bg-risk-low-bg px-3 py-1.5 rounded-full">
            <Check size={12} className="mr-1" strokeWidth={3} />
            {resultTag}
          </span>
        ) : isSubmitting ? (
          <span className="text-text-secondary text-xs font-medium animate-pulse">Processing...</span>
        ) : isModifying ? (
          <div className="flex items-center gap-2">
            <input 
              type="number" 
              min="0" 
              value={modifyValue} 
              onChange={e => setModifyValue(parseInt(e.target.value) || 0)} 
              className="w-16 bg-bg-content border border-border-strong rounded-lg text-text-primary text-xs p-2 focus:outline-none focus:ring-2 focus:ring-[var(--risk-low)]/50 font-bold"
            />
            <button 
              onClick={() => handleOverride('modify', modifyValue)} 
              className="text-xs font-bold px-3 py-1.5 bg-text-primary hover:opacity-80 text-bg-app rounded-lg transition-colors"
            >
              Confirm
            </button>
            <button 
              onClick={() => setIsModifying(false)} 
              className="text-xs font-bold px-3 py-1.5 bg-bg-card backdrop-blur-xl backdrop-saturate-150-hover hover:bg-border-subtle text-text-secondary rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex justify-end gap-1.5 flex-wrap">
            <button 
              onClick={() => handleOverride('accept', row.recommended)}
              className="text-[11px] sm:text-xs font-bold px-2.5 py-1.5 bg-risk-low-bg hover:opacity-80 text-risk-low rounded-full transition-colors"
            >
              Accept
            </button>
            <button 
              onClick={() => setIsModifying(true)}
              className="text-[11px] sm:text-xs font-bold px-2.5 py-1.5 bg-bg-card backdrop-blur-xl backdrop-saturate-150-hover hover:bg-border-subtle text-text-secondary rounded-full transition-colors"
            >
              Modify
            </button>
            <button 
              onClick={() => handleOverride('reject')}
              className="text-[11px] sm:text-xs font-bold px-2.5 py-1.5 bg-risk-critical-bg hover:opacity-80 text-risk-critical rounded-full transition-colors"
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
  const [resetting, setResetting] = useState(false);
  const [applyingAll, setApplyingAll] = useState(false);
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

  const handleReset = async () => {
    if (!window.confirm("Reset all police assignments to 0? This cannot be undone.")) {
      return;
    }
    setResetting(true);
    setError(null);
    try {
      // 1. Reset all assignments to zero on the backend
      await resetDeployment();

      // 2. Re-fetch current deployment + fresh recommendation with current officer count
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

      // 3. Log the reset action
      setRecentActions(prev => {
        const log = {
          id: Date.now(),
          text: "Deployment reset to zero",
          timestamp: new Date().toLocaleTimeString()
        };
        return [log, ...prev].slice(0, 10);
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setResetting(false);
    }
  };

  const handleApplyAll = async () => {
    if (!data || !data.rows) return;
    if (!window.confirm(`Apply the full recommendation across all ${data.rows.length} locations? This will overwrite current assignments to match the AI recommendation.`)) {
      return;
    }
    setApplyingAll(true);
    setError(null);
    try {
      await applyAllRecommendations(availableOfficers);
      
      // Re-fetch the table so Current matches Recommended
      await handleGenerate();
      
      setRecentActions(prev => {
        const log = {
          id: Date.now(),
          text: "Applied full recommendation to all locations",
          timestamp: new Date().toLocaleTimeString()
        };
        return [log, ...prev].slice(0, 10);
      });
    } catch (err) {
      setError("Failed to apply all: " + err.message);
    } finally {
      setApplyingAll(false);
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Persistent Recent Actions Log */}
      {recentActions.length > 0 && (
        <div className="bg-bg-card backdrop-blur-xl backdrop-saturate-150 rounded-2xl shadow-[var(--shadow-card)] border border-transparent hover:border-amber-500 overflow-hidden transition-colors duration-200">
          <div className="px-8 py-4 border-b border-border-subtle flex justify-between items-center">
            <h2 className="text-text-primary font-bold text-sm uppercase tracking-wider">
              Recent Actions Log
            </h2>
            <span className="text-[10px] text-text-tertiary uppercase tracking-widest font-medium">Client-side only</span>
          </div>
          <div className="p-4 max-h-32 overflow-y-auto space-y-2">
            {recentActions.map(action => (
              <div key={action.id} className="flex justify-between items-center text-sm border-b border-border-subtle pb-2 last:border-0 last:pb-0">
                <span className="text-text-primary font-medium">{action.text}</span>
                <span className="text-text-tertiary text-xs font-medium">{action.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header & Controls */}
      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold text-text-primary tracking-tight mb-4">AI Recommendations</h1>
        <p className="text-text-secondary font-medium mb-8 max-w-3xl">
          Generate deployment recommendations based on live risk levels and available personnel. 
          View side-by-side comparisons and take action to Accept, Modify, or Reject AI suggestions.
        </p>

        <div className="flex flex-col sm:flex-row items-end gap-4">
          <div>
            <label className="block text-xs font-bold text-text-secondary mb-2 uppercase tracking-wider">
              Available Officers
            </label>
            <input
              type="number"
              min="0"
              value={availableOfficers}
              onChange={(e) => setAvailableOfficers(parseInt(e.target.value) || 0)}
              className="w-32 bg-bg-content border border-border-subtle rounded-xl text-text-primary text-sm p-3 focus:outline-none focus:ring-2 focus:ring-[var(--risk-low)]/50 font-bold"
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading || resetting || applyingAll}
            className="px-8 py-3 bg-text-primary hover:opacity-80 text-bg-app font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center min-w-[220px]"
          >
            {loading ? (
              <span className="animate-pulse">Generating...</span>
            ) : "Generate Recommendation"}
          </button>
          <button
            onClick={handleApplyAll}
            disabled={loading || resetting || applyingAll || !data}
            className="px-6 py-3 bg-risk-low hover:bg-green-600 text-bg-app font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-risk-low/20"
            title="Apply the full recommendation across all locations atomically"
          >
            <CheckCircle size={16} />
            {applyingAll ? "Applying..." : "Apply Full Recommendation"}
          </button>
          <button
            onClick={handleGenerate}
            disabled={loading || resetting || applyingAll}
            className="px-6 py-3 bg-bg-card border border-border-subtle hover:bg-border-subtle text-text-primary font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            title="Refresh current deployment and recommendations"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={handleReset}
            disabled={resetting || loading || applyingAll}
            className="px-6 py-3 border-2 border-amber-500/60 text-amber-600 hover:bg-amber-500/10 font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 min-w-[200px]"
            title="Reset all police assignments to zero"
          >
            <RotateCcw size={16} className={resetting ? "animate-spin" : ""} />
            {resetting ? "Resetting…" : "Reset Deployment"}
          </button>
        </div>

        {error && (
          <div className="mt-6 bg-risk-critical-bg text-risk-critical px-6 py-4 rounded-xl text-sm font-semibold">
            Error: {error}
          </div>
        )}
      </div>

      {/* Results View */}
      {data && (
        <div className="space-y-8">
          {/* Table */}
          <div className="bg-bg-card backdrop-blur-xl backdrop-saturate-150 rounded-2xl shadow-[var(--shadow-card)] border border-transparent hover:border-amber-500 overflow-x-auto transition-colors duration-200">
            <div className="px-8 py-6 border-b border-border-subtle sm:flex sm:justify-between sm:items-center">
              <h2 className="text-text-primary font-bold text-xl mb-2 sm:mb-0">
                Deployment Comparison & Overrides
              </h2>
              <span className="text-xs text-text-tertiary font-medium bg-black/20 px-3 py-1.5 rounded-lg border border-border-subtle">
                💡 Tip: If an individual action fails due to full capacity, use 'Apply Full Recommendation' above to reallocate everything at once.
              </span>
            </div>
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead>
                <tr className="border-b border-border-subtle text-text-secondary">
                  <th className="px-4 py-4 font-medium">Location</th>
                  <th className="px-4 py-4 font-medium text-center">Current</th>
                  <th className="px-4 py-4 font-bold text-risk-low text-center">Recommended</th>
                  <th className="px-4 py-4 font-medium">Risk Level</th>
                  <th className="px-4 py-4 font-medium">Reasoning</th>
                  <th className="px-4 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
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
          <div className="bg-bg-card backdrop-blur-xl backdrop-saturate-150 rounded-2xl shadow-[var(--shadow-card)] border border-transparent hover:border-amber-500 overflow-hidden transition-colors duration-200">
            <div className="px-8 py-6 border-b border-border-subtle">
              <h2 className="text-text-primary font-bold text-xl">
                Suggested Moves
              </h2>
            </div>
            <div className="p-8">
              {data.moves.length === 0 ? (
                <div className="text-risk-low flex items-center gap-2 font-bold">
                  <Check size={20} strokeWidth={3} />
                  Deployment already matches recommendation. No changes needed.
                </div>
              ) : (
                <ul className="space-y-3">
                  {data.moves.map(move => (
                    <li key={move.id} className="flex items-center text-sm text-text-primary bg-bg-content p-4 rounded-xl">
                      <span className="font-bold text-risk-low w-36 shrink-0">
                        Move {move.count} officer{move.count !== 1 ? 's' : ''}:
                      </span>
                      <span className="text-text-secondary font-medium">{move.fromName}</span>
                      <ArrowRight size={16} className="mx-3 text-text-tertiary shrink-0" />
                      <span className="text-text-primary font-bold">{move.toName}</span>
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
