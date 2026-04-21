package com.airscope.backend.scheduler;

import com.airscope.backend.service.OpenAQService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class AirQualityScheduler {

    private final OpenAQService openAQService;

    public AirQualityScheduler(OpenAQService openAQService) {
        this.openAQService = openAQService;
    }

    @Scheduled(cron = "0 */15 * * * *")
    public void fetchEvery15Minutes() {
        System.out.println(">>> Scheduled fetch started");
        openAQService.fetchAndSaveLatestPm25();
    }
}