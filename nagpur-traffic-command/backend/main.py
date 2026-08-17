"""
Nagpur Traffic Command — FastAPI backend.
Implements all endpoints from docs/API_CONTRACT.md.
"""

import uuid
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from database import engine, get_db, Base
from models import Location, Incident, RiskFactor, OverrideLog, EmergencyDispatch

TOTAL_FORCE_SIZE = 60
MAX_OFFICERS_PER_LOCATION = 8

# ---------------------------------------------------------------------------
#  ML risk engine — loaded ONCE at module import time (not per request)
# ---------------------------------------------------------------------------

from risk_engine import load_model, predict_risk, explain_prediction

# Verify the model loaded successfully at startup
assert load_model(), "ML model failed to load from backend/ml_artifacts/"

# ---------------------------------------------------------------------------
#  Create tables on startup (safe — does nothing if they already exist)
# ---------------------------------------------------------------------------

Base.metadata.create_all(bind=engine)

# ---------------------------------------------------------------------------
#  App setup
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Nagpur Traffic Command Backend",
    description="AI-Based Traffic Risk Heatmap and Police Deployment Decision Support",
    version="0.1.0",
)

# CORS — allow the Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
#  Pydantic request/response schemas
# ---------------------------------------------------------------------------


class IncidentCreate(BaseModel):
    junction_id: str
    type: str
    severity: str

    @field_validator("severity")
    @classmethod
    def validate_severity(cls, v):
        allowed = {"low", "medium", "high"}
        if v.lower() not in allowed:
            raise ValueError(f"severity must be one of {allowed}")
        return v.lower()


class OverrideRequest(BaseModel):
    junction_id: str
    action: str
    officers: Optional[int] = None

    @field_validator("action")
    @classmethod
    def validate_action(cls, v):
        allowed = {"accept", "modify", "reject"}
        if v.lower() not in allowed:
            raise ValueError(f"action must be one of {allowed}")
        return v.lower()


class EmergencyRequest(BaseModel):
    junction_id: str
    officers_needed: int


class ApplyAllRequest(BaseModel):
    available_officers: int


# ---------------------------------------------------------------------------
#  Helpers
# ---------------------------------------------------------------------------


def _compute_risk_level(score: int) -> str:
    """Derive risk_level from numeric risk_score."""
    if score >= 81:
        return "Critical"
    elif score >= 61:
        return "High"
    elif score >= 31:
        return "Medium"
    else:
        return "Low"


def get_total_deployed(db: Session) -> int:
    from sqlalchemy.sql import func
    return db.query(func.sum(Location.police_assigned)).scalar() or 0


def _compute_unmanned_critical(risk_level: str, police_assigned: int) -> bool:
    """True when risk is High/Critical and no police are assigned."""
    return risk_level in ("High", "Critical") and police_assigned == 0


# The ML model alone under-weights rare accident events due to limited
# training data. This adjustment is a deliberate, transparent rule-based
# correction layered on top of the ML prediction, and is disclosed as
# such — NOT presented as a pure ML output.
SEVERITY_BOOST = {"high": 12, "medium": 6, "low": 3}


def _get_feature_dict(loc: Location) -> dict:
    """Extract the feature dict from a Location ORM object for ML prediction."""
    return {
        "day_of_week": loc.day_of_week,
        "time_of_day": loc.time_of_day,
        "traffic_volume": loc.traffic_volume,
        "avg_speed": loc.avg_speed,
        "congestion_level": loc.congestion_level,
        "accident_count_recent": loc.accident_count_recent,
        "violation_count": loc.violation_count,
        "illegal_parking_count": loc.illegal_parking_count,
        "obstruction_count": loc.obstruction_count,
        "weather": loc.weather,
        "roadwork_flag": loc.roadwork_flag,
        "event_flag": loc.event_flag,
        "police_coverage": loc.police_coverage,
    }


