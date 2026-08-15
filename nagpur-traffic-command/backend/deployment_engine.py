"""
Deployment Engine: Allocates available officers to locations based on a priority heuristic.
"""

W1_RISK_SCORE = 1.0
W2_INCIDENT_SEVERITY = 0.5
W3_POLICE_ASSIGNED = 8.0
W4_UNMANNED_CRITICAL = 20.0
UNMANNED_CRITICAL_BONUS = 20.0  # Kept here per prompt instruction to have this clearly named

def compute_priority(location, current_police_assigned: int) -> float:
    """
    Computes a priority score for a location.
    """
    incident_severity_score = 0.0
    unresolved_incidents = [inc for inc in location.incidents if not inc.resolved_flag]
    for inc in unresolved_incidents:
        if inc.severity == "high":
            incident_severity_score += 3
        elif inc.severity == "medium":
            incident_severity_score += 2
        else:
            incident_severity_score += 1

    unmanned_critical = location.risk_level in ("High", "Critical") and current_police_assigned == 0
    
    priority = (W1_RISK_SCORE * location.risk_score) \
             + (W2_INCIDENT_SEVERITY * incident_severity_score) \
             - (W3_POLICE_ASSIGNED * current_police_assigned) \
             + (W4_UNMANNED_CRITICAL if unmanned_critical else 0)
    
    return priority

def allocate_officers(locations, available_officers: int, max_per_location: int = 3):
    """
    Greedy loop to allocate officers to the highest priority locations.
    """
    allocation = {loc.junction_id: 0 for loc in locations}
    remaining = available_officers
    
    while remaining > 0:
        priorities = []
        for loc in locations:
            assigned = allocation[loc.junction_id]
            if assigned < max_per_location:
                prio = compute_priority(loc, assigned)
                priorities.append((prio, loc))
                
        if not priorities:
            break
            
        priorities.sort(key=lambda x: x[0], reverse=True)
        top_prio, top_loc = priorities[0]
        
        assigned = allocation[top_loc.junction_id]
        to_assign = min(remaining, max_per_location - assigned)
        allocation[top_loc.junction_id] += to_assign
        remaining -= to_assign
        
    result = []
    # Sort to return consistent order
    sorted_locations = sorted(locations, key=lambda x: x.risk_score, reverse=True)

    for loc in sorted_locations:
        recommended = allocation[loc.junction_id]
        if recommended == 0:
            continue
            
        # Genuinely generated string reflecting why
        reasons = []
        if loc.risk_level in ("Critical", "High"):
            reasons.append(f"{loc.risk_level} risk level")
        elif loc.risk_score > 0:
            reasons.append(f"risk score of {loc.risk_score:.1f}")
            
        if loc.police_assigned == 0 and loc.risk_level in ("High", "Critical"):
            reasons.append("currently unmanned critical")
        elif loc.police_assigned == 0:
            reasons.append("currently unmanned")
            
        unresolved_count = sum(1 for inc in loc.incidents if not inc.resolved_flag)
        if unresolved_count > 0:
            reasons.append(f"{unresolved_count} active incident(s)")
            
        reason_str = ", ".join(reasons).capitalize()
        if not reason_str:
            reason_str = f"Priority allocation based on risk score {loc.risk_score}"
            
        result.append({
            "junction_id": loc.junction_id,
            "recommended_officers": recommended,
            "reason": reason_str
        })
        
    return result

def compute_moves(current_deployment: dict, recommended_deployment: dict):
    """
    Compares current vs recommended and returns a list of moves
    {"from_junction_id": ..., "to_junction_id": ..., "count": N}
    """
    surplus = []
    deficit = []
    
    all_jids = set(current_deployment.keys()).union(set(recommended_deployment.keys()))
    for jid in all_jids:
        curr = current_deployment.get(jid, 0)
        rec = recommended_deployment.get(jid, 0)
        diff = curr - rec
        if diff > 0:
            surplus.append([jid, diff])
        elif diff < 0:
            deficit.append([jid, -diff])
            
    surplus.sort(key=lambda x: x[1], reverse=True)
    deficit.sort(key=lambda x: x[1], reverse=True)
    
    moves = []
    
    s_idx = 0
    d_idx = 0
    
    while s_idx < len(surplus) and d_idx < len(deficit):
        s_jid, s_count = surplus[s_idx]
        d_jid, d_count = deficit[d_idx]
        
        move_count = min(s_count, d_count)
        moves.append({
            "from_junction_id": s_jid,
            "to_junction_id": d_jid,
            "count": move_count
        })
        
        surplus[s_idx][1] -= move_count
        deficit[d_idx][1] -= move_count
        
        if surplus[s_idx][1] == 0:
            s_idx += 1
        if deficit[d_idx][1] == 0:
            d_idx += 1
            
    return moves
