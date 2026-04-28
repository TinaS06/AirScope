package com.airscope.backend.controller;

import com.airscope.backend.dto.CommunityReadingRequest;
import com.airscope.backend.model.AirQualityReading;
import com.airscope.backend.repository.AirQualityReadingRepository;
import com.airscope.backend.service.CommunityReadingService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/community-readings")
public class CommunityReadingController {

    private final CommunityReadingService communityReadingService;
    private final AirQualityReadingRepository repository;

    public CommunityReadingController(
            CommunityReadingService communityReadingService,
            AirQualityReadingRepository repository
    ) {
        this.communityReadingService = communityReadingService;
        this.repository = repository;
    }

    @PostMapping
    public AirQualityReading submitCommunityReading(@RequestBody CommunityReadingRequest request) {
        return communityReadingService.saveCommunityReading(request);
    }

    @GetMapping
    public List<AirQualityReading> getCommunityReadings() {
        return repository.findBySourceTypeOrderByMeasuredAtDesc("community");
    }

    @GetMapping("/valid")
    public List<AirQualityReading> getValidCommunityReadings() {
        return repository.findBySourceTypeAndValidTrueOrderByMeasuredAtDesc("community");
    }
}