def _location_summary(loc: Location) -> dict:
    """Serialize a Location to the GET /locations response shape."""
    return {
        "junction_id": loc.junction_id,
        "name": loc.name,
        "lat": loc.lat,
        "lng": loc.lng,
        "risk_score": loc.risk_score,
        "risk_level": loc.risk_level,
        "police_assigned": loc.police_assigned,
        "unmanned_critical": loc.unmanned_critical,
    }


def _location_detail(loc: Location, db: Session) -> dict:
    """Serialize a Location to the GET /locations/{id} response shape."""

    # ---------------------------------------------------------------
    #  REAL ML-driven explainability — replaces static seeded RiskFactor rows.
    #  Uses the trained RandomForest model's feature importances combined
    #  with this location's current feature values to produce a per-prediction
    #  contribution breakdown.
    #
    #  NOTE: The RiskFactor table is kept in the schema for backward
    #  compatibility but is no longer used by this endpoint.
    # ---------------------------------------------------------------
    features = _get_feature_dict(loc)

    # Calculate severity boost from the most recent unresolved incident
    severity_boost = 0
    recent_incident = loc.incidents.filter(Incident.resolved_flag == False).order_by(
        Incident.timestamp.desc()
    ).first()
    if recent_incident:
        severity_boost = SEVERITY_BOOST.get(recent_incident.severity, 0)

    risk_factors = explain_prediction(features, top_n=5, severity_boost=severity_boost)

    recent_incidents = [
        {
            "incident_id": inc.incident_id,
            "type": inc.type,
            "severity": inc.severity,
            "timestamp": inc.timestamp.isoformat(),
        }
        for inc in loc.incidents.limit(10).all()
    ]

    # recommended_police: simple heuristic — stub for now
    # STUB: will be replaced by deployment algorithm in a later step (Step 11)
    if loc.risk_level == "Critical":
        recommended = 3
    elif loc.risk_level == "High":
        recommended = 2
    elif loc.risk_level == "Medium":
        recommended = 1
    else:
        recommended = 0

    result = _location_summary(loc)
    result["risk_factors"] = risk_factors
    result["recommended_police"] = recommended
    result["recent_incidents"] = recent_incidents
    return result


# ---------------------------------------------------------------------------
#  Root & health
# ---------------------------------------------------------------------------


