package com.airscope.backend.dto;

public class CommunityReadingRequest {

    private String locationName;
    private double latitude;
    private double longitude;
    private double pm25Value;
    private String submittedBy;

    public CommunityReadingRequest() {
    }

    public CommunityReadingRequest(String locationName, double latitude, double longitude, double pm25Value, String submittedBy) {
        this.locationName = locationName;
        this.latitude = latitude;
        this.longitude = longitude;
        this.pm25Value = pm25Value;
        this.submittedBy = submittedBy;
    }

    public String getLocationName() {
        return locationName;
    }

    public void setLocationName(String locationName) {
        this.locationName = locationName;
    }

    public double getLatitude() {
        return latitude;
    }

    public void setLatitude(double latitude) {
        this.latitude = latitude;
    }

    public double getLongitude() {
        return longitude;
    }

    public void setLongitude(double longitude) {
        this.longitude = longitude;
    }

    public double getPm25Value() {
        return pm25Value;
    }

    public void setPm25Value(double pm25Value) {
        this.pm25Value = pm25Value;
    }

    public String getSubmittedBy() {
        return submittedBy;
    }

    public void setSubmittedBy(String submittedBy) {
        this.submittedBy = submittedBy;
    }
}