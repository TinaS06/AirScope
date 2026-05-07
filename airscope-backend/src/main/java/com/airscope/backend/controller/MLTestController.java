package com.airscope.backend.controller;

import com.airscope.backend.client.MLClient;
import com.airscope.backend.dto.MLAnalysisResponse;
import com.airscope.backend.dto.MLPredictionResponse;
import com.airscope.backend.model.AirQualityReading;
import com.airscope.backend.repository.AirQualityReadingRepository;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class MLTestController {

    private final MLClient mlClient;
    private final AirQualityReadingRepository repository;

    public MLTestController(
            MLClient mlClient,
            AirQualityReadingRepository repository
    ) {
        this.mlClient = mlClient;
        this.repository = repository;
    }



    // -----------------------------
    // TEST ANOMALY DETECTION
    // -----------------------------

    @GetMapping("/api/ml/test")
    public List<MLAnalysisResponse> testMLConnection() {

        return mlClient.analyzeReadings(
                List.of(10.0, 15.0, 200.0)
        );
    }



    // -----------------------------
    // LIVE DB FORECAST PREDICTION
    // -----------------------------

    @GetMapping("/api/ml/live-prediction")
    public MLPredictionResponse getLivePrediction() {

        AirQualityReading latestReading =
                repository
                        .findTopByValidTrueOrderByMeasuredAtDesc()
                        .orElseThrow();

        double latestPM25 = latestReading.getPm25Value();

        return mlClient.predictPM25(latestPM25);
    }
}