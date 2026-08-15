import joblib
import json
import os
import pandas as pd

def predict_example():
    model_dir = os.path.join(os.path.dirname(__file__), 'model')
    model_path = os.path.join(model_dir, 'risk_model.joblib')
    features_path = os.path.join(model_dir, 'feature_names.json')
    importances_path = os.path.join(model_dir, 'feature_importances.json')
    
    model = joblib.load(model_path)
    with open(features_path, 'r') as f:
        feature_names = json.load(f)
        
    with open(importances_path, 'r') as f:
        feature_importances = json.load(f)
        
    # Construct an example row (a high risk scenario)
    example_raw = {
        'day_of_week': 0, # Monday
        'time_of_day': 18, # 6 PM (Rush hour)
        'traffic_volume': 85.0,
        'avg_speed': 15.0, # Slow
        'congestion_level': 90.0,
        'accident_count_recent': 1,
        'violation_count': 5,
        'illegal_parking_count': 8,
        'obstruction_count': 1,
        'weather_clear': 0.0,
        'weather_fog': 0.0,
        'weather_rain': 1.0, # Raining
        'roadwork_flag': 0,
        'event_flag': 0,
        'police_coverage': 0 # Unmanned
    }
    
    # Ensure exact feature order
    row = []
    for feat in feature_names:
        row.append(example_raw.get(feat, 0.0))
        
    X_pred = pd.DataFrame([row], columns=feature_names)
    
    predicted_risk = model.predict(X_pred)[0]
    
    # Simple proxy for explainability: normalized value * importance
    max_vals = {
        'day_of_week': 6, 'time_of_day': 23, 'traffic_volume': 100, 'avg_speed': 80,
        'congestion_level': 100, 'accident_count_recent': 5, 'violation_count': 20,
        'illegal_parking_count': 15, 'obstruction_count': 5, 'weather_clear': 1,
        'weather_fog': 1, 'weather_rain': 1, 'roadwork_flag': 1, 'event_flag': 1,
        'police_coverage': 5
    }
    
    contributions = []
    for feat in feature_names:
        val = example_raw.get(feat, 0.0)
        max_val = max_vals.get(feat, 1.0)
        norm_val = val / max_val if max_val > 0 else 0
        imp = feature_importances.get(feat, 0.0)
        contrib = norm_val * imp
        contributions.append((feat, contrib, val))
        
    contributions.sort(key=lambda x: x[1], reverse=True)
    
    print("=== Example Prediction ===")
    print(f"Predicted Risk Score: {predicted_risk:.1f}")
    print("\nTop 3 Contributing Factors:")
    for feat, contrib, raw_val in contributions[:3]:
        print(f" - {feat}: (Raw value: {raw_val}) -> Impact Score: {contrib:.4f}")
        
if __name__ == '__main__':
    predict_example()
