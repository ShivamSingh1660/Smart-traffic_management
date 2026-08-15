import pandas as pd
import numpy as np
import os
from datetime import datetime, timedelta

# Junction IDs from j001 to j018
JUNCTION_IDS = [f"j{i:03d}" for i in range(1, 19)]

def generate_data():
    np.random.seed(42)
    
    start_date = datetime(2026, 8, 10, 0, 0, 0) # 5 days ago
    
    rows = []
    
    for day_offset in range(5):
        for hour in range(24):
            current_time = start_date + timedelta(days=day_offset, hours=hour)
            day_of_week = current_time.weekday() # 0-6
            
            # Rush hours: 8-10am (8,9) and 5-8pm (17,18,19)
            is_rush_hour = hour in [8, 9, 17, 18, 19] and day_of_week < 5
            is_night = hour < 6 or hour > 22
            
            for j_idx, j_id in enumerate(JUNCTION_IDS):
                # Baseline characteristics per junction based on index to add variety
                base_volume = 30 + (j_idx % 5) * 10
                
                # Traffic volume
                traffic_volume = base_volume
                if is_rush_hour:
                    traffic_volume += np.random.randint(30, 50)
                elif is_night:
                    traffic_volume = max(5, traffic_volume - np.random.randint(20, 30))
                else:
                    traffic_volume += np.random.randint(-10, 20)
                traffic_volume = np.clip(traffic_volume, 0, 100)
                
                # Congestion
                congestion_level = traffic_volume * (1 + np.random.uniform(-0.2, 0.2))
                if is_rush_hour:
                    congestion_level += np.random.randint(10, 30)
                congestion_level = np.clip(congestion_level, 0, 100)
                
                # Speed (inversely related)
                avg_speed = 80 - (congestion_level * 0.7) + np.random.normal(0, 5)
                avg_speed = np.clip(avg_speed, 5, 80)
                
                # Incidents / Events
                # 30% of rows get accidents with values spread across 1-5
                if np.random.random() < 0.30:
                    accident_count_recent = np.random.choice([1, 2, 3, 4, 5],
                                                             p=[0.30, 0.30, 0.20, 0.12, 0.08])
                else:
                    accident_count_recent = 0
                
                violation_count = np.random.poisson(traffic_volume / 20.0)
                violation_count = np.clip(violation_count, 0, 20)
                
                illegal_parking_count = np.random.poisson(congestion_level / 15.0)
                illegal_parking_count = np.clip(illegal_parking_count, 0, 15)
                
                obstruction_prob = 0.02
                obstruction_count = np.random.poisson(obstruction_prob)
                obstruction_count = np.clip(obstruction_count, 0, 5)
                
                weather_opts = ['clear', 'rain', 'fog']
                weather_probs = [0.85, 0.10, 0.05]
                weather = np.random.choice(weather_opts, p=weather_probs)
                
                roadwork_flag = 1 if np.random.random() < 0.03 else 0
                event_flag = 1 if np.random.random() < 0.02 else 0
                
                # Police coverage (inversely related to bad conditions for training signal)
                police_coverage = np.random.poisson(1.0)
                if congestion_level > 80:
                    police_coverage = np.random.choice([0, 1, 2, 3], p=[0.4, 0.3, 0.2, 0.1])
                police_coverage = np.clip(police_coverage, 0, 5)
                
                # Risk Score Formula
                # accident_count_recent is the SINGLE HIGHEST weighted factor.
                # We also scale it by /3.0 instead of /5.0 so each unit of accident
                # has a larger marginal effect on the label (0→1 = +16.7 pts).
                norm_cong = congestion_level / 100.0
                norm_acc = accident_count_recent / 3.0  # smaller denominator = stronger per-unit signal
                norm_viol = violation_count / 20.0
                norm_park = illegal_parking_count / 15.0
                norm_obs = obstruction_count / 5.0
                weather_penalty = 1.0 if weather != 'clear' else 0.0
                norm_police = police_coverage / 5.0
                
                raw_risk = (
                    0.15 * norm_cong +
                    0.50 * norm_acc +
                    0.10 * norm_viol +
                    0.05 * norm_park +
                    0.05 * norm_obs +
                    0.05 * weather_penalty +
                    0.05 * roadwork_flag +
                    0.05 * event_flag -
                    0.05 * norm_police
                ) * 100.0
                
                # Add noise — kept small so accident signal isn't drowned out
                raw_risk += np.random.normal(0, 1.5)
                risk_score = np.clip(raw_risk, 0, 100)
                
                rows.append({
                    'junction_id': j_id,
                    'timestamp': current_time,
                    'day_of_week': day_of_week,
                    'time_of_day': hour,
                    'traffic_volume': round(traffic_volume, 1),
                    'avg_speed': round(avg_speed, 1),
                    'congestion_level': round(congestion_level, 1),
                    'accident_count_recent': int(accident_count_recent),
                    'violation_count': int(violation_count),
                    'illegal_parking_count': int(illegal_parking_count),
                    'obstruction_count': int(obstruction_count),
                    'weather': weather,
                    'roadwork_flag': int(roadwork_flag),
                    'event_flag': int(event_flag),
                    'police_coverage': int(police_coverage),
                    'risk_score': round(risk_score, 1)
                })

    df = pd.DataFrame(rows)
    os.makedirs(os.path.join(os.path.dirname(__file__), 'data'), exist_ok=True)
    out_path = os.path.join(os.path.dirname(__file__), 'data', 'synthetic_traffic_data.csv')
    df.to_csv(out_path, index=False)
    
    print(f"Generated {len(df)} rows.")
    print(f"\nRisk Score Distribution:\n{df['risk_score'].describe()}")
    print(f"\naccident_count_recent Distribution:")
    print(df['accident_count_recent'].value_counts().sort_index())
    pct_with_accidents = (df['accident_count_recent'] > 0).mean() * 100
    print(f"\n% of rows with accident >= 1: {pct_with_accidents:.1f}%")

if __name__ == '__main__':
    generate_data()

