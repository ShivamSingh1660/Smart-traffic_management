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

# ---------------------------------------------------------------------------
#  Risk-tier-based caps — higher risk locations can absorb more officers
# ---------------------------------------------------------------------------
RISK_TIER_MAX = {
    "Critical": 5,
    "High": 3,
    "Medium": 2,
    "Low": 1,
}


def _max_for(risk_level: str) -> int:
    """Return the per-location officer cap for a given risk level."""
    return RISK_TIER_MAX.get(risk_level, 1)


def _greedy_fill(locations_subset, allocation, remaining):
    """
    Run the greedy priority loop over *locations_subset* only,
    mutating *allocation* in-place and returning leftover officers.
    """
    while remaining > 0:
        priorities = []
        for loc in locations_subset:
            cap = _max_for(loc.risk_level)
            assigned = allocation[loc.junction_id]
            if assigned < cap:
                prio = compute_priority(loc, assigned)
                priorities.append((prio, loc))

        if not priorities:
            break

        priorities.sort(key=lambda x: x[0], reverse=True)
        top_loc = priorities[0][1]

        cap = _max_for(top_loc.risk_level)
        assigned = allocation[top_loc.junction_id]
        to_assign = min(remaining, cap - assigned)
        allocation[top_loc.junction_id] += to_assign
        remaining -= to_assign

    return remaining


