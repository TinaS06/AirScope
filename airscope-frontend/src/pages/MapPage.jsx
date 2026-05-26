import { useCallback, useEffect, useMemo, useState } from 'react';
import AddSensorButton from '../components/AddSensorButton';
import CommunityReadingForm from '../components/CommunityReadingForm';
import {
  MapContainer,
  TileLayer,
  useMap,
  CircleMarker,
  Tooltip,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

const PM25_LEVELS = [
  { max: 12, color: '#00e400', range: '0 – 12', label: 'Good' },
  { max: 35.4, color: '#ffff00', range: '12.1 – 35.4', label: 'Moderate' },
  { max: 55.4, color: '#ff7e00', range: '35.5 – 55.4', label: 'Unhealthy for sensitive groups' },
  { max: 150.4, color: '#ff0000', range: '55.5 – 150.4', label: 'Unhealthy' },
  { max: Infinity, color: '#8f3f97', range: '150.5+', label: 'Very unhealthy' },
];

function getPm25Level(pm25) {
  return PM25_LEVELS.find((level) => pm25 <= level.max) ?? PM25_LEVELS[0];
}

function normalizePm25(pm25) {
  if (!pm25 || pm25 <= 0) return 0.05;
  if (pm25 <= 12) return 0.2;
  if (pm25 <= 35.4) return 0.4;
  if (pm25 <= 55.4) return 0.6;
  if (pm25 <= 150.4) return 0.8;
  return 1;
}

function getHeatGradient() {
  return {
    0.2: '#00e400',
    0.4: '#ffff00',
    0.6: '#ff7e00',
    0.8: '#ff0000',
    1.0: '#8f3f97',
  };
}

function formatSourceLabel(sourceType) {
  return sourceType === 'community' ? 'Community sensor' : 'Official station';
}

function formatDateTime(value) {
  if (!value || value === 'No data') return 'No data';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getPm25Status(pm25) {
  return getPm25Level(pm25).label;
}

function getPm25Color(pm25) {
  return getPm25Level(pm25).color;
}

function isRecentReading(measuredAt) {
  if (!measuredAt) return false;

  const measuredDate = new Date(measuredAt);
  if (Number.isNaN(measuredDate.getTime())) return false;

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return measuredDate > twentyFourHoursAgo;
}

function detectAnomalyBounds(readings) {
  const values = readings
    .filter((item) => isRecentReading(item.measuredAt))
    .map((item) => Number(item.pm25Value))
    .filter((value) => Number.isFinite(value) && value >= 0)
    .sort((a, b) => a - b);

  if (values.length < 6) return null;

  const q1 = values[Math.floor((values.length - 1) * 0.25)];
  const q3 = values[Math.floor((values.length - 1) * 0.75)];
  const iqr = q3 - q1;

  return {
    lower: Math.max(0, q1 - 1.5 * iqr),
    upper: q3 + 1.5 * iqr,
  };
}

function isAnomalyReading(item, anomalyBounds) {
  const pm25 = Number(item.pm25Value);

  if (!Number.isFinite(pm25) || pm25 < 0) return false;

  if (
    item.anomaly === true ||
    item.isAnomaly === true ||
    String(item.validationNote ?? item.status ?? '')
      .toLowerCase()
      .includes('outlier')
  ) {
    return true;
  }

  if (!anomalyBounds || !isRecentReading(item.measuredAt)) return false;

  return pm25 < anomalyBounds.lower || pm25 > anomalyBounds.upper;
}

function getMarkerStyle(item, isMostPolluted, zoom, isAnomaly) {
  const isCommunity = item.sourceType === 'community';
  const isOutdated = !isRecentReading(item.measuredAt);
  const pm25 = Number(item.pm25Value) || 0;
  const pm25Color = getPm25Color(pm25);

  const baseRadius = 11;

  let radius = isCommunity
    ? baseRadius * 0.75
    : baseRadius;

  if (zoom <= 9) radius *= 0.65;
  else if (zoom <= 11) radius *= 0.82;
  else if (zoom >= 14) radius *= 1.15;

const fillColor = isOutdated
  ? '#475569'
  : isAnomaly
    ? '#fee2e2'
    : pm25Color;

  const borderColor = isAnomaly
    ? '#7f1d1d'
    : isCommunity
      ? '#1e3a8a'
      : '#ffffff';

  return {
    radius,
    glowRadius: radius + (isCommunity ? 7 : 14),
    glowOptions: {
      color: pm25Color,
      fillColor: pm25Color,
      fillOpacity: isOutdated ? 0.08 : Math.min(0.24, 0.08 + pm25 / 220),
      opacity: isOutdated ? 0.1 : 0.28,
      weight: 0,
      interactive: false,
    },
    pathOptions: {
      color: borderColor,
      fillColor,
      fillOpacity: isOutdated ? 0.48 : 0.80,
      opacity: isOutdated ? 0.7 : 1,
      weight: isMostPolluted ? 4 : 2.5,
      dashArray: isAnomaly ? '4 3' : isCommunity ? '4 4' : null,
    },
  };
}

function HeatmapLayer({ readings, anomalyBounds }) {
  const map = useMap();

  useEffect(() => {
    if (!readings || readings.length === 0) return undefined;

    let heatLayer;

    const updateHeatmap = () => {
      const zoom = map.getZoom();

      let radius = 24;
      let blur = 20;

      if (zoom >= 13) {
        radius = 32;
        blur = 22;
      }

      if (zoom >= 14) {
        radius = 40;
        blur = 28;
      }

      if (zoom >= 15) {
        radius = 48;
        blur = 34;
      }

      const heatData = readings
        .filter((item) => isRecentReading(item.measuredAt))
        .filter((item) => !isAnomalyReading(item, anomalyBounds))
        .map((item) => [
          item.latitude,
          item.longitude,
          normalizePm25(item.pm25Value),
        ]);

      if (heatLayer) {
        map.removeLayer(heatLayer);
      }

      if (heatData.length === 0) return;

      heatLayer = L.heatLayer(heatData, {
        radius,
        blur,
        maxZoom: 17,
        minOpacity: 0.28,
        gradient: getHeatGradient(),
      }).addTo(map);
    };

    updateHeatmap();
    map.on('zoomend', updateHeatmap);

    return () => {
      map.off('zoomend', updateHeatmap);
      if (heatLayer) {
        map.removeLayer(heatLayer);
      }
    };
  }, [map, readings, anomalyBounds]);

  return null;
}

function CommunitySensorClickHandler({
  addSensorMode,
  setSelectedCommunityLocation,
  setSelectedStation,
}) {
  useMapEvents({
    click(event) {
      if (!addSensorMode) return;

      setSelectedStation(null);

      setSelectedCommunityLocation({
        lat: event.latlng.lat,
        lng: event.latlng.lng,
      });
    },
  });

  return null;
}

function ZoomAwareStationCircles({ readings, setSelectedStation, mostPolluted, anomalyBounds }) {
  const [zoom, setZoom] = useState(12);

  useMapEvents({
    zoomend(event) {
      setZoom(event.target.getZoom());
    },
  });

  return (
    <>
      {readings.map((item) => {
        const isOutdated = !isRecentReading(item.measuredAt);
        const isAnomaly = isAnomalyReading(item, anomalyBounds);
        const isMostPolluted =
          !isOutdated && !isAnomaly && mostPolluted && item.id === mostPolluted.id;

        const markerStyle = getMarkerStyle(item, isMostPolluted, zoom, isAnomaly);

        return (
          <div key={item.id ?? `${item.locationName}-${item.latitude}-${item.longitude}`}>
            <CircleMarker
              center={[item.latitude, item.longitude]}
              radius={markerStyle.glowRadius}
              pathOptions={markerStyle.glowOptions}
            />

            <CircleMarker
              center={[item.latitude, item.longitude]}
              radius={markerStyle.radius}
              pathOptions={markerStyle.pathOptions}
              eventHandlers={{
                click: () => setSelectedStation(item),
              }}
            >
              <Tooltip direction="top" offset={[0, -6]} opacity={1}>
                <div>
                  <strong>{item.locationName}</strong>
                  <br />
                  PM2.5: {item.pm25Value} µg/m³
                  <br />
                  Air quality: {getPm25Status(item.pm25Value)}
                  <br />
                  Measured at: {formatDateTime(item.measuredAt)}
                  <br />
                  Source: {formatSourceLabel(item.sourceType)}

                  {isOutdated && (
                    <>
                      <br />
                      Status: No recent update
                    </>
                  )}

                  {isAnomaly && (
                    <>
                      <br />
                      Detection: Possible outlier
                    </>
                  )}
                </div>
              </Tooltip>
            </CircleMarker>
          </div>
        );
      })}
    </>
  );
}

function TopBar({ stationCount, averagePm25, mostPolluted, latestTimestamp }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 2000,
        minHeight: '78px',
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(229,231,235,0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px',
        padding: '0 22px',
        boxSizing: 'border-box',
        boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
      }}
    >
      <div
  style={{
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  }}
>
  <img
    src="/favicon.png"
    alt="AirScope logo"
    style={{
      width: '52px',
      height: '52px',
      objectFit: 'contain',
    }}
  />

  <div
    style={{
      fontSize: '32px',
      fontWeight: 760,
      letterSpacing: '-1px',
      color: '#1e3a8a',
    }}
  >
    AirScope
  </div>
</div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '22px',
          color: '#374151',
          fontSize: '14px',
          justifyContent: 'flex-end',
        }}
      >
        <div><strong>Stations:</strong> {stationCount}</div>
        <div><strong>Average PM2.5:</strong> {averagePm25} µg/m³</div>
        <div>
          <strong>Highest PM2.5:</strong>{' '}
          {mostPolluted ? `${mostPolluted.locationName} (${mostPolluted.pm25Value})` : 'No data'}
        </div>
        <div><strong>Latest:</strong> {formatDateTime(latestTimestamp)}</div>
      </div>
    </div>
  );
}

