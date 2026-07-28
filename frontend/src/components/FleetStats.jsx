import { Truck, Users, Wrench, AlertTriangle } from 'lucide-react';

function FleetStats({ stats }) {
  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <div className="bg-white border border-gray-200 p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
          <Truck size={18} />
        </div>
        <div>
          <div className="text-2xl font-semibold text-gray-900">{stats.total_vehicles || 0}</div>
          <div className="text-xs text-gray-500">Total Vehicles</div>
        </div>
      </div>
      
      <div className="bg-white border border-gray-200 p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
          <Users size={18} />
        </div>
        <div>
          <div className="text-2xl font-semibold text-gray-900">{stats.total_drivers || 0}</div>
          <div className="text-xs text-gray-500">Total Drivers</div>
        </div>
      </div>
      
      <div className="bg-white border border-gray-200 p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-yellow-100 text-yellow-600 rounded-lg flex items-center justify-center">
          <Wrench size={18} />
        </div>
        <div>
          <div className="text-2xl font-semibold text-gray-900">{stats.vehicles_due_maintenance || 0}</div>
          <div className="text-xs text-gray-500">Due Maintenance</div>
        </div>
      </div>
      
      <div className="bg-white border border-gray-200 p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-red-100 text-red-600 rounded-lg flex items-center justify-center">
          <AlertTriangle size={18} />
        </div>
        <div>
          <div className="text-2xl font-semibold text-gray-900">{stats.utilization_rate || 0}%</div>
          <div className="text-xs text-gray-500">Utilization Rate</div>
        </div>
      </div>
    </div>
  );
}

export default FleetStats;