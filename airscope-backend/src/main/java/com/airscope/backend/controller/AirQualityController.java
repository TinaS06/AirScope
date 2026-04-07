package com.airscope.backend.controller;

import com.airscope.backend.model.AirQualityReading;
import com.airscope.backend.repository.AirQualityReadingRepository;
import com.airscope.backend.service.OpenAQService;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/air-quality")
public class AirQualityController {

    private final AirQualityReadingRepository repository;
    private final OpenAQService openAQService;

    public AirQualityController(AirQualityReadingRepository repository, OpenAQService openAQService) {
        this.repository = repository;
        this.openAQService = openAQService;
    }

    @GetMapping
    public List<AirQualityReading> getAll() {
        return repository.findAll(); // raw data (valid + invalid)
    }

    @GetMapping("/valid")
    public List<AirQualityReading> getValid() {
        return repository.findByValidTrue(); // only clean data
    }

    @PostMapping("/test")
    public AirQualityReading createTest() {
        AirQualityReading reading = new AirQualityReading(
                null,
                "Centar",
                "Skopje",
                41.9981,
                21.4254,
                50.0,
                LocalDateTime.now(),
                true,
                "OK"
        );

        return repository.save(reading);
    }

    @PostMapping("/fetch")
    public List<AirQualityReading> fetchFromOpenAQ() {
        return openAQService.fetchAndSaveLatestPm25();
    }
}