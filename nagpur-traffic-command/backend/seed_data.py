"""
Seed script: populates app.db with the 18 Nagpur junctions, risk factors,
and sample incidents. Run once: python seed_data.py
"""

import os
import sys
from datetime import datetime, timedelta

# Ensure the backend directory is on the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import engine, SessionLocal, Base
from models import Location, RiskFactor, Incident

# ---------------------------------------------------------------------------
#  Location data — mirrors frontend/src/data/mockLocations.js exactly
# ---------------------------------------------------------------------------

LOCATIONS = [
    # Feature values are realistic baselines matching each junction's risk profile.
    # The ML model uses these to predict risk_score on demand.
    {"junction_id": "j001", "name": "Sitabuldi Junction",          "lat": 21.1498, "lng": 79.0806, "risk_score": 92, "risk_level": "Critical", "police_assigned": 0, "unmanned_critical": True,
     "traffic_volume": 90, "avg_speed": 12, "congestion_level": 92, "accident_count_recent": 2, "violation_count": 12, "illegal_parking_count": 8, "obstruction_count": 1, "weather": "clear", "roadwork_flag": 0, "event_flag": 0, "police_coverage": 0, "day_of_week": 0, "time_of_day": 18},
    {"junction_id": "j002", "name": "Wardha Road Flyover",         "lat": 21.1220, "lng": 79.0970, "risk_score": 87, "risk_level": "Critical", "police_assigned": 1, "unmanned_critical": False,
     "traffic_volume": 85, "avg_speed": 15, "congestion_level": 88, "accident_count_recent": 2, "violation_count": 10, "illegal_parking_count": 5, "obstruction_count": 0, "weather": "clear", "roadwork_flag": 0, "event_flag": 0, "police_coverage": 1, "day_of_week": 0, "time_of_day": 18},
    {"junction_id": "j003", "name": "Manish Nagar Square",         "lat": 21.1050, "lng": 79.0580, "risk_score": 81, "risk_level": "Critical", "police_assigned": 2, "unmanned_critical": False,
     "traffic_volume": 82, "avg_speed": 18, "congestion_level": 85, "accident_count_recent": 1, "violation_count": 9, "illegal_parking_count": 7, "obstruction_count": 1, "weather": "clear", "roadwork_flag": 0, "event_flag": 0, "police_coverage": 2, "day_of_week": 0, "time_of_day": 18},
    {"junction_id": "j004", "name": "Dharampeth Bus Stop",         "lat": 21.1530, "lng": 79.0720, "risk_score": 74, "risk_level": "High",     "police_assigned": 1, "unmanned_critical": False,
     "traffic_volume": 75, "avg_speed": 22, "congestion_level": 78, "accident_count_recent": 1, "violation_count": 8, "illegal_parking_count": 5, "obstruction_count": 0, "weather": "clear", "roadwork_flag": 0, "event_flag": 0, "police_coverage": 1, "day_of_week": 0, "time_of_day": 17},
    {"junction_id": "j005", "name": "Sadar Overbridge",            "lat": 21.1570, "lng": 79.0890, "risk_score": 68, "risk_level": "High",     "police_assigned": 3, "unmanned_critical": False,
     "traffic_volume": 70, "avg_speed": 25, "congestion_level": 72, "accident_count_recent": 0, "violation_count": 6, "illegal_parking_count": 3, "obstruction_count": 1, "weather": "clear", "roadwork_flag": 0, "event_flag": 0, "police_coverage": 3, "day_of_week": 0, "time_of_day": 17},
    {"junction_id": "j006", "name": "Kamptee Road Junction",       "lat": 21.1680, "lng": 79.0840, "risk_score": 84, "risk_level": "Critical", "police_assigned": 0, "unmanned_critical": True,
     "traffic_volume": 88, "avg_speed": 14, "congestion_level": 90, "accident_count_recent": 1, "violation_count": 11, "illegal_parking_count": 6, "obstruction_count": 2, "weather": "clear", "roadwork_flag": 1, "event_flag": 0, "police_coverage": 0, "day_of_week": 0, "time_of_day": 18},
    {"junction_id": "j007", "name": "Civil Lines Square",          "lat": 21.1560, "lng": 79.0770, "risk_score": 62, "risk_level": "High",     "police_assigned": 2, "unmanned_critical": False,
     "traffic_volume": 65, "avg_speed": 28, "congestion_level": 65, "accident_count_recent": 0, "violation_count": 5, "illegal_parking_count": 3, "obstruction_count": 0, "weather": "clear", "roadwork_flag": 0, "event_flag": 0, "police_coverage": 2, "day_of_week": 0, "time_of_day": 14},
    {"junction_id": "j008", "name": "Ramdaspeth Chowk",            "lat": 21.1410, "lng": 79.0750, "risk_score": 55, "risk_level": "Medium",   "police_assigned": 1, "unmanned_critical": False,
     "traffic_volume": 55, "avg_speed": 32, "congestion_level": 55, "accident_count_recent": 0, "violation_count": 4, "illegal_parking_count": 4, "obstruction_count": 0, "weather": "clear", "roadwork_flag": 0, "event_flag": 0, "police_coverage": 1, "day_of_week": 0, "time_of_day": 14},
    {"junction_id": "j009", "name": "Nagpur Railway Station Area",  "lat": 21.1485, "lng": 79.0880, "risk_score": 78, "risk_level": "High",     "police_assigned": 0, "unmanned_critical": True,
     "traffic_volume": 80, "avg_speed": 18, "congestion_level": 82, "accident_count_recent": 1, "violation_count": 7, "illegal_parking_count": 6, "obstruction_count": 1, "weather": "clear", "roadwork_flag": 0, "event_flag": 0, "police_coverage": 0, "day_of_week": 0, "time_of_day": 18},
    {"junction_id": "j010", "name": "Hingna Road T-Point",         "lat": 21.1190, "lng": 79.0320, "risk_score": 42, "risk_level": "Medium",   "police_assigned": 1, "unmanned_critical": False,
     "traffic_volume": 45, "avg_speed": 38, "congestion_level": 42, "accident_count_recent": 0, "violation_count": 3, "illegal_parking_count": 2, "obstruction_count": 0, "weather": "clear", "roadwork_flag": 0, "event_flag": 0, "police_coverage": 1, "day_of_week": 0, "time_of_day": 12},
    {"junction_id": "j011", "name": "Ajni Square",                 "lat": 21.1390, "lng": 79.0960, "risk_score": 36, "risk_level": "Medium",   "police_assigned": 0, "unmanned_critical": False,
     "traffic_volume": 40, "avg_speed": 40, "congestion_level": 38, "accident_count_recent": 0, "violation_count": 2, "illegal_parking_count": 2, "obstruction_count": 0, "weather": "clear", "roadwork_flag": 0, "event_flag": 0, "police_coverage": 0, "day_of_week": 0, "time_of_day": 12},
    {"junction_id": "j012", "name": "Sonegaon Junction",           "lat": 21.1280, "lng": 79.0710, "risk_score": 25, "risk_level": "Low",      "police_assigned": 1, "unmanned_critical": False,
     "traffic_volume": 30, "avg_speed": 48, "congestion_level": 25, "accident_count_recent": 0, "violation_count": 1, "illegal_parking_count": 1, "obstruction_count": 0, "weather": "clear", "roadwork_flag": 0, "event_flag": 0, "police_coverage": 1, "day_of_week": 0, "time_of_day": 10},
    {"junction_id": "j013", "name": "Trimurti Nagar Square",       "lat": 21.1130, "lng": 79.0430, "risk_score": 48, "risk_level": "Medium",   "police_assigned": 2, "unmanned_critical": False,
     "traffic_volume": 50, "avg_speed": 35, "congestion_level": 50, "accident_count_recent": 0, "violation_count": 4, "illegal_parking_count": 3, "obstruction_count": 0, "weather": "clear", "roadwork_flag": 0, "event_flag": 0, "police_coverage": 2, "day_of_week": 0, "time_of_day": 14},
    {"junction_id": "j014", "name": "Pardi Naka",                  "lat": 21.1590, "lng": 79.0960, "risk_score": 18, "risk_level": "Low",      "police_assigned": 1, "unmanned_critical": False,
     "traffic_volume": 20, "avg_speed": 55, "congestion_level": 18, "accident_count_recent": 0, "violation_count": 1, "illegal_parking_count": 0, "obstruction_count": 0, "weather": "clear", "roadwork_flag": 0, "event_flag": 0, "police_coverage": 1, "day_of_week": 0, "time_of_day": 10},
    {"junction_id": "j015", "name": "Lakadganj Chowk",             "lat": 21.1620, "lng": 79.1010, "risk_score": 71, "risk_level": "High",     "police_assigned": 1, "unmanned_critical": False,
     "traffic_volume": 72, "avg_speed": 24, "congestion_level": 74, "accident_count_recent": 0, "violation_count": 7, "illegal_parking_count": 5, "obstruction_count": 1, "weather": "clear", "roadwork_flag": 0, "event_flag": 0, "police_coverage": 1, "day_of_week": 0, "time_of_day": 17},
    {"junction_id": "j016", "name": "Gandhibagh Square",           "lat": 21.1540, "lng": 79.0930, "risk_score": 12, "risk_level": "Low",      "police_assigned": 0, "unmanned_critical": False,
     "traffic_volume": 15, "avg_speed": 58, "congestion_level": 12, "accident_count_recent": 0, "violation_count": 0, "illegal_parking_count": 0, "obstruction_count": 0, "weather": "clear", "roadwork_flag": 0, "event_flag": 0, "police_coverage": 0, "day_of_week": 0, "time_of_day": 10},
    {"junction_id": "j017", "name": "Pratap Nagar Junction",       "lat": 21.1340, "lng": 79.0580, "risk_score": 58, "risk_level": "Medium",   "police_assigned": 2, "unmanned_critical": False,
     "traffic_volume": 60, "avg_speed": 30, "congestion_level": 60, "accident_count_recent": 0, "violation_count": 5, "illegal_parking_count": 4, "obstruction_count": 0, "weather": "clear", "roadwork_flag": 0, "event_flag": 0, "police_coverage": 2, "day_of_week": 0, "time_of_day": 14},
    {"junction_id": "j018", "name": "Besa Square",                 "lat": 21.1060, "lng": 79.0830, "risk_score": 22, "risk_level": "Low",      "police_assigned": 1, "unmanned_critical": False,
     "traffic_volume": 25, "avg_speed": 50, "congestion_level": 22, "accident_count_recent": 0, "violation_count": 1, "illegal_parking_count": 1, "obstruction_count": 0, "weather": "clear", "roadwork_flag": 0, "event_flag": 0, "police_coverage": 1, "day_of_week": 0, "time_of_day": 10},
]

