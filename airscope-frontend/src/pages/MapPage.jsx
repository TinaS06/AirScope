import { useEffect, useMemo, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  useMap,
  CircleMarker,
  Tooltip,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

function normalizePm25(pm25, maxPm25) {
  if (!pm25 || pm25 <= 0) return 0.08;

  const normalized = pm25 / Math.max(maxPm25, 35);
  return Math.min(Math.max(normalized, 0.08), 1);
}

function getHeatGradient() {
  return {
    0.15: '#22c55e',
    0.35: '#84cc16',
    0.55: '#facc15',
    0.75: '#f97316',
    1.0: '#dc2626',
  };
}

function HeatmapLayer({ readings }) {
  const map = useMap();

  useEffect(() => {
    if (!readings || readings.length === 0) return;

    let heatLayer;

    const updateHeatmap = () => {
      const zoom = map.getZoom();
      const maxPm25 = Math.max(...readings.map((r) => r.pm25Value || 0), 35);

      let radius = 16;
      let blur = 12;

      if (zoom >= 13) {
        radius = 20;
        blur = 14;
      }

      if (zoom >= 14) {
        radius = 24;
        blur = 16;
      }

      if (zoom >= 15) {
        radius = 28;
        blur = 18;
      }

      const heatData = readings.map((item) => [
        item.latitude,
        item.longitude,
        normalizePm25(item.pm25Value, maxPm25),
      ]);

      if (heatLayer) {
        map.removeLayer(heatLayer);
      }

      heatLayer = L.heatLayer(heatData, {
        radius,
        blur,
        maxZoom: 17,
        minOpacity: 0.45,
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
  }, [map, readings]);

  return null;
}

function StationCircles({ readings, setSelectedStation, mostPolluted }) {
  return (
    <>
      {readings.map((item) => {
        const isCommunity = item.sourceType === 'community';
        const isMostPolluted = mostPolluted && item.id === mostPolluted.id;

        const color = isCommunity ? '#1d4ed8' : '#60a5fa';
        const radius = isCommunity ? 5 : 8;

        return (
          <CircleMarker
            key={item.id ?? `${item.locationName}-${item.latitude}-${item.longitude}`}
            center={[item.latitude, item.longitude]}
            radius={radius}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: 0.9,
              weight: isMostPolluted ? 3 : 2,
            }}
            eventHandlers={{
              click: () => setSelectedStation(item),
            }}
          >
            <Tooltip direction="top" offset={[0, -4]} opacity={1}>
              <div>
                <strong>{item.locationName}</strong>
                <br />
                PM2.5: {item.pm25Value} µg/m³
                <br />
                Measured at: {item.measuredAt}
                <br />
                Source: {isCommunity ? 'Community sensor' : 'Official station'}
              </div>
            </Tooltip>
          </CircleMarker>
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
        height: '78px',
        background: 'rgba(255,255,255,0.96)',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 22px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <div style={{ fontSize: '32px', fontWeight: 800, color: '#2563eb' }}>
          AirScope
        </div>
        <div style={{ fontSize: '16px', color: '#374151', fontWeight: 600 }}>
          Explore the data
        </div>
      </div>

      <div style={{ display: 'flex', gap: '22px', color: '#374151', fontSize: '14px' }}>
        <div><strong>Stations:</strong> {stationCount}</div>
        <div><strong>Average PM2.5:</strong> {averagePm25} µg/m³</div>
        <div>
          <strong>Highest:</strong>{' '}
          {mostPolluted ? `${mostPolluted.locationName} (${mostPolluted.pm25Value})` : 'No data'}
        </div>
        <div><strong>Latest:</strong> {latestTimestamp}</div>
      </div>
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
}) {
  return (
    <div
      style={{
        position: 'absolute',
        top: '105px',
        right: '18px',
        zIndex: 2000,
        width: '340px',
        background: 'rgba(255,255,255,0.97)',
        borderRadius: '22px',
        overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(0,0,0,0.14)',
      }}
    >
      <div
        style={{
          background: '#2563eb',
          color: 'white',
          padding: '18px 22px',
          fontSize: '20px',
          fontWeight: 800,
        }}
      >
        Filters
      </div>

      <div style={{ padding: '22px', fontSize: '16px', color: '#1f2937' }}>
        <div style={{ fontWeight: 700, marginBottom: '18px' }}>Choose location type</div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showOfficial}
            onChange={() => setShowOfficial((prev) => !prev)}
          />
          <span
            style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              background: '#60a5fa',
              display: 'inline-block',
            }}
          />
          Official station locations
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showCommunity}
            onChange={() => setShowCommunity((prev) => !prev)}
          />
          <span
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#1d4ed8',
              display: 'inline-block',
            }}
          />
          Community sensor locations
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showNoRecentUpdates}
            onChange={() => setShowNoRecentUpdates((prev) => !prev)}
          />
          Show locations with no recent updates
        </label>
      </div>
    </div>
  );
}

