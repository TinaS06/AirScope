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
        return repository.findAll();
    }

    @GetMapping("/valid")
    public List<AirQualityReading> getValid() {
        return repository.findByValidTrue();
    }

    @GetMapping("/official")
    public List<AirQualityReading> getOfficialReadings() {
        return repository.findBySourceTypeOrderByMeasuredAtDesc("official");
    }

    @GetMapping("/community")
    public List<AirQualityReading> getCommunityReadings() {
        return repository.findBySourceTypeOrderByMeasuredAtDesc("community");
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
                LocalDateTime.now(),
                true,
                "OK",
                "official",
                "Test",
                false
        );

        return repository.save(reading);
    }

    @PostMapping("/fetch")
    public List<AirQualityReading> fetchFromOpenAQ() {
        return openAQService.fetchAndSaveLatestPm25();
    }
}