function ToggleRow({ checked, onChange, dotStyle, label, offColor = '#64748b' }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '14px',
        marginBottom: '16px',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={dotStyle} />
        {label}
      </span>

      <button
        type="button"
        onClick={onChange}
        aria-pressed={checked}
        style={{
          width: '50px',
          height: '28px',
          borderRadius: '999px',
          border: 'none',
          background: checked ? '#1e40af' : offColor,
          padding: '4px',
          cursor: 'pointer',
          transition: '0.2s ease',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            display: 'block',
            width: '20px',
            height: '20px',
            borderRadius: '999px',
            background: '#ffffff',
            transform: checked ? 'translateX(22px)' : 'translateX(0)',
            transition: '0.2s ease',
            boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
          }}
        />
      </button>
    </div>
  );
}

function FilterPanel({
  showOfficial,
  setShowOfficial,
  showCommunity,
  setShowCommunity,
  showNoRecentUpdates,
  setShowNoRecentUpdates,
  showAnomalies,
  setShowAnomalies,
}) {
  const filterDotBase = {
    borderRadius: '50%',
    display: 'inline-block',
    width: '15px',
    height: '15px',
  };

  const officialDotStyle = {
    ...filterDotBase,
    background: '#1d4ed8',
    border: '2px solid #ffffff',
    boxShadow: '0 0 0 1px rgba(0,0,0,0.18)',
  };

  const communityDotStyle = {
    ...filterDotBase,
    background: '#60a5fa',
    border: '2px dashed #1e3a8a',
  };

  const noRecentDotStyle = {
    ...filterDotBase,
    background: '#475569',
    border: '2px solid #334155',
  };

  const anomalyDotStyle = {
    ...filterDotBase,
    background: '#fee2e2',
    border: '3px dashed #7f1d1d',
  };

  const resetFilters = () => {
    setShowOfficial(true);
    setShowCommunity(true);
    setShowNoRecentUpdates(false);
    setShowAnomalies(false);
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: '110px',
        right: '18px',
        zIndex: 2000,
        width: '350px',
        background: 'rgba(255,255,255,0.94)',
        backdropFilter: 'blur(12px)',
        borderRadius: '22px',
        overflow: 'hidden',
        boxShadow: '0 12px 26px rgba(15,23,42,0.16)',
        border: '1px solid rgba(226,232,240,0.9)',
      }}
    >
      <div
        style={{
          background: '#1e40af',
          color: 'white',
          padding: '18px 22px',
          fontSize: '20px',
          fontWeight: 650,
        }}
      >
        Filters
      </div>

      <div style={{ padding: '22px', fontSize: '15px', color: '#1f2937' }}>
        <div style={{ fontWeight: 750, marginBottom: '18px' }}>Choose location type</div>

        <ToggleRow
          checked={showOfficial}
          onChange={() => setShowOfficial((prev) => !prev)}
          dotStyle={officialDotStyle}
          label="Official station locations"
        />

        <ToggleRow
          checked={showCommunity}
          onChange={() => setShowCommunity((prev) => !prev)}
          dotStyle={communityDotStyle}
          label="Community sensor locations"
        />

        <ToggleRow
          checked={showNoRecentUpdates}
          onChange={() => setShowNoRecentUpdates((prev) => !prev)}
          dotStyle={noRecentDotStyle}
          label="Show locations with no recent updates"
          offColor="#64748b"
        />

        <ToggleRow
          checked={showAnomalies}
          onChange={() => setShowAnomalies((prev) => !prev)}
          dotStyle={anomalyDotStyle}
          label="Show detected outliers"
        />

        <button
          type="button"
          onClick={resetFilters}
          style={{
            width: '100%',
            marginTop: '4px',
            border: '1px solid #cbd5e1',
            background: '#f8fafc',
            color: '#1e3a8a',
            borderRadius: '12px',
            padding: '10px 12px',
            fontWeight: 750,
            cursor: 'pointer',
          }}
        >
          Reset filters
        </button>
      </div>
    </div>
  );
}

