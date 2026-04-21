package com.airscope.backend.controller;

import com.airscope.backend.client.MLClient;
import com.airscope.backend.dto.MLAnalysisResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class MLTestController {

    private final MLClient mlClient;

    public MLTestController(MLClient mlClient) {
        this.mlClient = mlClient;
    }

    @GetMapping("/api/ml/test")
    public List<MLAnalysisResponse> testMLConnection() {
        return mlClient.analyzeReadings(List.of(10.0, 15.0, 200.0));
    }
}