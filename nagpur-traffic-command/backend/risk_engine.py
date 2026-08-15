"""
Risk prediction engine — loads the trained ML model once at module import time
and exposes predict_risk() and explain_prediction() for use by the API layer.
"""

import os
import json
import joblib
import numpy as np

# ---------------------------------------------------------------------------
#  Module-level model loading (happens once at import, NOT per request)
# ---------------------------------------------------------------------------

_ARTIFACTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ml_artifacts")

_model = joblib.load(os.path.join(_ARTIFACTS_DIR, "risk_model.joblib"))

with open(os.path.join(_ARTIFACTS_DIR, "feature_names.json"), "r") as f:
    _feature_names = json.load(f)

with open(os.path.join(_ARTIFACTS_DIR, "feature_importances.json"), "r") as f:
    _feature_importances = json.load(f)

# ---------------------------------------------------------------------------
#  Human-readable labels for explainability
# ---------------------------------------------------------------------------

_HUMAN_LABELS = {
    "congestion_level": "Heavy congestion",
    "avg_speed": "Low average speed",
    "traffic_volume": "High traffic volume",
    "accident_count_recent": "Recent accidents",
    "violation_count": "High violation count",
    "illegal_parking_count": "Illegal parking",
    "obstruction_count": "Road obstruction",
    "police_coverage": "Low police coverage",
    "weather_clear": "Clear weather (low risk factor)",
    "weather_rain": "Rainy conditions",
    "weather_fog": "Foggy conditions",
    "roadwork_flag": "Active roadwork",
    "event_flag": "Nearby event/gathering",
    "time_of_day": "Time of day (rush hour)",
    "day_of_week": "Day of week pattern",
}

# Max values for normalisation (same as used in training data generation)
_MAX_VALUES = {
    "day_of_week": 6,
    "time_of_day": 23,
    "traffic_volume": 100,
    "avg_speed": 80,
    "congestion_level": 100,
    "accident_count_recent": 5,
    "violation_count": 20,
    "illegal_parking_count": 15,
    "obstruction_count": 5,
    "roadwork_flag": 1,
    "event_flag": 1,
    "police_coverage": 5,
    "weather_clear": 1,
    "weather_fog": 1,
    "weather_rain": 1,
}


# ---------------------------------------------------------------------------
#  Public API
# ---------------------------------------------------------------------------


def load_model():
    """
    No-op confirmation function. The model is already loaded at module level.
    Call this at app startup to trigger the import and verify loading succeeded.
    Returns True if the model is loaded.
    """
    return _model is not None


def predict_risk(feature_dict: dict) -> int:
    """
    Predict the risk score (0-100) for a location given its current feature values.

    feature_dict must contain all keys that the model expects (see feature_names.json).
    The 'weather' field can be passed as a string ('clear'/'rain'/'fog') and will be
    one-hot encoded automatically, OR the caller can pass the pre-encoded
    weather_clear / weather_rain / weather_fog flags directly.

    Returns: int, risk score clamped to [0, 100].
    """
    # Auto one-hot encode weather if passed as a string
    if "weather" in feature_dict:
        weather = feature_dict["weather"]
        feature_dict["weather_clear"] = 1.0 if weather == "clear" else 0.0
        feature_dict["weather_rain"] = 1.0 if weather == "rain" else 0.0
        feature_dict["weather_fog"] = 1.0 if weather == "fog" else 0.0

    # Build the feature row in the EXACT order the model expects
    row = []
    for feat in _feature_names:
        if feat not in feature_dict:
            raise ValueError(
                f"Missing required feature '{feat}'. "
                f"Required features: {_feature_names}"
            )
        row.append(float(feature_dict[feat]))

    prediction = _model.predict([row])[0]
    return int(np.clip(round(prediction), 0, 100))


def explain_prediction(feature_dict: dict, top_n: int = 5) -> list[dict]:
    """
    Return the top_n contributing factors for a prediction as a list of
    {"factor": human_readable_string, "contribution": float}.

    Uses a simple proxy: contribution = normalised_feature_value * feature_importance.
    For police_coverage, the contribution is inverted (high coverage = low risk).
    This is NOT true SHAP, but provides a genuine per-prediction breakdown.
    """
    # Auto one-hot encode weather if passed as a string
    if "weather" in feature_dict:
        weather = feature_dict["weather"]
        feature_dict["weather_clear"] = 1.0 if weather == "clear" else 0.0
        feature_dict["weather_rain"] = 1.0 if weather == "rain" else 0.0
        feature_dict["weather_fog"] = 1.0 if weather == "fog" else 0.0

    contributions = []
    for feat in _feature_names:
        val = float(feature_dict.get(feat, 0.0))
        max_val = _MAX_VALUES.get(feat, 1.0)
        norm_val = val / max_val if max_val > 0 else 0.0
        importance = _feature_importances.get(feat, 0.0)

        # For police_coverage, invert: HIGH coverage = LOW contribution to risk
        if feat == "police_coverage":
            contrib = (1.0 - norm_val) * importance
        else:
            contrib = norm_val * importance

        # Skip negligible contributions and "clear weather" (not a risk factor)
        if contrib < 0.001 and feat != "police_coverage":
            continue

        label = _HUMAN_LABELS.get(feat, feat)

        # For police_coverage with high values, adjust the label
        if feat == "police_coverage" and norm_val >= 0.4:
            label = "Adequate police coverage"

        contributions.append({"factor": label, "contribution": round(contrib, 4)})

    # Sort descending by contribution
    contributions.sort(key=lambda x: x["contribution"], reverse=True)
    return contributions[:top_n]