# ---------------------------------------------------------------------------
#  Risk factors — 2-3 per location, logically matching their risk profile
# ---------------------------------------------------------------------------

RISK_FACTORS = [
    # j001 - Sitabuldi Junction (92, Critical, unmanned)
    {"junction_id": "j001", "factor": "Heavy congestion",               "contribution": 0.31},
    {"junction_id": "j001", "factor": "3 recent accidents",             "contribution": 0.28},
    {"junction_id": "j001", "factor": "No police currently deployed",   "contribution": 0.22},
    # j002 - Wardha Road Flyover (87, Critical)
    {"junction_id": "j002", "factor": "High-speed corridor",            "contribution": 0.30},
    {"junction_id": "j002", "factor": "2 recent accidents",             "contribution": 0.25},
    {"junction_id": "j002", "factor": "Poor visibility section",        "contribution": 0.18},
    # j003 - Manish Nagar Square (81, Critical)
    {"junction_id": "j003", "factor": "Heavy congestion",               "contribution": 0.28},
    {"junction_id": "j003", "factor": "High violation count",           "contribution": 0.24},
    {"junction_id": "j003", "factor": "Illegal parking",                "contribution": 0.15},
    # j004 - Dharampeth Bus Stop (74, High)
    {"junction_id": "j004", "factor": "Pedestrian-vehicle conflict",    "contribution": 0.27},
    {"junction_id": "j004", "factor": "High violation count",           "contribution": 0.22},
    {"junction_id": "j004", "factor": "Bus stop congestion",            "contribution": 0.14},
    # j005 - Sadar Overbridge (68, High)
    {"junction_id": "j005", "factor": "Structural narrowing",           "contribution": 0.24},
    {"junction_id": "j005", "factor": "Moderate congestion",            "contribution": 0.20},
    # j006 - Kamptee Road Junction (84, Critical, unmanned)
    {"junction_id": "j006", "factor": "High accident history",          "contribution": 0.30},
    {"junction_id": "j006", "factor": "No police currently deployed",   "contribution": 0.25},
    {"junction_id": "j006", "factor": "Roadwork obstruction",           "contribution": 0.16},
    # j007 - Civil Lines Square (62, High)
    {"junction_id": "j007", "factor": "Moderate congestion",            "contribution": 0.22},
    {"junction_id": "j007", "factor": "School zone proximity",          "contribution": 0.19},
    # j008 - Ramdaspeth Chowk (55, Medium)
    {"junction_id": "j008", "factor": "Illegal parking",                "contribution": 0.20},
    {"junction_id": "j008", "factor": "Moderate congestion",            "contribution": 0.17},
    # j009 - Railway Station Area (78, High, unmanned)
    {"junction_id": "j009", "factor": "Extreme pedestrian density",     "contribution": 0.28},
    {"junction_id": "j009", "factor": "No police currently deployed",   "contribution": 0.22},
    {"junction_id": "j009", "factor": "Auto-rickshaw congestion",       "contribution": 0.15},
    # j010 - Hingna Road T-Point (42, Medium)
    {"junction_id": "j010", "factor": "Moderate congestion",            "contribution": 0.18},
    {"junction_id": "j010", "factor": "Poor signage",                   "contribution": 0.12},
    # j011 - Ajni Square (36, Medium)
    {"junction_id": "j011", "factor": "Light congestion",               "contribution": 0.15},
    {"junction_id": "j011", "factor": "Illegal parking",                "contribution": 0.10},
    # j012 - Sonegaon Junction (25, Low)
    {"junction_id": "j012", "factor": "Low traffic volume",             "contribution": 0.10},
    {"junction_id": "j012", "factor": "Good road infrastructure",       "contribution": 0.08},
    # j013 - Trimurti Nagar Square (48, Medium)
    {"junction_id": "j013", "factor": "Moderate congestion",            "contribution": 0.19},
    {"junction_id": "j013", "factor": "School zone proximity",          "contribution": 0.14},
    # j014 - Pardi Naka (18, Low)
    {"junction_id": "j014", "factor": "Low traffic volume",             "contribution": 0.09},
    {"junction_id": "j014", "factor": "Good visibility",                "contribution": 0.05},
    # j015 - Lakadganj Chowk (71, High)
    {"junction_id": "j015", "factor": "Heavy congestion",               "contribution": 0.25},
    {"junction_id": "j015", "factor": "High violation count",           "contribution": 0.21},
    {"junction_id": "j015", "factor": "Narrow road width",              "contribution": 0.12},
    # j016 - Gandhibagh Square (12, Low)
    {"junction_id": "j016", "factor": "Low traffic volume",             "contribution": 0.06},
    {"junction_id": "j016", "factor": "Wide road infrastructure",       "contribution": 0.04},
    # j017 - Pratap Nagar Junction (58, Medium)
    {"junction_id": "j017", "factor": "Moderate congestion",            "contribution": 0.21},
    {"junction_id": "j017", "factor": "Illegal parking",                "contribution": 0.16},
    # j018 - Besa Square (22, Low)
    {"junction_id": "j018", "factor": "Low traffic volume",             "contribution": 0.10},
    {"junction_id": "j018", "factor": "Developing area — few intersections", "contribution": 0.07},
]