function LegendBox() {
  return (
    <div
      style={{
        position: 'absolute',
        left: '18px',
        bottom: '38px',
        zIndex: 2000,
        width: '270px',
        background: 'rgba(255,255,255,0.94)',
        backdropFilter: 'blur(12px)',
        borderRadius: '18px',
        padding: '18px',
        boxShadow: '0 12px 26px rgba(15,23,42,0.16)',
        border: '1px solid rgba(226,232,240,0.9)',
        color: '#111827',
      }}
    >
      <div style={{ fontSize: '16px', fontWeight: 750, marginBottom: '14px' }}>
        PM2.5 (µg/m³)
      </div>

      {PM25_LEVELS.map((item) => (
        <div
          key={item.range}
          style={{
            display: 'grid',
            gridTemplateColumns: '18px 82px 1fr',
            alignItems: 'center',
            columnGap: '10px',
            marginBottom: '10px',
            fontSize: '13px',
            fontWeight: 560,
          }}
        >
          <span
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: item.color,
              display: 'inline-block',
              boxShadow: `0 0 12px ${item.color}`,
            }}
          />
          <span>{item.range}</span>
          <span>{item.label}</span>
        </div>
      ))}

      <div
        style={{
          borderTop: '1px solid #e5e7eb',
          marginTop: '12px',
          paddingTop: '12px',
          fontSize: '12px',
          color: '#374151',
        }}
      >
        Dashed border = community sensor or detected outlier
      </div>
    </div>
  );
}

