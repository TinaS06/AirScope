import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap, CircleMarker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

function normalizePm25(pm25) {
  if (pm25 <= 0) return 0.2;
  if (pm25 < 10) return 0.5;
  if (pm25 < 25) return 0.7;
  if (pm25 < 50) return 0.85;
  return 1.0;
}

function expandPoint(lat, lng, intensity) {
  return [
    [lat, lng, intensity],
    [lat + 0.002, lng + 0.002, intensity * 0.95],
    [lat - 0.002, lng - 0.002, intensity * 0.9],
    [lat + 0.003, lng - 0.002, intensity * 0.88],
    [lat - 0.002, lng + 0.003, intensity * 0.85],
  ];
}

function HeatmapLayer({ readings }) {
  const map = useMap();

  useEffect(() => {
    if (!readings || readings.length === 0) return;

    const heatData = readings.flatMap((item) => {
      const intensity = normalizePm25(item.pm25Value);
      return expandPoint(item.latitude, item.longitude, intensity);
    });

    const heatLayer = L.heatLayer(heatData, {
      radius: 80,
      blur: 55,
      maxZoom: 17,
      minOpacity: 0.6,
    }).addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, readings]);

  return null;
}

function MapPage() {
  const [readings, setReadings] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:8080/api/air-quality/valid')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch air quality data: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log('Backend valid data:', data);
        setReadings(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Frontend fetch error:', err);
        setError(String(err));
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ height: '100vh', width: '100%', position: 'relative' }}>
      <div
        style={{
          position: 'absolute',
          top: '10px',
          left: '60px',
          zIndex: 2000,
          background: 'white',
          padding: '10px 12px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          fontSize: '14px',
          maxWidth: '360px',
        }}
      >
        <div><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</div>
        <div><strong>Error:</strong> {error || 'None'}</div>
        <div><strong>Readings count:</strong> {readings.length}</div>
        <div>
          <strong>Locations:</strong>{' '}
          {readings.length > 0
            ? readings.map((r) => r.locationName).join(', ')
            : 'No data yet'}
        </div>
      </div>

      <MapContainer
        center={[41.9981, 21.4254]}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <HeatmapLayer readings={readings} />

        {readings.map((item) => (
          <CircleMarker
            key={item.id}
            center={[item.latitude, item.longitude]}
            radius={12}
            pathOptions={{
              color: 'red',
              fillColor: 'red',
              fillOpacity: 1,
              weight: 2,
            }}
          >
            <Popup>
              <strong>{item.locationName}</strong>
              <br />
              PM2.5: {item.pm25Value}
              <br />
              Measured at: {item.measuredAt}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}

export default MapPage;