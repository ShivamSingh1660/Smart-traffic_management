import pandas as pd
import numpy as np
import os
import json
import joblib
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score

def train():
    data_path = os.path.join(os.path.dirname(__file__), 'data', 'synthetic_traffic_data.csv')
    df = pd.read_csv(data_path)
    
    # Sort by timestamp to ensure time-based split
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df = df.sort_values('timestamp')
    
    # Split by time: days 1-4 = train, day 5 = test
    # This simulates predicting the future based on the past, which is more honest
    # for time-series forecasting than a random split (which would leak future information).
    unique_dates = df['timestamp'].dt.date.unique()
    test_date = unique_dates[-1] # The 5th day
    
    train_df = df[df['timestamp'].dt.date < test_date]
    test_df = df[df['timestamp'].dt.date == test_date]
    
    # One-hot encode weather
    df_encoded = pd.get_dummies(df, columns=['weather'], drop_first=False)
    
    # Get feature columns (exclude non-features and target)
    exclude_cols = ['junction_id', 'timestamp', 'risk_score']
    features = [col for col in df_encoded.columns if col not in exclude_cols]
    
    # Re-apply split on encoded data
    train_encoded = df_encoded[df_encoded['timestamp'].dt.date < test_date]
    test_encoded = df_encoded[df_encoded['timestamp'].dt.date == test_date]
    
    X_train = train_encoded[features]
    y_train = train_encoded['risk_score']
    X_test = test_encoded[features]
    y_test = test_encoded['risk_score']
    
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    print(f"Test MAE: {mae:.2f}")
    print(f"Test R²: {r2:.3f}")
    
    importances = model.feature_importances_
    feat_imps = sorted(zip(features, importances), key=lambda x: x[1], reverse=True)
    
    print("\nFeature Importances:")
    for feat, imp in feat_imps:
        print(f"  {feat}: {imp:.4f}")
        
    # Save model and artifacts
    model_dir = os.path.join(os.path.dirname(__file__), 'model')
    os.makedirs(model_dir, exist_ok=True)
    
    joblib.dump(model, os.path.join(model_dir, 'risk_model.joblib'))
    
    with open(os.path.join(model_dir, 'feature_names.json'), 'w') as f:
        json.dump(features, f, indent=2)
        
    feat_imps_dict = {feat: imp for feat, imp in feat_imps}
    with open(os.path.join(model_dir, 'feature_importances.json'), 'w') as f:
        json.dump(feat_imps_dict, f, indent=2)
        
    print(f"\nSaved model and artifacts to {model_dir}")

if __name__ == '__main__':
    train()
