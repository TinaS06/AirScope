package com.airscope.backend.repository;

import com.airscope.backend.model.AirQualityReading;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AirQualityReadingRepository extends JpaRepository<AirQualityReading, Long> {

    List<AirQualityReading> findByValidTrue();

    List<AirQualityReading> findByValidTrueOrderByMeasuredAtDesc();

    List<AirQualityReading> findBySourceTypeOrderByMeasuredAtDesc(String sourceType);

    List<AirQualityReading> findBySourceTypeAndValidTrueOrderByMeasuredAtDesc(String sourceType);

    List<AirQualityReading> findBySourceTypeAndCityOrderByMeasuredAtDesc(String sourceType, String city);
}