@app.get("/")
async def root():
    return {"status": "ok", "service": "nagpur-traffic-backend"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


# ---------------------------------------------------------------------------
#  GET /locations
# ---------------------------------------------------------------------------


@app.get("/locations")
def get_locations(db: Session = Depends(get_db)):
    from emergency_engine import check_and_process_returns
    returned = check_and_process_returns(db)
    if returned:
        print("Auto-processed returns:", returned)

    locations = db.query(Location).order_by(Location.risk_score.desc()).all()
    return {
        "locations": [_location_summary(loc) for loc in locations],
        "auto_returns": returned
    }


# ---------------------------------------------------------------------------
#  GET /locations/{junction_id}
# ---------------------------------------------------------------------------


@app.get("/locations/{junction_id}")
def get_location_detail(junction_id: str, db: Session = Depends(get_db)):
    loc = db.query(Location).filter(Location.junction_id == junction_id).first()
    if not loc:
        raise HTTPException(status_code=404, detail=f"Location '{junction_id}' not found")
    return _location_detail(loc, db)


# ---------------------------------------------------------------------------
#  GET /incidents
# ---------------------------------------------------------------------------


@app.get("/incidents")
def get_incidents(db: Session = Depends(get_db)):
    incidents = db.query(Incident).order_by(Incident.timestamp.desc()).all()
    return [
        {
            "incident_id": inc.incident_id,
            "junction_id": inc.junction_id,
            "type": inc.type,
            "severity": inc.severity,
            "timestamp": inc.timestamp.isoformat(),
            "resolved_flag": inc.resolved_flag,
        }
        for inc in incidents
    ]


# ---------------------------------------------------------------------------
#  POST /incidents
# ---------------------------------------------------------------------------


@app.post("/incidents", status_code=201)
def create_incident(body: IncidentCreate, db: Session = Depends(get_db)):
    # Validate junction exists
    loc = db.query(Location).filter(Location.junction_id == body.junction_id).first()
    if not loc:
        raise HTTPException(status_code=404, detail=f"Location '{body.junction_id}' not found")

    # Create the incident
    incident = Incident(
        incident_id=f"i{uuid.uuid4().hex[:8]}",
        junction_id=body.junction_id,
        type=body.type,
        severity=body.severity,
        timestamp=datetime.utcnow(),
        resolved_flag=False,
    )
    db.add(incident)

    # ---------------------------------------------------------------
    #  REAL ML-driven risk recalculation — replaces the Step 7 stub.
    #
    #  1. Increment raw feature(s) on the location based on incident type
    #  2. Call predict_risk() with the full updated feature set
    #  3. Recompute risk_level and unmanned_critical from the new score
    # ---------------------------------------------------------------

    # --- Feature mutation by incident type ---
    # Each incident type bumps the relevant raw feature columns.
    # Severity scales the bump: high=3, medium=2, low=1 multiplier.
    severity_mult = {"high": 3, "medium": 2, "low": 1}
    mult = severity_mult.get(body.severity, 1)

    incident_type = body.type.lower()

    if incident_type == "accident":
        # Accident: bump accident count, slightly reduce avg speed
        loc.accident_count_recent += 1
        loc.avg_speed -= 2 * mult
        loc.congestion_level += 3 * mult
    elif incident_type == "violation":
        # Traffic violation: bump violation count
        loc.violation_count += mult
    elif incident_type in ("congestion", "traffic"):
        # Congestion event: bump congestion and traffic volume
        loc.congestion_level += 5 * mult
        loc.traffic_volume += 5 * mult
        loc.avg_speed -= 3 * mult
    elif incident_type == "obstruction":
        # Road obstruction
        loc.obstruction_count += 1
        loc.avg_speed -= 2 * mult
    elif incident_type == "illegal_parking":
        # Illegal parking
        loc.illegal_parking_count += mult
    else:
        # Unknown type: treat as generic congestion bump
        loc.congestion_level += 3 * mult

    # --- Run ML prediction with updated features ---
    features = _get_feature_dict(loc)
    ml_score = predict_risk(features)

    # --- Rule-based severity adjustment (transparent, disclosed) ---
    # The ML model alone under-weights rare accident events due to limited
    # training data. This adjustment is a deliberate, transparent rule-based
    # correction layered on top of the ML prediction, and is disclosed as
    # such — NOT presented as a pure ML output.
    boost = SEVERITY_BOOST.get(body.severity, 0) if incident_type == "accident" else 0
    loc.risk_score = min(ml_score + boost, 100)

    loc.risk_level = _compute_risk_level(loc.risk_score)
    loc.unmanned_critical = _compute_unmanned_critical(loc.risk_level, loc.police_assigned)

    db.commit()
    db.refresh(loc)

    return _location_detail(loc, db)


# ---------------------------------------------------------------------------
#  POST /incidents/{incident_id}/resolve
# ---------------------------------------------------------------------------

@app.post("/incidents/{incident_id}/resolve")
def resolve_incident(incident_id: str, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.incident_id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found")
        
    if incident.resolved_flag:
        return {"status": "already_resolved"}
        
    loc = db.query(Location).filter(Location.junction_id == incident.junction_id).first()
    if not loc:
        raise HTTPException(status_code=404, detail=f"Location '{incident.junction_id}' not found")
        
    incident.resolved_flag = True
    
    # Reverse the feature mutations
    severity_mult = {"high": 3, "medium": 2, "low": 1}
    mult = severity_mult.get(incident.severity, 1)
    incident_type = incident.type.lower()
    
    if incident_type == "accident":
        loc.accident_count_recent -= 1
        loc.avg_speed += 2 * mult
        loc.congestion_level -= 3 * mult
    elif incident_type == "violation":
        loc.violation_count -= mult
    elif incident_type in ("congestion", "traffic"):
        loc.congestion_level -= 5 * mult
        loc.traffic_volume -= 5 * mult
        loc.avg_speed += 3 * mult
    elif incident_type == "obstruction":
        loc.obstruction_count -= 1
        loc.avg_speed += 2 * mult
    elif incident_type == "illegal_parking":
        loc.illegal_parking_count -= mult
    else:
        loc.congestion_level -= 3 * mult
        
    # Run ML prediction with updated features
    features = _get_feature_dict(loc)
    ml_score = predict_risk(features)
    
    # Check if there's still an active accident to apply boost
    active_accident = loc.incidents.filter(Incident.resolved_flag == False, Incident.type.ilike('accident')).order_by(Incident.timestamp.desc()).first()
    boost = SEVERITY_BOOST.get(active_accident.severity, 0) if active_accident else 0
    loc.risk_score = min(ml_score + boost, 100)
    
    loc.risk_level = _compute_risk_level(loc.risk_score)
    loc.unmanned_critical = _compute_unmanned_critical(loc.risk_level, loc.police_assigned)
    
    db.commit()
    db.refresh(loc)
    
    return _location_detail(loc, db)

# ---------------------------------------------------------------------------
#  GET /deployment/current
# ---------------------------------------------------------------------------


@app.get("/deployment/current")
def get_current_deployment(db: Session = Depends(get_db)):
    locations = db.query(Location).order_by(Location.risk_score.desc()).all()
    return [
        {
            "junction_id": loc.junction_id,
            "name": loc.name,
            "police_assigned": loc.police_assigned,
            "risk_score": loc.risk_score,
            "risk_level": loc.risk_level,
        }
        for loc in locations
    ]


from deployment_engine import allocate_officers, compute_moves

# ---------------------------------------------------------------------------
#  GET /deployment/recommendation?available_officers=10
# ---------------------------------------------------------------------------


@app.get("/deployment/recommendation")
def get_deployment_recommendation(
    available_officers: int = Query(10, ge=0, description="Number of officers available"),
    db: Session = Depends(get_db),
):
    """
    REAL deployment algorithm — uses greedy allocation based on risk and active incidents.
    Replaces the Step 7 round-robin stub.
    """
    locations = db.query(Location).all()
    return allocate_officers(locations, available_officers)


# ---------------------------------------------------------------------------
#  GET /deployment/moves?available_officers=10
# ---------------------------------------------------------------------------


@app.get("/deployment/moves")
def get_deployment_moves(
    available_officers: int = Query(10, ge=0, description="Number of officers available"),
    db: Session = Depends(get_db),
):
    """
    Computes moves from current deployment to recommended deployment.
    """
    locations = db.query(Location).all()
    current_deployment = {loc.junction_id: loc.police_assigned for loc in locations}
    
    recommendation = allocate_officers(locations, available_officers)
    recommended_deployment = {item["junction_id"]: item["recommended_officers"] for item in recommendation}
    
    # Fill in zeros for locations not in recommendation
    for loc in locations:
        if loc.junction_id not in recommended_deployment:
            recommended_deployment[loc.junction_id] = 0
            
    moves = compute_moves(current_deployment, recommended_deployment)
    return moves


# ---------------------------------------------------------------------------
#  POST /deployment/override
# ---------------------------------------------------------------------------


@app.post("/deployment/override")
def override_deployment(body: OverrideRequest, db: Session = Depends(get_db)):
    # Validate junction exists
    loc = db.query(Location).filter(Location.junction_id == body.junction_id).first()
    if not loc:
        raise HTTPException(status_code=404, detail=f"Location '{body.junction_id}' not found")

    # Validate: "modify" requires an officers count
    if body.action == "modify" and body.officers is None:
        raise HTTPException(
            status_code=422,
            detail="'officers' field is required when action is 'modify'",
        )

    if body.officers is not None and body.officers < 0:
        raise HTTPException(
            status_code=422,
            detail="'officers' must be a non-negative integer",
        )

    # Apply the override
    if body.action in ("accept", "modify"):
        if body.action == "accept" and body.officers is None:
            # Use recommended_police heuristic as fallback
            # STUB: this heuristic will be replaced by real recommendation data
            if loc.risk_level == "Critical":
                new_officers = 3
            elif loc.risk_level == "High":
                new_officers = 2
            elif loc.risk_level == "Medium":
                new_officers = 1
            else:
                new_officers = 0
        else:
            new_officers = body.officers

        diff = new_officers - loc.police_assigned
        
        if new_officers > MAX_OFFICERS_PER_LOCATION:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot assign {new_officers} officers to a single location - maximum is {MAX_OFFICERS_PER_LOCATION} per location to ensure reasonable coverage distribution across the city."
            )
            
        if diff > 0:
            total_deployed = get_total_deployed(db)
            if total_deployed + diff > TOTAL_FORCE_SIZE:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot assign {new_officers} officers - would exceed total force size of {TOTAL_FORCE_SIZE}. Currently {total_deployed} officers are deployed."
                )

        loc.police_assigned = new_officers
        loc.unmanned_critical = _compute_unmanned_critical(loc.risk_level, loc.police_assigned)

    # action == "reject" → no change to police_assigned

    # Log the override
    override_log = OverrideLog(
        junction_id=body.junction_id,
        action=body.action,
        officers=body.officers,
        timestamp=datetime.utcnow(),
    )
    db.add(override_log)
    db.commit()
    db.refresh(loc)

    return _location_summary(loc)


