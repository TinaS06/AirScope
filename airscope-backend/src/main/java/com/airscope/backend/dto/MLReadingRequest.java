package com.airscope.backend.dto;

public class MLReadingRequest {
    private double pm25;

    public MLReadingRequest() {
    }

    public MLReadingRequest(double pm25) {
        this.pm25 = pm25;
    }

    public double getPm25() {
        return pm25;
    }

    public void setPm25(double pm25) {
        this.pm25 = pm25;
    }
}