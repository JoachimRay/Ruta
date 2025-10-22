// ===================================================================
// ROUTE MODAL COMPONENT
// ===================================================================
/**
 * Initial modal that appears when the app loads, asking user to choose
 * how they want to set their starting location: GPS or manual selection
 */

"use client";

/**
 * RouteModal component for location method selection
 * 
 * @param {Object} props - Component props  
 * @param {boolean} props.showModal - Whether to display the modal
 * @param {Function} props.onUseGeolocation - Handler for GPS location choice
 * @param {Function} props.onManualSelection - Handler for manual selection choice
 */
export default function RouteModal({ 
  showModal, 
  onUseGeolocation, 
  onManualSelection 
}) {
  // Don't render anything if modal should be hidden
  if (!showModal) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.6)',
      zIndex: 2000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div style={{
        background: '#fff',
        padding: '24px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        maxWidth: '400px',
        width: '100%',
        textAlign: 'center'
      }}>
        <h2 style={{ 
          marginTop: 0, 
          marginBottom: '16px', 
          color: '#333', 
          fontSize: 'clamp(18px, 5vw, 24px)' 
        }}>
          Set Starting Location
        </h2>
        
        <p style={{ 
          marginBottom: '24px', 
          color: '#666', 
          fontSize: 'clamp(14px, 3.5vw, 16px)' 
        }}>
          How would you like to set your "From" location?
        </p>
        
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          justifyContent: 'center', 
          flexWrap: 'wrap' 
        }}>
          <button
            onClick={onUseGeolocation}
            style={{
              fontSize: 'clamp(13px, 3.5vw, 15px)',
              backgroundColor: '#4CAF50',
              border: 'none',
              padding: '12px 20px',
              borderRadius: '6px',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 600,
              flex: '1 1 auto',
              minWidth: '140px'
            }}
          >
            Use My Location
          </button>
          
          <button
            onClick={onManualSelection}
            style={{
              fontSize: 'clamp(13px, 3.5vw, 15px)',
              backgroundColor: '#2196F3',
              border: 'none',
              padding: '12px 20px',
              borderRadius: '6px',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 600,
              flex: '1 1 auto',
              minWidth: '140px'
            }}
          >
            Choose on Map
          </button>
        </div>
      </div>
    </div>
  );
}