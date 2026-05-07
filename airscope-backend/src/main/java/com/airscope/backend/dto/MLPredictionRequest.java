package com.airscope.backend.dto;

public class MLPredictionRequest {

    private double pm25value;

    public MLPredictionRequest() {
    }

    public MLPredictionRequest(double pm25value) {
        this.pm25value = pm25value;
    }

    public double getPm25value() {
        return pm25value;
    }

    public void setPm25value(double pm25value) {
        this.pm25value = pm25value;
    }
}