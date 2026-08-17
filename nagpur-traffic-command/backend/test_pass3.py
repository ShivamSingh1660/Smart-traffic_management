import json
from database import SessionLocal
from models import Location
from emergency_engine import dispatch_emergency
from main import TOTAL_FORCE_SIZE

def test_pass3():
    db = SessionLocal()
    try:
        # Get target
        sitabuldi = db.query(Location).filter(Location.name == "Sitabuldi Junction").first()
        if not sitabuldi:
            print("Sitabuldi Junction not found")
            return
            
        print(f"Target: {sitabuldi.name} (Risk: {sitabuldi.risk_level})")
        
        # 1. Zero out all low risk locations
        low_risk = db.query(Location).filter(Location.risk_level == "Low").all()
        for loc in low_risk:
            loc.police_assigned = 0
            
        # 2. Make sure reserve is 0 by assigning exactly TOTAL_FORCE_SIZE officers in total
        # First, zero everything
        all_locs = db.query(Location).all()
        for loc in all_locs:
            loc.police_assigned = 0
            
        # Assign 2 to a medium risk location
        medium_locs = db.query(Location).filter(Location.risk_level == "Medium").order_by(Location.risk_score.asc()).all()
        if not medium_locs:
            print("No medium risk locations found")
            return
            
        med_target = medium_locs[0]
        med_target.police_assigned = 2
        print(f"Setup: {med_target.name} (Medium, score {med_target.risk_score}) has 2 officers")
        
        # Assign the remaining 23 to a critical location (not sitabuldi)
        critical_locs = db.query(Location).filter(Location.risk_level == "Critical", Location.junction_id != sitabuldi.junction_id).all()
        if critical_locs:
            critical_locs[0].police_assigned = TOTAL_FORCE_SIZE - 2
        else:
            # just assign to sitabuldi
            sitabuldi.police_assigned = TOTAL_FORCE_SIZE - 2
            
        db.commit()
        
        # Verify reserve pool
        from emergency_engine import compute_reserve_pool
        reserve = compute_reserve_pool(db)
        print(f"Setup: Reserve pool is {reserve}")
        
        # Run dispatch
        print("\n--- Dispatching 1 officer to Sitabuldi ---")
        result = dispatch_emergency(db, sitabuldi.junction_id, 1)
        print(json.dumps(result, indent=2))
        
        # Check medium location
        db.refresh(med_target)
        print(f"\nAfter dispatch: {med_target.name} has {med_target.police_assigned} officers")
        
    finally:
        db.close()

if __name__ == "__main__":
    test_pass3()