# ---------------------------------------------------------------------------
#  POST /deployment/apply-all
# ---------------------------------------------------------------------------


@app.post("/deployment/apply-all")
def apply_all_recommendations(body: ApplyAllRequest, db: Session = Depends(get_db)):
    """
    Applies the full recommendation across all locations simultaneously.
    """
    locations = db.query(Location).all()
    recommendation = allocate_officers(locations, body.available_officers)
    
    recommended_deployment = {item["junction_id"]: item["recommended_officers"] for item in recommendation}
    
    for loc in locations:
        rec_val = recommended_deployment.get(loc.junction_id, 0)
        loc.police_assigned = rec_val
        loc.unmanned_critical = _compute_unmanned_critical(loc.risk_level, loc.police_assigned)
        
    db.commit()
    
    updated_locations = db.query(Location).order_by(Location.risk_score.desc()).all()
    return [_location_summary(loc) for loc in updated_locations]


# ---------------------------------------------------------------------------
#  POST /deployment/reset
# ---------------------------------------------------------------------------


@app.post("/deployment/reset")
def reset_deployment(db: Session = Depends(get_db)):
    """
    Reset ALL locations: set police_assigned to 0 and recompute
    unmanned_critical for each. Returns the full updated location list.
    """
    locations = db.query(Location).all()
    for loc in locations:
        loc.police_assigned = 0
        loc.unmanned_critical = _compute_unmanned_critical(loc.risk_level, 0)
    db.commit()

    # Re-query to get refreshed state, ordered by risk
    locations = db.query(Location).order_by(Location.risk_score.desc()).all()
    return [_location_summary(loc) for loc in locations]


# ---------------------------------------------------------------------------
#  Emergency Deployment
# ---------------------------------------------------------------------------

@app.post("/deployment/emergency")
def dispatch_emergency_endpoint(body: EmergencyRequest, db: Session = Depends(get_db)):
    from emergency_engine import dispatch_emergency
    result = dispatch_emergency(db, body.junction_id, body.officers_needed)
    return result


@app.get("/deployment/reserve")
def get_reserve(db: Session = Depends(get_db)):
    from emergency_engine import compute_reserve_pool
    return {
        "reserve_pool": compute_reserve_pool(db),
        "total_force_size": TOTAL_FORCE_SIZE
    }
