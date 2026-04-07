package com.airscope.backend.controller;

import com.airscope.backend.model.AirQualityReading;
import com.airscope.backend.repository.AirQualityReadingRepository;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/air-quality")
public class AirQualityController {

    private final AirQualityReadingRepository repository;

    public AirQualityController(AirQualityReadingRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<AirQualityReading> getAll() {
        return repository.findAll();
    }

    @PostMapping("/test")
    public AirQualityReading createTest() {
        AirQualityReading reading = new AirQualityReading(
                null,
                "Skopje Center",
                "Skopje",
                41.9981,
                21.4254,
                50.0,
                LocalDateTime.now()
        );

        return repository.save(reading);
    }
}