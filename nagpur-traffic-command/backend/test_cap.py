import json
from fastapi.testclient import TestClient
from main import app, get_db
from database import SessionLocal

def test_cap():
    # Use FastAPI TestClient to hit the endpoint directly
    client = TestClient(app)
    
    # We need a valid junction_id
    db = SessionLocal()
    from models import Location
    loc = db.query(Location).first()
    db.close()
    
    if not loc:
        print("No locations found.")
        return
        
    print(f"Testing with location: {loc.name} ({loc.junction_id})")
    
    # Try to modify to 15 officers
    response = client.post(
        "/deployment/override",
        json={
            "junction_id": loc.junction_id,
            "action": "modify",
            "officers": 15
        }
    )
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

if __name__ == "__main__":
    test_cap()
