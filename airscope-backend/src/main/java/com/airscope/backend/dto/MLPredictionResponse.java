package com.airscope.backend.dto;

public class MLPredictionResponse {

    private double current_pm25;
    private double predicted_pm25_next_hour;

    public MLPredictionResponse() {
    }

    public double getCurrent_pm25() {
        return current_pm25;
    }

    public void setCurrent_pm25(double current_pm25) {
        this.current_pm25 = current_pm25;
    }

    public double getPredicted_pm25_next_hour() {
        return predicted_pm25_next_hour;
    }

    public void setPredicted_pm25_next_hour(double predicted_pm25_next_hour) {
        this.predicted_pm25_next_hour = predicted_pm25_next_hour;
    }
}