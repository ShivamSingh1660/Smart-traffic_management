from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from models import Location, EmergencyDispatch

def compute_reserve_pool(db: Session) -> int:
    from main import TOTAL_FORCE_SIZE
    total_assigned = db.query(func.sum(Location.police_assigned)).scalar() or 0
    return TOTAL_FORCE_SIZE - total_assigned

def dispatch_emergency(db: Session, junction_id: str, officers_needed: int) -> dict:
    """
    Dispatches officers to a target location in an emergency, pulling from available sources in 3 tiers:
    Pass 1: Reserve pool
    Pass 2: Low-risk locations (can be reduced down to 0)
    Pass 3: Medium-risk locations (can be reduced down to minimum 1)
    
    Never pulls from High or Critical risk locations.
    Returns a dict with fulfillment details and sources.
    """
    from main import _compute_unmanned_critical, MAX_OFFICERS_PER_LOCATION
    
    target_loc = db.query(Location).filter(Location.junction_id == junction_id).first()
    if not target_loc:
        raise ValueError("Target location not found")

    original_requested = officers_needed
    message = "Success"
    
    max_can_take = MAX_OFFICERS_PER_LOCATION - target_loc.police_assigned
    if max_can_take <= 0:
        return {
            "junction_id": junction_id,
            "requested": original_requested,
            "fulfilled": 0,
            "sources": [],
            "new_police_assigned": target_loc.police_assigned,
            "message": f"Target already at or above maximum capacity of {MAX_OFFICERS_PER_LOCATION} officers per location."
        }
        
    if officers_needed > max_can_take:
        officers_needed = max_can_take
        message = f"Requested amount reduced due to maximum capacity of {MAX_OFFICERS_PER_LOCATION} officers per location."

    reserve_pool = compute_reserve_pool(db)
    remaining_needed = officers_needed
    officers_taken = []
    
    timestamp = datetime.utcnow()
    trigger_risk_level = target_loc.risk_level

    # 1. Take from reserve
    if reserve_pool > 0:
        take_from_reserve = min(reserve_pool, remaining_needed)
        officers_taken.append({"from": "reserve", "count": take_from_reserve, "tier": "Reserve"})
        remaining_needed -= take_from_reserve
        
        record = EmergencyDispatch(
            to_junction_id=junction_id,
            from_source="reserve",
            officer_count=take_from_reserve,
            timestamp=timestamp,
            status="active",
            trigger_risk_level=trigger_risk_level
        )
        db.add(record)

    # 2. Take from Low risk locations
    if remaining_needed > 0:
        low_risk_locs = db.query(Location).filter(
            Location.risk_level == "Low",
            Location.police_assigned > 0
        ).order_by(Location.risk_score.asc()).all()
        
        if low_risk_locs:
            sources_dict = {}
            while remaining_needed > 0:
                took_any = False
                for loc in low_risk_locs:
                    if remaining_needed == 0:
                        break
                    if loc.police_assigned > 0:
                        loc.police_assigned -= 1
                        loc.unmanned_critical = _compute_unmanned_critical(loc.risk_level, loc.police_assigned)
                        remaining_needed -= 1
                        sources_dict[loc.junction_id] = sources_dict.get(loc.junction_id, 0) + 1
                        took_any = True
                
                if not took_any:
                    break
                    
            for src_junction_id, count in sources_dict.items():
                officers_taken.append({"from": src_junction_id, "count": count, "tier": "Low risk"})
                record = EmergencyDispatch(
                    to_junction_id=junction_id,
                    from_source=src_junction_id,
                    officer_count=count,
                    timestamp=timestamp,
                    status="active",
                    trigger_risk_level=trigger_risk_level
                )
                db.add(record)
                
    # 3. Take from Medium risk locations (down to min 1)
    if remaining_needed > 0:
        medium_risk_locs = db.query(Location).filter(
            Location.risk_level == "Medium",
            Location.police_assigned >= 2
        ).order_by(Location.risk_score.asc()).all()
        
        if medium_risk_locs:
            sources_dict = {}
            while remaining_needed > 0:
                took_any = False
                for loc in medium_risk_locs:
                    if remaining_needed == 0:
                        break
                    if loc.police_assigned >= 2:
                        loc.police_assigned -= 1
                        loc.unmanned_critical = _compute_unmanned_critical(loc.risk_level, loc.police_assigned)
                        remaining_needed -= 1
                        sources_dict[loc.junction_id] = sources_dict.get(loc.junction_id, 0) + 1
                        took_any = True
                
                if not took_any:
                    break
                    
            for src_junction_id, count in sources_dict.items():
                officers_taken.append({"from": src_junction_id, "count": count, "tier": "Medium risk"})
                record = EmergencyDispatch(
                    to_junction_id=junction_id,
                    from_source=src_junction_id,
                    officer_count=count,
                    timestamp=timestamp,
                    status="active",
                    trigger_risk_level=trigger_risk_level
                )
                db.add(record)
                
    actual_gathered = officers_needed - remaining_needed
    
    if actual_gathered > 0:
        target_loc.police_assigned += actual_gathered
        target_loc.unmanned_critical = _compute_unmanned_critical(target_loc.risk_level, target_loc.police_assigned)

    db.commit()

    return {
        "junction_id": junction_id,
        "requested": original_requested,
        "fulfilled": actual_gathered,
        "sources": officers_taken,
        "new_police_assigned": target_loc.police_assigned,
        "message": message
    }

def check_and_process_returns(db: Session) -> list:
    from main import _compute_unmanned_critical
    
    active_dispatches = db.query(EmergencyDispatch).filter(EmergencyDispatch.status == "active").all()
    
    grouped = {}
    for dispatch in active_dispatches:
        if dispatch.to_junction_id not in grouped:
            grouped[dispatch.to_junction_id] = []
        grouped[dispatch.to_junction_id].append(dispatch)
        
    returned_info = []
    
    for to_junction_id, dispatches in grouped.items():
        target_loc = db.query(Location).filter(Location.junction_id == to_junction_id).first()
        if not target_loc:
            continue
            
        if target_loc.risk_level in ["Medium", "Low"]:
            total_returned = 0
            
            for dispatch in dispatches:
                if dispatch.from_source != "reserve":
                    src_loc = db.query(Location).filter(Location.junction_id == dispatch.from_source).first()
                    if src_loc:
                        src_loc.police_assigned += dispatch.officer_count
                        src_loc.unmanned_critical = _compute_unmanned_critical(src_loc.risk_level, src_loc.police_assigned)
                
                total_returned += dispatch.officer_count
                dispatch.status = "returned"
                
                returned_info.append({
                    "from_junction": dispatch.from_source,
                    "to_junction": dispatch.to_junction_id,
                    "count": dispatch.officer_count,
                    "reason": "risk resolved"
                })
                
            target_loc.police_assigned -= total_returned
            if target_loc.police_assigned < 0:
                target_loc.police_assigned = 0
            target_loc.unmanned_critical = _compute_unmanned_critical(target_loc.risk_level, target_loc.police_assigned)
            
    if returned_info:
        db.commit()
        
    return returned_info
