import { useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

function HeatmapLayer() {
  const map = useMap();

  useEffect(() => {
    const heatData = [
      // CENTAR (mnogu zagadeno)
      [41.9981, 21.4254, 1.0],
      [41.9990, 21.4260, 0.95],
      [41.9975, 21.4240, 0.9],
      [41.9965, 21.4270, 0.85],
      [41.9988, 21.4235, 0.88],

      // KARPOS
      [42.0018, 21.3918, 0.7],
      [42.0025, 21.3925, 0.68],
      [42.0005, 21.3905, 0.65],
      [42.0030, 21.3935, 0.6],

      // AERODROM (premnogu zagadeno)
      [41.9880, 21.4480, 1.0],
      [41.9875, 21.4490, 0.95],
      [41.9890, 21.4470, 0.92],
      [41.9865, 21.4500, 0.9],
      [41.9885, 21.4465, 0.93],

      // GJORCE PETROV
      [42.0066, 21.3536, 0.6],
      [42.0075, 21.3545, 0.58],
      [42.0055, 21.3525, 0.55],

      // CAIR
      [42.0124, 21.4391, 0.8],
      [42.0130, 21.4400, 0.78],
      [42.0115, 21.4380, 0.75],

      // KERAMIDNICA
      [41.9960, 21.4633, 0.7],
      [41.9970, 21.4645, 0.68],
      [41.9950, 21.4620, 0.65],
    ];

    const heatLayer = L.heatLayer(heatData, {
      radius: 45,
      blur: 35,
      maxZoom: 17,
    }).addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map]);

  return null;
}

function MapPage() {
  return (
    <MapContainer
      center={[41.9981, 21.4254]}
      zoom={12}
      style={{ height: '100vh', width: '100%' }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <HeatmapLayer />
    </MapContainer>
  );
}

export default MapPage;