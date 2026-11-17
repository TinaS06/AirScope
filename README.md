# AirScope
AirScope is a smart air quality monitoring and analytics system developed as a Computer Science capstone project. The application focuses on monitoring PM2.5 pollution in Skopje by integrating official air quality measurements and user-submitted community sensor readings. 
The system provides an interactive map with air quality markers and a heatmap to visualize pollution levels across different locations. It also incorporates data validation, machine learning-based outlier detection, and short-term PM2.5 forecasting to support more reliable monitoring and analysis.
AirScope combines a React frontend, a Spring Boot backend, a PostgreSQL database, and a Python-based machine learning service. Official measurements are retrieved from the OpenAQ API, while community readings can be submitted directly through the application.

## Base URLs
Frontend: http://localhost:5173
Backend API: http://localhost:8080
Machine Learning Service: http://localhost:8001

## REST API Endpoints
AirQualityController (/api/air-quality)
1. GET /api/air-quality – Retrieves all stored air quality readings.
2. GET /api/air-quality/valid – Retrieves air quality readings that have passed validation.
3. GET /api/air-quality/official – Retrieves measurements from official monitoring stations.
4. GET /api/air-quality/community – Retrieves community-submitted sensor readings.
5. POST /api/air-quality/fetch – Triggers the retrieval and processing of the latest measurements from OpenAQ.
6. POST /api/air-quality/test – Creates and stores a sample air quality reading for testing purposes.

CommunityReadingController (/api/community-readings)
1. GET /api/community-readings – Retrieves all community-submitted sensor readings.
2. GET /api/community-readings/valid – Retrieves valid community sensor readings.
3. POST /api/community-readings – Submits a new community sensor reading with location and PM2.5 information.

MLTestController (/api/ml)
1. GET /api/ml/test – Tests the connection to the machine learning service by analyzing sample PM2.5 values using Isolation Forest.
2. GET /api/ml/live-prediction – Retrieves the latest valid PM2.5 reading from PostgreSQL and requests a prediction from the machine learning service.

Machine Learning Service (FastAPI)
1. POST /analyze – Analyzes PM2.5 measurements using Isolation Forest to identify potential outliers.
2. POST /predict – Generates one-hour-ahead PM2.5 forecasts using the trained machine learning model.

## Tech Stack
- React.js and Vite
- Java and Spring Boot
- PostgreSQL
- Python and FastAPI
- Scikit-learn (Isolation Forest)
- XGBoost (PM2.5 Forecasting)
- OpenAQ API v3
- Leaflet.js and Leaflet Heatmap
- Chart.js
- REST APIs

## Key Features
- Interactive map displaying PM2.5 pollution levels across Skopje.
- Heatmap visualization representing pollution intensity.
- Integration of official air quality measurements from OpenAQ.
- Community sensor submissions with custom locations and PM2.5 values.
- Automated data collection from OpenAQ every 15 minutes.
- Validation of incoming measurements, including negative values and outdated readings.
- Machine learning-based outlier detection using Isolation Forest.
- One-hour-ahead PM2.5 forecasting using XGBoost.
- Filtering of official stations, community sensors, outdated readings, and detected outliers.
- Station details displaying measurement information and air quality status.
- Live insights summarizing air quality conditions and data reliability.
- Persistent storage of measurements in PostgreSQL.

## System Architecture
1. Data Sources – OpenAQ provides official PM2.5 measurements from monitoring stations, while users contribute community sensor readings by submitting measurements and geographic locations through the application.
2. Data Ingestion – A Spring Boot scheduler automatically retrieves measurements from OpenAQ every 15 minutes, while REST API endpoints handle community submissions. Incoming data is processed and validated before storage.
3. Data Storage – PostgreSQL stores official and community air quality records, including PM2.5 concentrations, monitoring locations, geographic coordinates, measurement and retrieval timestamps, source information, validation status, and outlier detection results.
4. Machine Learning – A separate Python FastAPI service uses Isolation Forest for outlier detection and an XGBoost regression model for one-hour-ahead PM2.5 forecasting based on historical measurements.
5. Visualization – The React frontend uses Leaflet to display an interactive map with air quality markers and a PM2.5 heatmap. Users can explore station details, filter monitoring locations, view air quality insights, and submit community readings.

Communication between the frontend, Spring Boot backend, and Python machine learning service is handled through REST APIs.
