from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import numpy as np
from sklearn.ensemble import IsolationForest

app = FastAPI()

class Reading(BaseModel):
    pm25: float

class ReadingBatch(BaseModel):
    readings: List[Reading]

model = IsolationForest(contamination=0.2)

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