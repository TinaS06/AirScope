package com.airscope.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AirQualityReading {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String locationName;
    private String city;
    private double latitude;
    private double longitude;
    private double pm25Value;
    private LocalDateTime measuredAt;
    private LocalDateTime fetchedAt;

    private boolean valid;
    private String validationNote;
}