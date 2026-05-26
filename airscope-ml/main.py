from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import numpy as np
from sklearn.ensemble import IsolationForest
import joblib

app = FastAPI()



class Reading(BaseModel):
    pm25: float


class ReadingBatch(BaseModel):
    readings: List[Reading]


class PredictionRequest(BaseModel):
    pm25value: float


model = IsolationForest(contamination=0.2)


forecast_model = joblib.load("models/forecast_model.pkl")



# COMMUNITY SENSOR ANALYSIS

@app.post("/analyze")
def analyze(data: ReadingBatch):

    values = np.array([[r.pm25] for r in data.readings])

    model.fit(values)

    predictions = model.predict(values)

    results = []

    for i, pred in enumerate(predictions):

        results.append({
            "pm25": data.readings[i].pm25,
            "valid": True if pred == 1 else False,
            "status": "OK" if pred == 1 else "ANOMALY"
        })

    return results



# PM2.5 FORECASTING

@app.post("/predict")
def predict(data: PredictionRequest):

    prediction = forecast_model.predict([[data.pm25value]])

    return {
        "current_pm25": data.pm25value,
        "predicted_pm25_next_hour": float(prediction[0])
    }