function InsightBox({
  prediction,
  mostPolluted,
  validCount,
  totalCount,
  anomalyCount,
  averagePm25,
}) {
  const reliability = totalCount === 0 ? 0 : Math.round((validCount / totalCount) * 100);

  const status = getPm25Status(Number(averagePm25));

  const trendText =
    Number(averagePm25) <= 12
      ? 'Air quality is currently good'
      : 'Monitor sensitive areas';

  return (
    <div
      style={{
        position: 'absolute',
        left: '18px',
        top: '100px',
        zIndex: 2000,
        width: '300px',
        background: 'rgba(255,255,255,0.94)',
        backdropFilter: 'blur(12px)',
        borderRadius: '18px',
        padding: '16px 18px',
        boxShadow: '0 12px 26px rgba(15,23,42,0.16)',
        border: '1px solid rgba(226,232,240,0.9)',
        color: '#111827',
      }}
    >
      <div style={{ fontWeight: 800, fontSize: '15px', marginBottom: '10px' }}>
        Live insight
      </div>

      <div style={{ fontSize: '13px', lineHeight: 1.6 }}>
        <div>
          <strong>Worst area:</strong>{' '}
          {mostPolluted ? mostPolluted.locationName : 'No data'}
        </div>

        <div>
          <strong>Current level:</strong>{' '}
          <span
            style={{
              color: getPm25Color(Number(averagePm25)),
              fontWeight: 800,
            }}
          >
            {status}
          </span>
        </div>

        <div>
          <strong>Reliability:</strong> {reliability}% valid recent data
        </div>

        <div>
          <strong>Outliers:</strong> {anomalyCount} detected
        </div>

        {prediction && (
          <div>
            <strong>Next hour forecast:</strong>{' '}
            <span
              style={{
                color: getPm25Color(
                  prediction.predicted_pm25_next_hour
                ),
                fontWeight: 800,
              }}
            >
              {prediction.predicted_pm25_next_hour.toFixed(1)} µg/m³
            </span>
          </div>
        )}

        <div
          style={{
            marginTop: '8px',
            color: '#475569',
          }}
        >
          {trendText}
        </div>
      </div>
    </div>
  );
}