function DetailsPanel({ selectedStation, setSelectedStation, mostPolluted }) {
  if (!selectedStation) return null;

  const isMostPolluted = mostPolluted && selectedStation.id === mostPolluted.id;
  const isCommunity = selectedStation.sourceType === 'community';

  return (
    <div
      style={{
        position: 'absolute',
        top: '420px',
        right: '18px',
        zIndex: 2000,
        width: '340px',
        background: 'rgba(255,255,255,0.97)',
        borderRadius: '22px',
        overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(0,0,0,0.14)',
      }}
    >
      <div
        style={{
          background: '#1e40af',
          color: 'white',
          padding: '18px 22px',
          fontSize: '20px',
          fontWeight: 800,
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

      <div style={{ padding: '20px 22px', fontSize: '16px', lineHeight: 1.6, color: '#1f2937' }}>
        <div><strong>Location:</strong> {selectedStation.locationName}</div>
        <div><strong>PM2.5:</strong> {selectedStation.pm25Value} µg/m³</div>
        <div><strong>Measured at:</strong> {selectedStation.measuredAt}</div>
        <div><strong>Source:</strong> {isCommunity ? 'Community sensor' : 'Official station'}</div>
        <div><strong>Latitude:</strong> {selectedStation.latitude}</div>
        <div><strong>Longitude:</strong> {selectedStation.longitude}</div>
        {isMostPolluted && (
          <div style={{ marginTop: '10px', color: '#b91c1c', fontWeight: 800 }}>
            Most polluted area right now
          </div>
        )}
      </div>
    </div>
  );
}

function MapPage() {
  const [readings, setReadings] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedStation, setSelectedStation] = useState(null);

  const [showOfficial, setShowOfficial] = useState(true);
  const [showCommunity, setShowCommunity] = useState(true);
  const [showNoRecentUpdates, setShowNoRecentUpdates] = useState(false);

  const now = useMemo(() => new Date(), []);

  useEffect(() => {
    fetch('http://localhost:8080/api/air-quality/valid')
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
        setLoading(false);
      })
      .catch((err) => {
        setError(String(err));
        setLoading(false);
      });
  }, []);

  const mostPolluted = useMemo(() => {
    if (readings.length === 0) return null;
    return readings.reduce((max, item) =>
      item.pm25Value > max.pm25Value ? item : max
    );
  }, [readings]);

  const filteredReadings = useMemo(() => {
    return readings.filter((item) => {
      const isCommunity = item.sourceType === 'community';
      const measuredAt = item.measuredAt ? new Date(item.measuredAt) : null;

      const hasRecentUpdate =
        measuredAt instanceof Date &&
        !Number.isNaN(measuredAt.getTime()) &&
        measuredAt > new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const matchesSource =
        (showOfficial && !isCommunity) || (showCommunity && isCommunity);

      const matchesRecency = showNoRecentUpdates ? true : hasRecentUpdate;

      return matchesSource && matchesRecency;
    });
  }, [readings, showOfficial, showCommunity, showNoRecentUpdates, now]);

  const averagePm25 =
    filteredReadings.length > 0
      ? (
          filteredReadings.reduce((sum, item) => sum + item.pm25Value, 0) /
          filteredReadings.length
        ).toFixed(1)
      : '0.0';

  const latestTimestamp =
    filteredReadings.length > 0
      ? filteredReadings.reduce((latest, item) =>
          new Date(item.measuredAt) > new Date(latest.measuredAt) ? item : latest
        ).measuredAt
      : 'No data';

  return (
    <div style={{ height: '100vh', width: '100%', position: 'relative', overflow: 'hidden' }}>
      <TopBar
        stationCount={filteredReadings.length}
        averagePm25={averagePm25}
        mostPolluted={mostPolluted}
        latestTimestamp={latestTimestamp}
      />

      <FilterPanel
        showOfficial={showOfficial}
        setShowOfficial={setShowOfficial}
        showCommunity={showCommunity}
        setShowCommunity={setShowCommunity}
        showNoRecentUpdates={showNoRecentUpdates}
        setShowNoRecentUpdates={setShowNoRecentUpdates}
      />

      <DetailsPanel
        selectedStation={selectedStation}
        setSelectedStation={setSelectedStation}
        mostPolluted={mostPolluted}
      />

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
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <HeatmapLayer readings={filteredReadings} />

        <StationCircles
          readings={filteredReadings}
          setSelectedStation={setSelectedStation}
          mostPolluted={mostPolluted}
        />
      </MapContainer>
    </div>
  );
}

export default MapPage;