import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import StatusPill from './StatusPill';
import { getShipmentColor } from '../utils/shipmentColors';

function ActiveOrderCard({ order, isSelected, onSelect }) {
  const shipmentColor = getShipmentColor(order?.id);
  
  return (
    <div
      onClick={() => onSelect(order.id)}
      className={`bg-white rounded-xl p-5 cursor-pointer transition-all hover:shadow-card-hover ${
        isSelected ? 'ring-2 ring-accent shadow-card' : 'shadow-card'
      }`}
    >
      {/* Header: Tracking Code + Status + Color Indicator */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: shipmentColor.primary }}
          />
          <div>
            <div className="text-xs text-gray-400 mb-1">Tracking Code</div>
            <div className="font-semibold text-navy">{order.tracking_code}</div>
          </div>
        </div>
        <StatusPill status={order.status} variant="outline" />
      </div>
      
      {/* Customer */}
      <div className="text-sm text-gray-600 mb-4">{order.customer_name}</div>
      
      {/* Origin */}
      <div className="flex items-start gap-3 mb-3">
        <div className="mt-1">
          <ArrowUpRight size={16} className="text-status-green" />
        </div>
        <div className="flex-1">
          <div className="text-xs text-gray-400">Pickup</div>
          <div className="text-sm text-navy">{order.pickup_address}</div>
        </div>
      </div>
      
      {/* Destination */}
      <div className="flex items-start gap-3">
        <div className="mt-1">
          <ArrowDownRight size={16} className="text-accent" />
        </div>
        <div className="flex-1">
          <div className="text-xs text-gray-400">Dropoff</div>
          <div className="text-sm text-navy">{order.dropoff_address}</div>
        </div>
      </div>
    </div>
  );
}

export default ActiveOrderCard;