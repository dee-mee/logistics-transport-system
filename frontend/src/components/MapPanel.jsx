import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with React
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

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
  // Default center if no waypoints
  const center = waypoints && waypoints.length > 0 
    ? [waypoints[0].lat, waypoints[0].lng] 
    : [40.7128, -74.0060]; // Default to NYC
  
  // Convert waypoints to LatLng array for Polyline
  const routePositions = waypoints 
    ? waypoints.map(wp => [wp.lat, wp.lng])
    : [];
  
  return (
    <div className="h-full min-h-[400px] rounded-xl overflow-hidden">
      <MapContainer 
        center={center} 
        zoom={12} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Draw route polyline */}
        {routePositions.length > 1 && (
          <Polyline 
            positions={routePositions} 
            color="#2f5fe3" 
            weight={4}
            opacity={0.8}
          />
        )}
        
        {/* Draw markers for each waypoint */}
        {waypoints && waypoints.map((wp, index) => (
          <Marker 
            key={`${wp.lat}-${wp.lng}-${index}`} 
            position={[wp.lat, wp.lng]}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-medium">Waypoint {index + 1}</div>
                <div className="text-gray-500">{wp.address || 'Unknown location'}</div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export default MapPanel;