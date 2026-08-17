import json
from database import SessionLocal
from models import Location
from main import TOTAL_FORCE_SIZE, get_total_deployed, _compute_unmanned_critical

def fix_db():
    db = SessionLocal()
    total_deployed = get_total_deployed(db)
    
    print(f"Total deployed before fix: {total_deployed}")
    
    if total_deployed <= TOTAL_FORCE_SIZE:
        print("No fix needed.")
        db.close()
        return

    # Get all locations with police assigned, sorted by risk_score ASCENDING (lowest risk first)
    locations = db.query(Location).filter(Location.police_assigned > 0).order_by(Location.risk_score.asc()).all()
    
    before_state = {loc.junction_id: {"name": loc.name, "police_assigned": loc.police_assigned, "risk_score": loc.risk_score} for loc in locations}
    
    excess = total_deployed - TOTAL_FORCE_SIZE
    reduced = 0
    
    # Loop over locations and reduce 1 at a time from lowest risk first until excess is 0
    while excess > 0:
        for loc in locations:
            if excess <= 0:
                break
            if loc.police_assigned > 0:
                loc.police_assigned -= 1
                loc.unmanned_critical = _compute_unmanned_critical(loc.risk_level, loc.police_assigned)
                excess -= 1
                reduced += 1
                
    db.commit()
    
    after_state = {loc.junction_id: {"name": loc.name, "police_assigned": loc.police_assigned, "risk_score": loc.risk_score} for loc in locations}
    
    total_deployed_after = get_total_deployed(db)
    print(f"Total deployed after fix: {total_deployed_after}")
    
    print("\nChanges made:")
    for jid, before in before_state.items():
        after = after_state[jid]
        if before["police_assigned"] != after["police_assigned"]:
            print(f"- {before['name']} (Risk: {before['risk_score']}): {before['police_assigned']} -> {after['police_assigned']}")
            
    db.close()

if __name__ == "__main__":
    fix_db()