function MiniPm25Chart({ readings, selectedStation }) {
  if (!selectedStation) return null;

  const stationReadings = readings
    .filter(
      (reading) =>
        reading.locationName === selectedStation.locationName &&
        reading.valid
    )
    .sort(
      (a, b) =>
        new Date(a.measuredAt) - new Date(b.measuredAt)
    )
    .slice(-12);

  if (stationReadings.length < 2) return null;

  const width = 280;
  const height = 94;
  const padding = 12;

  const values = stationReadings.map((item) =>
    Number(item.pm25Value)
  );

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = stationReadings.map((item, index) => {
    const x =
      padding +
      (index / (stationReadings.length - 1)) *
        (width - padding * 2);

    const y =
      height -
      padding -
      ((Number(item.pm25Value) - min) / range) *
        (height - padding * 2);

    return {
      x,
      y,
      value: item.pm25Value,
    };
  });

  const path = points
    .map(
      (point, index) =>
        `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    )
    .join(' ');

  return (
    <div style={{ gridColumn: '1 / -1', marginTop: '12px' }}>
      <div
        style={{
          fontWeight: 800,
          marginBottom: '8px',
        }}
      >
        Recent PM2.5 trend
      </div>

      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        style={{
          background: '#f8fafc',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
        }}
      >
        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          stroke="#cbd5e1"
        />

        <line
          x1={padding}
          y1={padding}
          x2={padding}
          y2={height - padding}
          stroke="#cbd5e1"
        />

        <path
          d={path}
          fill="none"
          stroke={getPm25Color(selectedStation.pm25Value)}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((point, index) => (
          <circle
            key={`${point.x}-${index}`}
            cx={point.x}
            cy={point.y}
            r="4"
            fill={getPm25Color(point.value)}
            stroke="#ffffff"
            strokeWidth="2"
          />
        ))}
      </svg>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: '#64748b',
          marginTop: '4px',
        }}
      >
        <span>Older</span>
        <span>Latest</span>
      </div>
    </div>
  );
}

function DetailsPanel({ selectedStation, setSelectedStation, mostPolluted, readings, anomalyBounds }) {
  if (!selectedStation) return null;

  const isOutdated = !isRecentReading(selectedStation.measuredAt);
  const isAnomaly = isAnomalyReading(selectedStation, anomalyBounds);
  const isMostPolluted =
    !isOutdated && !isAnomaly && mostPolluted && selectedStation.id === mostPolluted.id;

  return (
    <div
      style={{
        position: 'absolute',
        top: '110px',
        right: '18px',
        zIndex: 2000,
        width: '360px',
        background: 'rgba(255,255,255,0.94)',
        backdropFilter: 'blur(12px)',
        borderRadius: '22px',
        overflow: 'hidden',
        boxShadow: '0 12px 26px rgba(15,23,42,0.16)',
        border: '1px solid rgba(226,232,240,0.9)',
      }}
    >
      <div
        style={{
          background: '#1e40af',
          color: 'white',
          padding: '18px 22px',
          fontSize: '20px',
          fontWeight: 650,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>Station Details</span>

        <button
          onClick={() => setSelectedStation(null)}
          style={{
            border: 'none',
            background: 'transparent',
            color: 'white',
            fontSize: '28px',
            cursor: 'pointer',
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      <div
        style={{
          padding: '20px 22px',
          fontSize: '15px',
          lineHeight: 1.55,
          color: '#1f2937',
          display: 'grid',
          gridTemplateColumns: '120px 1fr',
          rowGap: '8px',
          columnGap: '10px',
        }}
      >
        <strong>Location:</strong>
        <span>{selectedStation.locationName}</span>

        <strong>PM2.5:</strong>
        <span>{selectedStation.pm25Value} µg/m³</span>

        <strong>Air quality:</strong>
        <span style={{ color: getPm25Color(selectedStation.pm25Value), fontWeight: 800 }}>
          {getPm25Status(selectedStation.pm25Value)}
        </span>

        <strong>Measured at:</strong>
        <span>{formatDateTime(selectedStation.measuredAt)}</span>

        <strong>Source:</strong>
        <span>{formatSourceLabel(selectedStation.sourceType)}</span>

        <strong>Latitude:</strong>
        <span>{selectedStation.latitude}</span>

        <strong>Longitude:</strong>
        <span>{selectedStation.longitude}</span>

        {isOutdated && (
          <div style={{ gridColumn: '1 / -1', marginTop: '10px', color: '#6b7280', fontWeight: 800 }}>
            No recent update for this location
          </div>
        )}

        {isAnomaly && (
          <div style={{ gridColumn: '1 / -1', marginTop: '10px', color: '#7f1d1d', fontWeight: 800 }}>
            Possible outlier detected. This reading should be reviewed before being trusted.
          </div>
        )}

        {isMostPolluted && (
          <div style={{ gridColumn: '1 / -1', marginTop: '10px', color: '#b91c1c', fontWeight: 800 }}>
            Most polluted area right now
          </div>
        )}

        <MiniPm25Chart readings={readings} selectedStation={selectedStation} />
      </div>
    </div>
  );
}

function MapPage() {
  const [readings, setReadings] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedStation, setSelectedStation] = useState(null);
  const [prediction, setPrediction] = useState(null);
  

  const [showOfficial, setShowOfficial] = useState(true);
  const [showCommunity, setShowCommunity] = useState(true);
  const [showNoRecentUpdates, setShowNoRecentUpdates] = useState(false);
  const [showAnomalies, setShowAnomalies] = useState(false);

  const [addSensorMode, setAddSensorMode] = useState(false);
  const [selectedCommunityLocation, setSelectedCommunityLocation] = useState(null);

  const refreshReadings = useCallback(() => {
    setLoading(true);

    fetch('http://localhost:8080/api/air-quality')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch air quality data: ${response.status}`);
        }

        return response.json();
      })
      .then((data) => {
  const normalizedData = data.map((item, index) => ({
    ...item,
    id: item.id ?? index + 1,
    sourceType: item.sourceType || 'official',
  }));

  setReadings(normalizedData);

  fetch('http://localhost:8080/api/ml/live-prediction')
    .then((response) => response.json())
    .then((predictionData) => {
      setPrediction(predictionData);
    })
    .catch((err) => {
      console.error('Prediction fetch failed:', err);
    });

  setError('');
  setLoading(false);
})
  }, []);

 useEffect(() => {
  const timer = setTimeout(() => {
    refreshReadings();
  }, 0);

  return () => clearTimeout(timer);
}, [refreshReadings]);

  const latestReadingsPerStation = useMemo(() => {
    const latestMap = new Map();

    readings.forEach((item) => {
      const key = `${item.sourceType}-${item.locationName}`;
      const current = latestMap.get(key);

      if (!current) {
        latestMap.set(key, item);
        return;
      }

      const currentDate = new Date(current.measuredAt);
      const itemDate = new Date(item.measuredAt);

      if (itemDate > currentDate) {
        latestMap.set(key, item);
      }
    });

    return Array.from(latestMap.values());
  }, [readings]);

  const anomalyBounds = useMemo(
    () => detectAnomalyBounds(latestReadingsPerStation),
    [latestReadingsPerStation]
  );

  const filteredReadings = useMemo(() => {
    return latestReadingsPerStation.filter((item) => {
      const isCommunity = item.sourceType === 'community';
      const hasRecentUpdate = isRecentReading(item.measuredAt);
      const isAnomaly = isAnomalyReading(item, anomalyBounds);

      const matchesSource =
        (showOfficial && !isCommunity) || (showCommunity && isCommunity);

      if (isAnomaly) {
        return matchesSource && showAnomalies;
      }

      const matchesRecency = showNoRecentUpdates ? true : hasRecentUpdate;

      return matchesSource && matchesRecency;
    });
  }, [
    latestReadingsPerStation,
    anomalyBounds,
    showOfficial,
    showCommunity,
    showNoRecentUpdates,
    showAnomalies,
  ]);

  const currentReadings = useMemo(() => {
    return filteredReadings
      .filter((item) => isRecentReading(item.measuredAt))
      .filter((item) => !isAnomalyReading(item, anomalyBounds));
  }, [filteredReadings, anomalyBounds]);

  const mostPolluted = useMemo(() => {
    if (currentReadings.length === 0) return null;

    return currentReadings.reduce((max, item) =>
      Number(item.pm25Value) > Number(max.pm25Value) ? item : max
    );
  }, [currentReadings]);

  const averagePm25 =
    currentReadings.length > 0
      ? (
          currentReadings.reduce((sum, item) => sum + Number(item.pm25Value || 0), 0) /
          currentReadings.length
        ).toFixed(1)
      : '0.0';

  const latestTimestamp =
    currentReadings.length > 0
      ? currentReadings.reduce((latest, item) =>
          new Date(item.measuredAt) > new Date(latest.measuredAt) ? item : latest
        ).measuredAt
      : 'No data';

  const anomalyCount = latestReadingsPerStation.filter((item) =>
    isAnomalyReading(item, anomalyBounds)
  ).length;

  const validRecentCount = latestReadingsPerStation.filter(
    (item) => isRecentReading(item.measuredAt) && !isAnomalyReading(item, anomalyBounds)
  ).length;

  return (
    <div style={{ height: '100vh', width: '100%', position: 'relative', overflow: 'hidden' }}>
      <TopBar
        stationCount={filteredReadings.length}
        averagePm25={averagePm25}
        mostPolluted={mostPolluted}
        latestTimestamp={latestTimestamp}
      />

      <InsightBox
  prediction={prediction}
  mostPolluted={mostPolluted}
  validCount={validRecentCount}
  totalCount={latestReadingsPerStation.length}
  anomalyCount={anomalyCount}
  averagePm25={averagePm25}
/>

      <AddSensorButton
        setAddSensorMode={setAddSensorMode}
        setSelectedCommunityLocation={setSelectedCommunityLocation}
      />

      <CommunityReadingForm
        selectedLocation={selectedCommunityLocation}
        setSelectedLocation={setSelectedCommunityLocation}
        refreshReadings={refreshReadings}
        setAddSensorMode={setAddSensorMode}
      />

      {!selectedStation && !selectedCommunityLocation && (
        <FilterPanel
          showOfficial={showOfficial}
          setShowOfficial={setShowOfficial}
          showCommunity={showCommunity}
          setShowCommunity={setShowCommunity}
          showNoRecentUpdates={showNoRecentUpdates}
          setShowNoRecentUpdates={setShowNoRecentUpdates}
          showAnomalies={showAnomalies}
          setShowAnomalies={setShowAnomalies}
        />
      )}

      <DetailsPanel
        selectedStation={selectedStation}
        setSelectedStation={setSelectedStation}
        mostPolluted={mostPolluted}
        readings={readings}
        anomalyBounds={anomalyBounds}
      />

      <LegendBox />

      {addSensorMode && !selectedCommunityLocation && (
        <div
          style={{
            position: 'absolute',
            bottom: '104px',
            right: '32px',
            zIndex: 3000,
            background: 'rgba(255,255,255,0.96)',
            color: '#1f2937',
            padding: '10px 14px',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: 700,
            boxShadow: '0 8px 20px rgba(15,23,42,0.16)',
          }}
        >
          Add a sensor on the map
        </div>
      )}

      {loading && (
        <div
          style={{
            position: 'absolute',
            top: '150px',
            left: '18px',
            zIndex: 2000,
            background: 'white',
            padding: '10px 14px',
            borderRadius: '12px',
            boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
          }}
        >
          Loading air quality data...
        </div>
      )}

      {error && (
        <div
          style={{
            position: 'absolute',
            top: '150px',
            left: '18px',
            zIndex: 2000,
            background: '#fee2e2',
            color: '#991b1b',
            padding: '10px 14px',
            borderRadius: '12px',
            boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
          }}
        >
          {error}
        </div>
      )}

      <MapContainer
        center={[41.9981, 21.4254]}
        zoom={12}
        style={{ height: '100%', width: '100%', filter: 'saturate(0.86) contrast(0.96)' }}
        zoomControl={true}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <CommunitySensorClickHandler
          addSensorMode={addSensorMode}
          setSelectedCommunityLocation={setSelectedCommunityLocation}
          setSelectedStation={setSelectedStation}
        />

        <HeatmapLayer readings={filteredReadings} anomalyBounds={anomalyBounds} />

        <ZoomAwareStationCircles
          readings={filteredReadings}
          setSelectedStation={setSelectedStation}
          mostPolluted={mostPolluted}
          anomalyBounds={anomalyBounds}
        />
      </MapContainer>
    </div>
  );
}

export default MapPage;