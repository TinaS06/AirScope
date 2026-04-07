package com.airscope.backend.repository;

import com.airscope.backend.model.AirQualityReading;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AirQualityReadingRepository extends JpaRepository<AirQualityReading, Long> {
    List<AirQualityReading> findByValidTrue();
}