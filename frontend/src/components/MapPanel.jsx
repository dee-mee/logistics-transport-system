import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

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

function MapViewUpdater({ center, zoom = 12 }) {
  const map = useMap();

  useEffect(() => {
    if (!center || center.length !== 2) return;
    if (Number.isNaN(center[0]) || Number.isNaN(center[1])) return;
    map.setView(center, zoom);
  }, [center, zoom, map]);

  return null;
}

function MapPanel({ waypoints, selectedOrder, driverLocation }) {
  const shipmentColor = getShipmentColor(selectedOrder?.id);

  const pickupCoords = selectedOrder?.pickup_lat && selectedOrder?.pickup_lng
    ? [parseFloat(selectedOrder.pickup_lat), parseFloat(selectedOrder.pickup_lng)]
    : null;

  const dropoffCoords = selectedOrder?.dropoff_lat && selectedOrder?.dropoff_lng
    ? [parseFloat(selectedOrder.dropoff_lat), parseFloat(selectedOrder.dropoff_lng)]
    : null;

  const routePositions = waypoints
    ? waypoints.map(wp => [wp.lat, wp.lng])
    : [];

  const driverCoords = driverLocation?.lat && driverLocation?.lng
    ? [parseFloat(driverLocation.lat), parseFloat(driverLocation.lng)]
    : null;

  const allPoints = [...routePositions];
  if (pickupCoords) allPoints.push(pickupCoords);
  if (dropoffCoords) allPoints.push(dropoffCoords);
  if (driverCoords) allPoints.push(driverCoords);

  const mapCenter = allPoints.length > 0
    ? allPoints[0]
    : [-1.2921, 36.8219];

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

  const carIcon = L.divIcon({
    html: '<div style="font-size: 24px;">🚗</div>',
    className: 'car-marker',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15]
  });

  return (
    <div className="h-full min-h-[400px] rounded-xl overflow-hidden">
      <MapContainer
        center={mapCenter}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
      >
        <MapViewUpdater center={mapCenter} zoom={12} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {selectedOrder && (
          <>
            {routePositions.length > 1 && (
              <Polyline
                positions={routePositions}
                color={shipmentColor.primary}
                weight={4}
                opacity={0.8}
              />
            )}

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

            {(selectedOrder?.status === 'in_transit' || selectedOrder?.status === 'assigned') && driverCoords && (
              <Marker position={driverCoords} icon={carIcon}>
                <Popup>
                  <div className="text-sm">
                    <div className="font-medium" style={{ color: shipmentColor.primary }}>
                      🚗 Driver Location
                    </div>
                    <div className="text-gray-500">{driverLocation?.address || 'Current location'}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {driverLocation?.vehicle_plate || 'Unknown vehicle'}
                    </div>
                    <div className="text-xs text-gray-400">
                      Updated: {driverLocation?.recorded_at ? new Date(driverLocation.recorded_at).toLocaleTimeString() : 'Unknown'}
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
