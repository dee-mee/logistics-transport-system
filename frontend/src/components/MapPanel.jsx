import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with React
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { getShipmentColor } from '../utils/shipmentColors';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

function MapPanel({ waypoints, selectedOrder }) {
  // Get shipment-specific colors
  const shipmentColor = getShipmentColor(selectedOrder?.id);
  
  console.log('MapPanel received:', { waypoints, selectedOrder });
  
  // Use selected order coordinates if available
  const pickupCoords = selectedOrder?.pickup_lat && selectedOrder?.pickup_lng 
    ? [parseFloat(selectedOrder.pickup_lat), parseFloat(selectedOrder.pickup_lng)]
    : null;
    
  const dropoffCoords = selectedOrder?.dropoff_lat && selectedOrder?.dropoff_lng
    ? [parseFloat(selectedOrder.dropoff_lat), parseFloat(selectedOrder.dropoff_lng)]
    : null;
  
  // Convert waypoints to LatLng array for Polyline
  const routePositions = waypoints 
    ? waypoints.map(wp => [wp.lat, wp.lng])
    : [];
  
  console.log('MapPanel calculated:', { pickupCoords, dropoffCoords, routePositions });
  
  // Combine all points for better map centering
  const allPoints = [...routePositions];
  if (pickupCoords) allPoints.push(pickupCoords);
  if (dropoffCoords) allPoints.push(dropoffCoords);
  
  // Default center if no waypoints or coordinates - Nairobi coordinates
  const mapCenter = allPoints.length > 0 
    ? allPoints[0] 
    : [-1.2921, 36.8219]; // Default to Nairobi
  
  // Custom icons for pickup/dropoff with shipment colors
  const pickupIcon = new L.Icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
    className: 'pickup-marker'
  });
  
  const dropoffIcon = new L.Icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
    className: 'dropoff-marker'
  });
  
  return (
    <div className="h-full min-h-[400px] rounded-xl overflow-hidden">
      <MapContainer 
        center={mapCenter} 
        zoom={12} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Only show route/markers if there's a selected order */}
        {selectedOrder && (
          <>
            {/* Draw route polyline with shipment-specific color */}
            {routePositions.length > 1 && (
              <Polyline 
                positions={routePositions} 
                color={shipmentColor.primary} 
                weight={4}
                opacity={0.8}
              />
            )}
            
            {/* Draw pickup marker with shipment-specific color */}
            {pickupCoords && (
              <Marker position={pickupCoords} icon={pickupIcon}>
                <Popup>
                  <div className="text-sm">
                    <div className="font-medium" style={{ color: shipmentColor.primary }}>
                      🚩 Pickup Location
                    </div>
                    <div className="text-gray-500">{selectedOrder?.pickup_address || 'Unknown location'}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {selectedOrder?.tracking_code}
                    </div>
                  </div>
                </Popup>
              </Marker>
            )}
            
            {/* Draw dropoff marker with shipment-specific color */}
            {dropoffCoords && (
              <Marker position={dropoffCoords} icon={dropoffIcon}>
                <Popup>
                  <div className="text-sm">
                    <div className="font-medium" style={{ color: shipmentColor.primary }}>
                      🏁 Dropoff Location
                    </div>
                    <div className="text-gray-500">{selectedOrder?.dropoff_address || 'Unknown location'}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {selectedOrder?.tracking_code}
                    </div>
                  </div>
                </Popup>
              </Marker>
            )}
          </>
        )}
      </MapContainer>
    </div>
  );
}

export default MapPanel;