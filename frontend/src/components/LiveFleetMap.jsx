import { useState, useEffect } from 'react';
import client from '../api/client';

const LiveFleetMap = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  useEffect(() => {
    fetchLiveMapData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchLiveMapData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchLiveMapData = async () => {
    try {
      setLoading(true);
      const response = await client.get('/tracking/location-pings/live_map/');
      setVehicles(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load live map data');
      console.error('Error fetching live map data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'available': 'bg-green-500',
      'in_use': 'bg-blue-500',
      'maintenance': 'bg-yellow-500',
      'out_of_service': 'bg-red-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  const getVehicleIcon = (vehicleType) => {
    const icons = {
      'truck': '🚛',
      'van': '🚐',
      'car': '🚗',
      'motorcycle': '🏍️',
    };
    return icons[vehicleType] || '🚗';
  };

  // World map coordinates (simplified)
  const worldMapRegions = [
    { name: 'North America', lat: 40, lng: -100 },
    { name: 'South America', lat: -15, lng: -60 },
    { name: 'Europe', lat: 50, lng: 10 },
    { name: 'Africa', lat: 0, lng: 20 },
    { name: 'Asia', lat: 35, lng: 100 },
    { name: 'Australia', lat: -25, lng: 135 },
  ];

  const projectLatLonToXY = (lat, lng) => {
    // Simple equirectangular projection
    const x = ((lng + 180) / 360) * 100;
    const y = ((-lat + 90) / 180) * 100;
    return { x, y };
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 h-full">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6 h-full">
        <div className="flex items-center justify-center h-64">
          <div className="text-red-600">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 h-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Live Fleet Map</h3>
        <button
          onClick={fetchLiveMapData}
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          Refresh
        </button>
      </div>

      {/* Map Container */}
      <div className="relative bg-gradient-to-br from-blue-50 to-green-50 rounded-lg h-64 mb-4 overflow-hidden border border-gray-200">
        {/* World Map Background */}
        <div className="absolute inset-0 opacity-30">
          <svg viewBox="0 0 1000 500" className="w-full h-full">
            {/* Simplified world map outline */}
            <path d="M150,150 Q200,100 250,150 T350,150 T450,150 T550,150 T650,150 T750,150 T850,150" 
                  stroke="#3B82F6" strokeWidth="2" fill="none" opacity="0.5"/>
            <path d="M100,200 Q150,150 200,200 T300,200 T400,200 T500,200 T600,200 T700,200 T800,200 T900,200" 
                  stroke="#10B981" strokeWidth="2" fill="none" opacity="0.5"/>
            <path d="M200,250 Q250,200 300,250 T400,250 T500,250 T600,250 T700,250 T800,250" 
                  stroke="#F59E0B" strokeWidth="2" fill="none" opacity="0.5"/>
            {/* Grid lines */}
            <line x1="0" y1="250" x2="1000" y2="250" stroke="#9CA3AF" strokeWidth="0.5" opacity="0.3"/>
            <line x1="500" y1="0" x2="500" y2="500" stroke="#9CA3AF" strokeWidth="0.5" opacity="0.3"/>
          {/* Region labels */}
            {worldMapRegions.map((region, index) => {
              const { x, y } = projectLatLonToXY(region.lat, region.lng);
              return (
                <text key={index} x={x} y={y} fontSize="10" fill="#6B7280" opacity="0.6" textAnchor="middle">
                  {region.name}
                </text>
              );
            })}
          </svg>
        </div>

        {/* Vehicle markers */}
        {vehicles.length > 0 ? vehicles.map((vehicle, index) => {
          // Use actual lat/lng if available, otherwise distribute
          const lat = vehicle.lat || 0;
          const lng = vehicle.lng || 0;
          const { x, y } = projectLatLonToXY(lat, lng);
          
          return (
            <div
              key={vehicle.vehicle_id}
              className="absolute cursor-pointer transform hover:scale-110 transition-transform"
              style={{ left: `${x}%`, top: `${y}%` }}
              onClick={() => setSelectedVehicle(vehicle)}
            >
              <div className={`w-8 h-8 rounded-full ${getStatusColor(vehicle.status)} flex items-center justify-center text-white shadow-lg border-2 border-white`}>
                {getVehicleIcon(vehicle.vehicle_type)}
              </div>
              <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs bg-white px-2 py-1 rounded shadow whitespace-nowrap font-medium">
                {vehicle.plate_number}
              </div>
            </div>
          );
        }) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-2">🗺️</div>
              <div className="text-sm text-gray-600 font-medium">World Map</div>
              <div className="text-xs text-gray-500 mt-1">
                {vehicles.length} vehicles tracked
              </div>
              <div className="text-xs text-blue-600 mt-2">
                Waiting for GPS updates...
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Vehicle List */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {vehicles.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            <div className="text-2xl mb-2">🚗</div>
            No vehicle locations available yet.
            <div className="text-xs mt-1">Drivers will appear on the map when they report their location</div>
          </div>
        ) : vehicles.map((vehicle) => (
          <div
            key={vehicle.vehicle_id}
            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
              selectedVehicle?.vehicle_id === vehicle.vehicle_id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300'
            }`}
            onClick={() => setSelectedVehicle(vehicle)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{getVehicleIcon(vehicle.vehicle_type)}</span>
                <div>
                  <div className="font-medium text-gray-800">{vehicle.plate_number}</div>
                  <div className="text-sm text-gray-600">
                    {vehicle.driver_name || 'Unassigned'}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`inline-block w-3 h-3 rounded-full ${getStatusColor(vehicle.status)}`}></div>
                <div className="text-xs text-gray-500 mt-1">
                  {vehicle.speed_kmh ? `${vehicle.speed_kmh} km/h` : 'Stationary'}
                </div>
              </div>
            </div>
            {vehicle.address && (
              <div className="text-xs text-gray-500 mt-2 truncate">
                📍 {vehicle.address}
              </div>
            )}
            {vehicle.status_update && (
              <div className="text-xs text-blue-600 mt-1">
                Status: {vehicle.status_update}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Selected Vehicle Details */}
      {selectedVehicle && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-gray-800 mb-2">
            {selectedVehicle.plate_number} Details
          </h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-600">Type:</span> {selectedVehicle.vehicle_type}
            </div>
            <div>
              <span className="text-gray-600">Status:</span> {selectedVehicle.status}
            </div>
            <div>
              <span className="text-gray-600">Driver:</span> {selectedVehicle.driver_name || 'N/A'}
            </div>
            <div>
              <span className="text-gray-600">Speed:</span> {selectedVehicle.speed_kmh || '0'} km/h
            </div>
            <div className="col-span-2">
              <span className="text-gray-600">Location:</span> {selectedVehicle.address || 'N/A'}
            </div>
            <div className="col-span-2">
              <span className="text-gray-600">Coordinates:</span> {selectedVehicle.lat?.toFixed(4) || 'N/A'}, {selectedVehicle.lng?.toFixed(4) || 'N/A'}
            </div>
            <div className="col-span-2">
              <span className="text-gray-600">Last Update:</span>{' '}
              {new Date(selectedVehicle.last_update).toLocaleString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveFleetMap;