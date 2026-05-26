package com.airscope.backend.client;

import com.airscope.backend.dto.MLAnalysisResponse;
import com.airscope.backend.dto.MLBatchRequest;
import com.airscope.backend.dto.MLReadingRequest;
import com.airscope.backend.dto.MLPredictionRequest;
import com.airscope.backend.dto.MLPredictionResponse;

import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.List;

@Component
public class MLClient {

    private final RestTemplate restTemplate = new RestTemplate();

    private static final String ANALYZE_URL =
            "http://127.0.0.1:8001/analyze";

    private static final String PREDICT_URL =
            "http://127.0.0.1:8001/predict";



    // ANOMALY DETECTION
    public List<MLAnalysisResponse> analyzeReadings(List<Double> pm25Values) {

        List<MLReadingRequest> readings = pm25Values.stream()
                .map(MLReadingRequest::new)
                .toList();

        MLBatchRequest request = new MLBatchRequest(readings);

        ResponseEntity<List<MLAnalysisResponse>> response =
                restTemplate.exchange(
                        ANALYZE_URL,
                        org.springframework.http.HttpMethod.POST,
                        new org.springframework.http.HttpEntity<>(request),
                        new ParameterizedTypeReference<List<MLAnalysisResponse>>() {}
                );

        return response.getBody();
    }



    // PM2.5 FORECASTING
    public MLPredictionResponse predictPM25(double pm25value) {

        MLPredictionRequest request =
                new MLPredictionRequest(pm25value);

        ResponseEntity<MLPredictionResponse> response =
                restTemplate.postForEntity(
                        PREDICT_URL,
                        request,
                        MLPredictionResponse.class
                );

        return response.getBody();
    }
}