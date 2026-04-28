package com.airscope.backend.service;

import com.airscope.backend.client.MLClient;
import com.airscope.backend.dto.CommunityReadingRequest;
import com.airscope.backend.dto.MLAnalysisResponse;
import com.airscope.backend.model.AirQualityReading;
import com.airscope.backend.repository.AirQualityReadingRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class CommunityReadingService {

    private final AirQualityReadingRepository repository;
    private final MLClient mlClient;

    public CommunityReadingService(AirQualityReadingRepository repository, MLClient mlClient) {
        this.repository = repository;
        this.mlClient = mlClient;
    }

    public AirQualityReading saveCommunityReading(CommunityReadingRequest request) {
        if (!isInsideSkopje(request.getLatitude(), request.getLongitude())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Community sensor readings must be inside the Skopje area."
            );
        }

        boolean valid = true;
        boolean anomaly = false;
        String validationNote = "OK";

        if (request.getPm25Value() < 0) {
            valid = false;
            anomaly = true;
            validationNote = "NEGATIVE_VALUE";
        } else if (request.getPm25Value() > 500) {
            valid = false;
            anomaly = true;
            validationNote = "UNREALISTIC_VALUE";
        } else {
            anomaly = isCommunityOutlier(request.getPm25Value());

            if (anomaly) {
                valid = false;
                validationNote = "COMMUNITY_OUTLIER";
            }
        }

        String locationName = request.getLocationName();

        if (locationName == null || locationName.isBlank()) {
            locationName = "Community Sensor";
        }

        String submittedBy = request.getSubmittedBy();

        if (submittedBy == null || submittedBy.isBlank()) {
            submittedBy = "Community user";
        }

        AirQualityReading reading = new AirQualityReading(
                null,
                locationName,
                "Skopje",
                request.getLatitude(),
                request.getLongitude(),
                request.getPm25Value(),
                LocalDateTime.now(),
                LocalDateTime.now(),
                valid,
                validationNote,
                "community",
                submittedBy,
                anomaly
        );

        return repository.save(reading);
    }

    private boolean isInsideSkopje(double latitude, double longitude) {
        return latitude >= 41.85
                && latitude <= 42.15
                && longitude >= 21.25
                && longitude <= 21.65;
    }

    private boolean isCommunityOutlier(double newPm25Value) {
        List<AirQualityReading> communityReadings =
                repository.findBySourceTypeAndCityOrderByMeasuredAtDesc("community", "Skopje");

        List<Double> values = new ArrayList<>();

        communityReadings.stream()
                .filter(AirQualityReading::isValid)
                .filter(reading -> reading.getMeasuredAt() != null)
                .filter(reading -> reading.getMeasuredAt().isAfter(LocalDateTime.now().minusDays(7)))
                .map(AirQualityReading::getPm25Value)
                .forEach(values::add);

        values.add(newPm25Value);

        if (values.size() < 4) {
            return false;
        }

        try {
            List<MLAnalysisResponse> mlResults = mlClient.analyzeReadings(values);
            MLAnalysisResponse latestResult = mlResults.get(mlResults.size() - 1);
            return !latestResult.isValid();
        } catch (Exception e) {
            System.out.println(">>> ML service unavailable, using local IQR fallback: " + e.getMessage());
            return isOutlierUsingIqr(values, newPm25Value);
        }
    }

    private boolean isOutlierUsingIqr(List<Double> values, double newPm25Value) {
        List<Double> sortedValues = values.stream()
                .sorted()
                .toList();

        int size = sortedValues.size();

        double q1 = sortedValues.get((int) Math.floor((size - 1) * 0.25));
        double q3 = sortedValues.get((int) Math.floor((size - 1) * 0.75));

        double iqr = q3 - q1;

        double lowerBound = Math.max(0, q1 - 1.5 * iqr);
        double upperBound = q3 + 1.5 * iqr;

        return newPm25Value < lowerBound || newPm25Value > upperBound;
    }
}