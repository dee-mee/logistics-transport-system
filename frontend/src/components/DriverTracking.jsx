import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import client from '../api/client';
import { getShipmentColor } from '../utils/shipmentColors';

// Fix for default marker icons in Leaflet
if (typeof window !== 'undefined') {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

function DriverTracking({ shipment }) {
  const [driverLocation, setDriverLocation] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Get shipment-specific colors
  const shipmentColor = getShipmentColor(shipment?.id);

  useEffect(() => {
    if (!shipment.driver) return;

    // Clear previous location data when shipment changes
    setDriverLocation(null);
    setLocationHistory([]);
    setLoading(true);

    const fetchDriverLocation = async () => {
      try {
        // Fetch tracking events for this shipment
        const eventsRes = await client.get(`/tracking/status-events/?shipment=${shipment.id}`);
        
        console.log('DriverTracking events response for shipment:', shipment.id, eventsRes.data);
        
        if (eventsRes.data && eventsRes.data.results) {
          const events = eventsRes.data.results;
          
          console.log('DriverTracking events:', events);
          console.log('Number of events:', events.length);
          
          // Extract location history from events, sorted by timestamp
          const sortedEvents = events
            .filter(event => event.lat && event.lng)
            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          
          console.log('Sorted events with coordinates:', sortedEvents);
          
          // Remove duplicate coordinates to avoid zigzag
          const uniqueRoutePoints = [];
          const seen = new Set();
          
          sortedEvents.forEach(event => {
            const key = `${event.lat}-${event.lng}`;
            if (!seen.has(key)) {
              seen.add(key);
              uniqueRoutePoints.push([
                parseFloat(event.lat),
                parseFloat(event.lng)
              ]);
            }
          });
          
          console.log('DriverTracking unique sorted routePoints:', uniqueRoutePoints);
          console.log('Number of unique route points:', uniqueRoutePoints.length);
          
          setLocationHistory(uniqueRoutePoints);
          
          // Set current driver location to most recent event
          if (uniqueRoutePoints.length > 0) {
            setDriverLocation({
              lat: uniqueRoutePoints[uniqueRoutePoints.length - 1][0],
              lng: uniqueRoutePoints[uniqueRoutePoints.length - 1][1]
            });
          } else if (shipment.pickup_lat && shipment.pickup_lng) {
            // Fallback to pickup location if no tracking events
            console.log('No tracking events, using pickup location');
            setDriverLocation({
              lat: parseFloat(shipment.pickup_lat),
              lng: parseFloat(shipment.pickup_lng)
            });
            
            // If no tracking events but we have pickup/dropoff, get routed route
            if (shipment.dropoff_lat && shipment.dropoff_lng) {
              const pickup = [parseFloat(shipment.pickup_lat), parseFloat(shipment.pickup_lng)];
              const dropoff = [parseFloat(shipment.dropoff_lat), parseFloat(shipment.dropoff_lng)];
              
              console.log('Getting OSRM route from pickup to dropoff');
              
              // Use OSRM routing service to get road-based route
              try {
                const osrmResponse = await fetch(
                  `https://router.project-osrm.org/route/v1/driving/${pickup[1]},${pickup[0]};${dropoff[1]},${dropoff[0]}?overview=full&geometries=geojson`
                );
                const osrmData = await osrmResponse.json();
                
                console.log('OSRM response:', osrmData);
                
                if (osrmData.routes && osrmData.routes[0]) {
                  const routeCoords = osrmData.routes[0].geometry.coordinates.map(coord => 
                    [coord[1], coord[0]] // OSRM returns [lng, lat], we need [lat, lng]
                  );
                  
                  console.log('DriverTracking OSRM route coordinates:', routeCoords);
                  console.log('Number of route coordinates:', routeCoords.length);
                  setLocationHistory(routeCoords);
                } else {
                  console.log('OSRM returned no routes, using straight line');
                  setLocationHistory([pickup, dropoff]);
                }
              } catch (routingError) {
                console.error('DriverTracking OSRM routing failed:', routingError);
                // Fallback to straight line
                console.log('Using straight line fallback');
                setLocationHistory([pickup, dropoff]);
              }
            }
          }
        } else {
          console.log('No events found in response, checking if shipment has coordinates');
          // Fallback to pickup location if no tracking events
          if (shipment.pickup_lat && shipment.pickup_lng) {
            console.log('Using pickup location as fallback');
            setDriverLocation({
              lat: parseFloat(shipment.pickup_lat),
              lng: parseFloat(shipment.pickup_lng)
            });
            
            // If no tracking events but we have pickup/dropoff, get routed route
            if (shipment.dropoff_lat && shipment.dropoff_lng) {
              const pickup = [parseFloat(shipment.pickup_lat), parseFloat(shipment.pickup_lng)];
              const dropoff = [parseFloat(shipment.dropoff_lat), parseFloat(shipment.dropoff_lng)];
              
              console.log('Getting OSRM route from pickup to dropoff (no events case)');
              
              // Use OSRM routing service to get road-based route
              try {
                const osrmResponse = await fetch(
                  `https://router.project-osrm.org/route/v1/driving/${pickup[1]},${pickup[0]};${dropoff[1]},${dropoff[0]}?overview=full&geometries=geojson`
                );
                const osrmData = await osrmResponse.json();
                
                console.log('OSRM response (no events case):', osrmData);
                
                if (osrmData.routes && osrmData.routes[0]) {
                  const routeCoords = osrmData.routes[0].geometry.coordinates.map(coord => 
                    [coord[1], coord[0]] // OSRM returns [lng, lat], we need [lat, lng]
                  );
                  
                  console.log('DriverTracking OSRM route coordinates (no events):', routeCoords);
                  console.log('Number of route coordinates:', routeCoords.length);
                  setLocationHistory(routeCoords);
                } else {
                  console.log('OSRM returned no routes (no events case), using straight line');
                  setLocationHistory([pickup, dropoff]);
                }
              } catch (routingError) {
                console.error('DriverTracking OSRM routing failed (no events case):', routingError);
                // Fallback to straight line
                console.log('Using straight line fallback (no events case)');
                setLocationHistory([pickup, dropoff]);
              }
            }
          } else {
            console.log('No coordinates available for shipment');
          }
        }
      } catch (error) {
        console.error('Error fetching driver location:', error);
        // Fallback to pickup location if API fails
        if (shipment.pickup_lat && shipment.pickup_lng) {
          setDriverLocation({
            lat: parseFloat(shipment.pickup_lat),
            lng: parseFloat(shipment.pickup_lng)
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDriverLocation();
    
    // Set up polling for real-time updates (every 30 seconds)
    const interval = setInterval(fetchDriverLocation, 30000);
    return () => clearInterval(interval);
  }, [shipment.id]);

  if (loading) {
    return (
      <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-gray-500">Loading driver location...</div>
      </div>
    );
  }

  if (!driverLocation) {
    return (
      <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-gray-500">No driver location available</div>
      </div>
    );
  }

  // Custom driver icon with shipment color
  const driverIcon = new L.Icon({
    iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  // Pickup marker with shipment color
  const pickupIcon = new L.Icon({
    iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  // Dropoff marker with shipment color
  const dropoffIcon = new L.Icon({
    iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">Driver Tracking</h3>
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: shipmentColor.primary }}
          />
          <span className="text-xs text-gray-500">Live updates every 30s</span>
        </div>
      </div>
      
      <div className="h-64 rounded-lg border border-gray-300 overflow-hidden">
        <MapContainer
          center={[driverLocation.lat, driverLocation.lng]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          {/* Driver location */}
          <Marker 
            position={[driverLocation.lat, driverLocation.lng]} 
            icon={driverIcon}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-medium" style={{ color: shipmentColor.primary }}>
                  🚚 Driver Location
                </div>
                <div>{shipment.driver_name}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {shipment.tracking_code}
                </div>
              </div>
            </Popup>
          </Marker>
          
          {/* Route history with shipment color */}
          {locationHistory.length > 0 && (
            <Polyline 
              positions={locationHistory} 
              color={shipmentColor.primary} 
              weight={3}
              opacity={0.7}
            />
          )}
          
          {/* Pickup location */}
          {shipment.pickup_lat && shipment.pickup_lng && (
            <Marker 
              position={[parseFloat(shipment.pickup_lat), parseFloat(shipment.pickup_lng)]}
              icon={pickupIcon}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-medium" style={{ color: shipmentColor.primary }}>
                    🚩 Pickup
                  </div>
                  <div>{shipment.pickup_address}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {shipment.tracking_code}
                  </div>
                </div>
              </Popup>
            </Marker>
          )}
          
          {/* Dropoff location */}
          {shipment.dropoff_lat && shipment.dropoff_lng && (
            <Marker 
              position={[parseFloat(shipment.dropoff_lat), parseFloat(shipment.dropoff_lng)]}
              icon={dropoffIcon}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-medium" style={{ color: shipmentColor.primary }}>
                    🏁 Dropoff
                  </div>
                  <div>{shipment.dropoff_address}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {shipment.tracking_code}
                  </div>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
      
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-gray-500 text-xs">Status</div>
          <div className="font-medium capitalize">{shipment.status.replace(/_/g, ' ')}</div>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-gray-500 text-xs">Driver</div>
          <div className="font-medium">{shipment.driver_name || 'Not assigned'}</div>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-gray-500 text-xs">Vehicle</div>
          <div className="font-medium">{shipment.vehicle_plate || 'Not assigned'}</div>
        </div>
      </div>
    </div>
  );
}

export default DriverTracking;