def allocate_officers(locations, available_officers: int):
    """
    Proportional + minimum-guarantee hybrid allocation.

    Step 1 — Eligible locations:
        Only Medium / High / Critical locations compete for officers.
        Low-risk locations receive 0 unless excess remains after all
        eligible locations hit their tier caps.

    Step 2 — Minimum coverage guarantee:
        In priority order, give 1 officer to every unmanned Critical/High
        location before any proportional distribution.

    Step 3 — Proportional distribution (Hamilton / largest-remainder):
        Distribute remaining officers across ALL eligible locations in
        proportion to each location's share of total eligible risk_score.

    Step 4 — Tier cap enforcement:
        Clip any location exceeding its risk-tier cap and redistribute
        clipped officers to the next-highest-priority uncapped location.
    """
    import math

    allocation = {loc.junction_id: 0 for loc in locations}
    remaining = available_officers

    # ------------------------------------------------------------------
    #  Step 1 — Identify eligible locations (Medium+)
    # ------------------------------------------------------------------
    eligible = [
        loc for loc in locations
        if loc.risk_level in ("Critical", "High", "Medium")
    ]

    # ------------------------------------------------------------------
    #  Step 2 — Minimum coverage for unmanned Critical/High locations
    # ------------------------------------------------------------------
    unmanned_crit_high = [
        loc for loc in eligible
        if loc.risk_level in ("Critical", "High") and loc.police_assigned == 0
    ]
    unmanned_crit_high.sort(
        key=lambda loc: compute_priority(loc, 0), reverse=True
    )

    pass2_only = set()  # locations that received ONLY their Step 2 minimum

    for loc in unmanned_crit_high:
        if remaining <= 0:
            break
        allocation[loc.junction_id] = 1
        remaining -= 1
        pass2_only.add(loc.junction_id)

    # ------------------------------------------------------------------
    #  Step 3 — Proportional distribution of remaining officers
    #           Uses Hamilton apportionment (largest remainder method)
    # ------------------------------------------------------------------
    total_eligible_risk = sum(loc.risk_score for loc in eligible)
    risk_shares = {}  # junction_id -> fraction (for reason strings)

    if remaining > 0 and total_eligible_risk > 0:
        # (a) Compute each location's weight and raw proportional share
        raw_shares = []
        for loc in eligible:
            weight = loc.risk_score / total_eligible_risk
            risk_shares[loc.junction_id] = weight
            raw_share = weight * remaining
            floor_share = math.floor(raw_share)
            fractional = raw_share - floor_share
            raw_shares.append((loc, floor_share, fractional))

        # (b) Give each location floor(proportional share)
        total_floored = sum(fs for _, fs, _ in raw_shares)
        leftover = remaining - total_floored

        # (c) Distribute leftover officers by largest fractional remainder
        raw_shares.sort(key=lambda x: x[2], reverse=True)
        for i, (loc, floor_share, _frac) in enumerate(raw_shares):
            extra = 1 if i < leftover else 0
            allocation[loc.junction_id] += floor_share + extra

        remaining = 0  # all distributed

    # ------------------------------------------------------------------
    #  Step 4 — Enforce tier caps; redistribute clipped officers
    # ------------------------------------------------------------------
    # Keep redistributing until no location exceeds its cap
    clipped_total = 0
    for loc in eligible:
        cap = _max_for(loc.risk_level)
        if allocation[loc.junction_id] > cap:
            clipped_total += allocation[loc.junction_id] - cap
            allocation[loc.junction_id] = cap

    # Redistribute clipped officers to uncapped eligible locations
    # in priority order (highest priority first)
    if clipped_total > 0:
        eligible_by_priority = sorted(
            eligible,
            key=lambda loc: compute_priority(loc, allocation[loc.junction_id]),
            reverse=True
        )
        while clipped_total > 0:
            distributed_any = False
            for loc in eligible_by_priority:
                if clipped_total <= 0:
                    break
                cap = _max_for(loc.risk_level)
                if allocation[loc.junction_id] < cap:
                    allocation[loc.junction_id] += 1
                    clipped_total -= 1
                    distributed_any = True
            if not distributed_any:
                break  # all eligible locations are at cap

    # Recount remaining after cap enforcement
    remaining = available_officers - sum(allocation.values())

    # Update pass2_only — if a location got topped up beyond 1, it's
    # no longer "minimum coverage only"
    for jid in list(pass2_only):
        if allocation[jid] > 1:
            pass2_only.discard(jid)

    # ------------------------------------------------------------------
    #  Step 5 — Tier-ordering safety check
    #  Enforce that every higher-tier location has STRICTLY MORE officers
    #  than every lower-tier location (Critical > High > Medium).
    #  Equal counts between tiers are violations too — a Critical location
    #  with the same allocation as a Medium location looks wrong.
    #  Exception: we can't violate tier caps or take a location below 0.
    # ------------------------------------------------------------------
    TIER_RANK = {"Critical": 3, "High": 2, "Medium": 1, "Low": 0}

    def _find_tier_violation():
        """
        Find a pair (higher-tier loc, lower-tier loc) where the higher-tier
        loc has <= officers than the lower-tier loc.  Returns (from_jid, to_jid)
        or None.  Picks the worst gap first; on ties, picks the transfer where
        the higher-tier location has the most room under its cap.
        """
        best = None
        best_gap = -1
        for higher in eligible:
            rank_h = TIER_RANK.get(higher.risk_level, 0)
            cap_h = _max_for(higher.risk_level)
            if allocation[higher.junction_id] >= cap_h:
                continue  # already at cap, can't receive more
            for lower in eligible:
                rank_l = TIER_RANK.get(lower.risk_level, 0)
                if rank_h <= rank_l:
                    continue
                if allocation[lower.junction_id] <= 0:
                    continue  # can't take from 0
                # Violation: higher-tier loc has <= officers than lower-tier loc
                if allocation[higher.junction_id] <= allocation[lower.junction_id]:
                    gap = allocation[lower.junction_id] - allocation[higher.junction_id]
                    if gap > best_gap:
                        best_gap = gap
                        best = (lower.junction_id, higher.junction_id)
        return best

    max_safety_iterations = available_officers * len(eligible) + 1
    safety_iter = 0
    while safety_iter < max_safety_iterations:
        safety_iter += 1
        transfer = _find_tier_violation()
        if transfer is None:
            break
        from_jid, to_jid = transfer
        allocation[from_jid] -= 1
        allocation[to_jid] += 1

    # Recount remaining after all adjustments
    remaining = available_officers - sum(allocation.values())

    # ------------------------------------------------------------------
    #  Step 6 — Low-risk overflow (only if excess capacity remains)
    # ------------------------------------------------------------------
    if remaining > 0:
        low_locs = [loc for loc in locations if loc.risk_level == "Low"]
        remaining = _greedy_fill(low_locs, allocation, remaining)

    # ------------------------------------------------------------------
    #  Build result list with human-readable reasons
    # ------------------------------------------------------------------
    result = []
    sorted_locations = sorted(locations, key=lambda x: x.risk_score, reverse=True)

    for loc in sorted_locations:
        recommended = allocation[loc.junction_id]
        if recommended == 0:
            continue

        # Locations that ONLY got their Step 2 minimum
        if loc.junction_id in pass2_only:
            reason_str = f"Minimum coverage for {loc.risk_level}-risk location"
        else:
            reasons = []

            # Risk tier + proportional share
            share_pct = risk_shares.get(loc.junction_id, 0) * 100
            if loc.risk_level == "Critical":
                reasons.append(
                    f"Critical risk, proportional allocation based on risk share ({share_pct:.0f}% of total eligible risk)"
                )
            elif loc.risk_level == "High":
                reasons.append(
                    f"High risk, proportional allocation ({share_pct:.0f}% risk share)"
                )
            elif loc.risk_level == "Medium":
                reasons.append(
                    f"Medium risk (score {loc.risk_score:.0f}), proportional allocation ({share_pct:.0f}% risk share)"
                )
            elif loc.risk_level == "Low" and recommended > 0:
                reasons.append("Excess capacity spillover")
            else:
                reasons.append(f"Risk score {loc.risk_score:.0f}")

            unresolved_count = sum(1 for inc in loc.incidents if not inc.resolved_flag)
            if unresolved_count > 0:
                reasons.append(f"{unresolved_count} active incident(s)")

            reason_str = ", ".join(reasons)
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
