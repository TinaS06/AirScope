function AddSensorButton({ setAddSensorMode, setSelectedCommunityLocation }) {
  const handleClick = () => {
    setSelectedCommunityLocation(null);
    setAddSensorMode(true);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title="Add community sensor"
      style={{
        position: 'absolute',
        bottom: '32px',
        right: '32px',
        zIndex: 9999,
        pointerEvents: 'auto',
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        border: 'none',
        background: '#1d4ed8',
        color: 'white',
        fontSize: '28px',
        fontWeight: 700,
        cursor: 'pointer',
        boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s ease',
      }}
    >
      +
    </button>
  );
}

export default AddSensorButton;