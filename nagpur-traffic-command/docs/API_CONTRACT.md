# API Contract (planned — not yet implemented)

## GET /locations
Returns array of all junctions with current risk state.
Response:
```json
[
  {
    "junction_id": "j001",
    "name": "Sitabuldi Junction",
    "lat": 21.1498,
    "lng": 79.0806,
    "risk_score": 92,
    "risk_level": "Critical",
    "police_assigned": 0,
    "unmanned_critical": true
  }
]
```

## GET /locations/{junction_id}
Returns full detail for one junction.
Response:
```json
{
  "junction_id": "j001",
  "name": "Sitabuldi Junction",
  "lat": 21.1498,
  "lng": 79.0806,
  "risk_score": 92,
  "risk_level": "Critical",
  "risk_factors": [
    {"factor": "Heavy congestion", "contribution": 0.31},
    {"factor": "3 recent accidents", "contribution": 0.28}
  ],
  "police_assigned": 0,
  "recommended_police": 3,
  "recent_incidents": [
    {"incident_id": "i010", "type": "accident", "severity": "high", "timestamp": "2026-08-15T09:12:00"}
  ]
}
```

## GET /incidents
Returns list of active incidents.

## POST /incidents
Injects a new incident (for demo purposes).
Request:
```json
{ "junction_id": "j001", "type": "accident", "severity": "high" }
```
Response: the updated location object for that junction.

## GET /deployment/current
Returns current officer-to-location assignments.

## GET /deployment/recommendation?available_officers=10
Returns AI-recommended allocation.
Response:
```json
[
  {"junction_id": "j001", "recommended_officers": 3, "reason": "Critical risk, currently unmanned"}
]
```

## POST /deployment/override
Operator accepts/modifies/rejects a recommendation.
Request:
```json
{ "junction_id": "j001", "action": "modify", "officers": 2 }
```

## GET /deployment/moves?available_officers=10
Returns suggested officer movements to transition from current deployment to the recommended deployment.
Response:
```json
[
  {
    "from_junction_id": "j005",
    "to_junction_id": "j001",
    "count": 2
  }
]
```

## POST /deployment/reset
Resets police_assigned to 0 for ALL locations and recomputes unmanned_critical.
Use this to start a fresh allocation from zero.
Request: No body required.
Response: the full updated list of locations (same shape as GET /locations).
```json
[
  {
    "junction_id": "j001",
    "name": "Sitabuldi Junction",
    "lat": 21.1498,
    "lng": 79.0806,
    "risk_score": 92,
    "risk_level": "Critical",
    "police_assigned": 0,
    "unmanned_critical": true
  }
]
```

## GET /deployment/reserve
Returns the current number of available officers in the reserve pool, and the total force size.
Response:
```json
{
  "reserve_pool": 10,
  "total_force_size": 25
}
```

## POST /deployment/emergency
Dispatches emergency officers to a location, pulling from the reserve pool first, and then from low-risk locations if necessary.
Request:
```json
{ "junction_id": "j001", "officers_needed": 3 }
```
Response:
```json
{
  "junction_id": "j001",
  "requested": 3,
  "fulfilled": 3,
  "sources": [{"from": "reserve", "count": 2}, {"from": "j003", "count": 1}],
  "new_police_assigned": 3
}
```
