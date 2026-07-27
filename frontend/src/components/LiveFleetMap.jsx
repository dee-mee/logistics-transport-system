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
      <div className="relative bg-gray-100 rounded-lg h-64 mb-4 overflow-hidden">
        {vehicles.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            No vehicle locations available
          </div>
        ) : (
          <div className="relative w-full h-full">
            {/* Simplified map visualization */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-2">🗺️</div>
                <div className="text-sm text-gray-600">Interactive Map</div>
                <div className="text-xs text-gray-500 mt-1">
                  {vehicles.length} vehicles tracked
                </div>
              </div>
            </div>

            {/* Vehicle markers */}
            {vehicles.map((vehicle, index) => {
              // Simplified positioning - in real app, use actual map coordinates
              const x = 20 + (index * 15) % 60;
              const y = 20 + (index * 10) % 60;
              
              return (
                <div
                  key={vehicle.vehicle_id}
                  className="absolute cursor-pointer transform hover:scale-110 transition-transform"
                  style={{ left: `${x}%`, top: `${y}%` }}
                  onClick={() => setSelectedVehicle(vehicle)}
                >
                  <div className={`w-8 h-8 rounded-full ${getStatusColor(vehicle.status)} flex items-center justify-center text-white shadow-lg`}>
                    {getVehicleIcon(vehicle.vehicle_type)}
                  </div>
                  <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs bg-white px-1 rounded shadow whitespace-nowrap">
                    {vehicle.plate_number}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Vehicle List */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {vehicles.map((vehicle) => (
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