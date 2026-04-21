package com.airscope.backend.dto;

import java.util.List;

public class MLBatchRequest {
    private List<MLReadingRequest> readings;

    public MLBatchRequest() {
    }

    public MLBatchRequest(List<MLReadingRequest> readings) {
        this.readings = readings;
    }

    public List<MLReadingRequest> getReadings() {
        return readings;
    }

    public void setReadings(List<MLReadingRequest> readings) {
        this.readings = readings;
    }
}