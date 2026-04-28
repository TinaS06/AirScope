package com.airscope.backend.service;

import com.airscope.backend.model.AirQualityReading;
import com.airscope.backend.repository.AirQualityReadingRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.*;

@Service
public class OpenAQService {

    private final AirQualityReadingRepository repository;

    @Value("${openaq.api.key}")
    private String apiKey;

    @Value("${openaq.api.base-url}")
    private String baseUrl;

    private static final List<String> ALLOWED_LOCATIONS = List.of(
            "Karpos",
            "Centar",
            "Rektorat",
            "Gazi Baba",
            "Lisice"
    );

    public OpenAQService(AirQualityReadingRepository repository) {
        this.repository = repository;
    }

    public List<AirQualityReading> fetchAndSaveLatestPm25() {
        RestTemplate restTemplate = new RestTemplate();

        HttpHeaders headers = new HttpHeaders();
        headers.set("X-API-Key", apiKey);
        HttpEntity<String> entity = new HttpEntity<>(headers);

        String locationsUrl = baseUrl + "/locations"
                + "?coordinates=41.9981,21.4254"
                + "&radius=25000"
                + "&parameters_id=2"
                + "&limit=100";

        ResponseEntity<Map<String, Object>> locationsResponse = restTemplate.exchange(
                locationsUrl,
                HttpMethod.GET,
                entity,
                new ParameterizedTypeReference<Map<String, Object>>() {}
        );

        List<AirQualityReading> readings = new ArrayList<>();

        if (locationsResponse.getBody() == null || locationsResponse.getBody().get("results") == null) {
            System.out.println(">>> No results from OpenAQ locations endpoint");
            return readings;
        }

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> locations =
                (List<Map<String, Object>>) locationsResponse.getBody().get("results");

        System.out.println(">>> Total locations returned by OpenAQ: " + locations.size());

        Set<String> savedLocationKeys = new HashSet<>();

        for (Map<String, Object> location : locations) {
            String locationName = valueAsString(location.get("name"));
            System.out.println(">>> OpenAQ location name: " + locationName);

            if (locationName == null) continue;

            String matchedLocation = matchAllowedLocation(locationName);
            if (matchedLocation == null) continue;

            if (savedLocationKeys.contains(matchedLocation.toLowerCase())) continue;

            Integer locationId = valueAsInteger(location.get("id"));
            if (locationId == null) continue;

            Double latitude = null;
            Double longitude = null;

            Map<String, Object> coordinates = getMap(location.get("coordinates"));
            if (coordinates != null) {
                latitude = valueAsDouble(coordinates.get("latitude"));
                longitude = valueAsDouble(coordinates.get("longitude"));
            }

            if (latitude == null || longitude == null) continue;

            Integer pm25SensorId = null;
            List<Map<String, Object>> sensors = getListOfMaps(location.get("sensors"));

            if (sensors != null) {
                for (Map<String, Object> sensor : sensors) {
                    Map<String, Object> parameter = getMap(sensor.get("parameter"));
                    if (parameter == null) continue;

                    String paramName = valueAsString(parameter.get("name"));

                    if ("pm25".equalsIgnoreCase(paramName)) {
                        pm25SensorId = valueAsInteger(sensor.get("id"));
                        break;
                    }
                }
            }

            if (pm25SensorId == null) {
                System.out.println(">>> No PM2.5 sensor found for location: " + locationName);
                continue;
            }

            String latestUrl = baseUrl + "/locations/" + locationId + "/latest";

            try {
                ResponseEntity<Map<String, Object>> latestResponse = restTemplate.exchange(
                        latestUrl,
                        HttpMethod.GET,
                        entity,
                        new ParameterizedTypeReference<Map<String, Object>>() {}
                );

                if (latestResponse.getBody() == null || latestResponse.getBody().get("results") == null) {
                    System.out.println(">>> No latest data for location: " + locationName);
                    continue;
                }

                @SuppressWarnings("unchecked")
                List<Map<String, Object>> latestResults =
                        (List<Map<String, Object>>) latestResponse.getBody().get("results");

                for (Map<String, Object> reading : latestResults) {
                    Integer sensorId = valueAsInteger(reading.get("sensorsId"));
                    if (!pm25SensorId.equals(sensorId)) continue;

                    Double pm25Value = valueAsDouble(reading.get("value"));
                    if (pm25Value == null) continue;

                    LocalDateTime measuredAt = LocalDateTime.now();
                    Object datetimeObj = reading.get("datetime");

                    if (datetimeObj instanceof Map<?, ?> dtMap) {
                        Object utc = dtMap.get("utc");

                        if (utc != null) {
                            try {
                                measuredAt = OffsetDateTime.parse(String.valueOf(utc)).toLocalDateTime();
                            } catch (Exception ignored) {
                            }
                        }
                    }

                    boolean valid = true;
                    String validationNote = "OK";

                    if (pm25Value < 0) {
                        valid = false;
                        validationNote = "NEGATIVE_VALUE";
                    }

                    if (measuredAt.isBefore(LocalDateTime.now().minusHours(24))) {
                        valid = false;
                        validationNote = validationNote.equals("OK")
                                ? "STALE_DATA"
                                : validationNote + ", STALE_DATA";
                    }

                    AirQualityReading airQualityReading = new AirQualityReading(
                            null,
                            matchedLocation,
                            "Skopje",
                            latitude,
                            longitude,
                            pm25Value,
                            measuredAt,
                            LocalDateTime.now(),
                            valid,
                            validationNote,
                            "official",
                            "OpenAQ",
                            false
                    );

                    readings.add(airQualityReading);
                    savedLocationKeys.add(matchedLocation.toLowerCase());
                    break;
                }

            } catch (Exception e) {
                System.out.println(">>> Error fetching latest for location " + locationName + ": " + e.getMessage());
            }
        }

        List<AirQualityReading> savedReadings = repository.saveAll(readings);

        System.out.println(">>> Total OpenAQ readings saved: " + savedReadings.size());
        return savedReadings;
    }

    private String matchAllowedLocation(String apiLocationName) {
    if (apiLocationName == null) return null;

    String normalizedApiName = normalizeLocationName(apiLocationName);

    for (String allowed : ALLOWED_LOCATIONS) {
        String normalizedAllowed = normalizeLocationName(allowed);

        if (normalizedApiName.contains(normalizedAllowed)) {
            return allowed;
        }
    }

    return null;
}

private String normalizeLocationName(String name) {
    return name
            .toLowerCase()
            .replace("š", "s")
            .replace("č", "c")
            .replace("ž", "z")
            .replace("ć", "c")
            .replace("đ", "d");
}

    private String valueAsString(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private Double valueAsDouble(Object value) {
        if (value == null) return null;
        if (value instanceof Number number) return number.doubleValue();

        try {
            return Double.parseDouble(String.valueOf(value));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private Integer valueAsInteger(Object value) {
        if (value == null) return null;
        if (value instanceof Number number) return number.intValue();

        try {
            return Integer.parseInt(String.valueOf(value));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> getMap(Object value) {
        if (value instanceof Map<?, ?> map) return (Map<String, Object>) map;
        return null;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> getListOfMaps(Object value) {
        if (value instanceof List<?> list) {
            List<Map<String, Object>> result = new ArrayList<>();

            for (Object item : list) {
                if (item instanceof Map<?, ?> map) {
                    result.add((Map<String, Object>) map);
                }
            }

            return result;
        }

        return null;
    }
}