# ---------------------------------------------------------------------------
#  Sample incidents
# ---------------------------------------------------------------------------

NOW = datetime(2026, 8, 15, 9, 0, 0)

INCIDENTS = [
    {"incident_id": "i001", "junction_id": "j001", "type": "accident",   "severity": "high",   "timestamp": NOW - timedelta(hours=2),  "resolved_flag": False},
    {"incident_id": "i002", "junction_id": "j001", "type": "accident",   "severity": "medium", "timestamp": NOW - timedelta(hours=5),  "resolved_flag": False},
    {"incident_id": "i003", "junction_id": "j001", "type": "violation",  "severity": "low",    "timestamp": NOW - timedelta(hours=8),  "resolved_flag": True},
    {"incident_id": "i004", "junction_id": "j002", "type": "accident",   "severity": "high",   "timestamp": NOW - timedelta(hours=1),  "resolved_flag": False},
    {"incident_id": "i005", "junction_id": "j002", "type": "accident",   "severity": "medium", "timestamp": NOW - timedelta(hours=12), "resolved_flag": False},
    {"incident_id": "i006", "junction_id": "j003", "type": "violation",  "severity": "medium", "timestamp": NOW - timedelta(hours=3),  "resolved_flag": False},
    {"incident_id": "i007", "junction_id": "j004", "type": "violation",  "severity": "high",   "timestamp": NOW - timedelta(hours=4),  "resolved_flag": False},
    {"incident_id": "i008", "junction_id": "j006", "type": "obstruction","severity": "high",   "timestamp": NOW - timedelta(hours=1),  "resolved_flag": False},
    {"incident_id": "i009", "junction_id": "j006", "type": "accident",   "severity": "medium", "timestamp": NOW - timedelta(hours=6),  "resolved_flag": False},
    {"incident_id": "i010", "junction_id": "j009", "type": "accident",   "severity": "high",   "timestamp": NOW - timedelta(hours=0, minutes=48), "resolved_flag": False},
    {"incident_id": "i011", "junction_id": "j015", "type": "violation",  "severity": "medium", "timestamp": NOW - timedelta(hours=2),  "resolved_flag": False},
    {"incident_id": "i012", "junction_id": "j013", "type": "illegal_parking", "severity": "low", "timestamp": NOW - timedelta(hours=7), "resolved_flag": True},
]


# ---------------------------------------------------------------------------
#  Seed function
# ---------------------------------------------------------------------------

def seed_database(db):
    # Locations
    for loc_data in LOCATIONS:
        db.add(Location(**loc_data))

    # Risk factors
    for rf_data in RISK_FACTORS:
        db.add(RiskFactor(**rf_data))

    # Incidents
    for inc_data in INCIDENTS:
        db.add(Incident(**inc_data))

    db.commit()
    print(f"[OK] Seeded {len(LOCATIONS)} locations")
    print(f"[OK] Seeded {len(RISK_FACTORS)} risk factors")
    print(f"[OK] Seeded {len(INCIDENTS)} incidents")

def seed():
    # Create all tables
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        seed_database(db)
        print("[OK] Database ready at app.db")
    except Exception as e:
        db.rollback()
        print(f"[FAIL] Seed failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
