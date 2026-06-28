import { useState } from 'react';

function CommunityReadingForm({
  selectedLocation,
  setSelectedLocation,
  refreshReadings,
  setAddSensorMode,
}) {
  const [pm25Value, setPm25Value] = useState('');
  const [locationName, setLocationName] = useState('');
  const [submittedBy, setSubmittedBy] = useState('');
  const [message, setMessage] = useState('');

  if (!selectedLocation) return null;

  const closeForm = () => {
    setSelectedLocation(null);
    setAddSensorMode(false);
  };

  const submitReading = async (event) => {
    event.preventDefault();
    setMessage('');

    try {
      const response = await fetch('http://localhost:8080/api/community-readings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locationName,
          latitude: selectedLocation.lat,
          longitude: selectedLocation.lng,
          pm25Value: Number(pm25Value),
          submittedBy,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit community reading');
      }

      await refreshReadings();

      setMessage('Community reading submitted successfully.');
      setPm25Value('');
      setLocationName('');
      setSubmittedBy('');

      setTimeout(() => {
        closeForm();
      }, 800);
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: '110px',
        right: '18px',
        zIndex: 2500,
        width: '320px',
        background: 'rgba(255,255,255,0.96)',
        borderRadius: '18px',
        padding: '18px',
        boxShadow: '0 12px 26px rgba(15,23,42,0.18)',
        border: '1px solid #e2e8f0',
      }}
    >
      <div style={{ fontWeight: 850, fontSize: '17px', marginBottom: '12px' }}>
        Add Community Sensor
      </div>

      <div style={{ fontSize: '13px', color: '#475569', marginBottom: '12px' }}>
        Location: {selectedLocation.lat.toFixed(5)}, {selectedLocation.lng.toFixed(5)}
      </div>

      <form onSubmit={submitReading}>
        <input
          value={locationName}
          onChange={(e) => setLocationName(e.target.value)}
          placeholder="Sensor name"
          required
          style={inputStyle}
        />

        <input
          value={submittedBy}
          onChange={(e) => setSubmittedBy(e.target.value)}
          placeholder="Submitted by"
          required
          style={inputStyle}
        />

        <input
          value={pm25Value}
          onChange={(e) => setPm25Value(e.target.value)}
          placeholder="PM2.5 value"
          type="number"
          min="0"
          step="0.1"
          required
          style={inputStyle}
        />

        <button
          type="submit"
          style={{
            width: '100%',
            border: 'none',
            background: '#1d4ed8',
            color: 'white',
            borderRadius: '12px',
            padding: '11px',
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          Submit Reading
        </button>
      </form>

      <button
        type="button"
        onClick={closeForm}
        style={{
          width: '100%',
          marginTop: '8px',
          border: '1px solid #cbd5e1',
          background: '#f8fafc',
          color: '#334155',
          borderRadius: '12px',
          padding: '10px',
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        Cancel
      </button>

      {message && (
        <div style={{ marginTop: '10px', fontSize: '13px', color: '#475569' }}>
          {message}
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  marginBottom: '10px',
  border: '1px solid #cbd5e1',
  borderRadius: '12px',
  padding: '10px 12px',
  fontSize: '14px',
};

export default CommunityReadingForm;