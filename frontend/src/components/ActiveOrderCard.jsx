import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import StatusPill from './StatusPill';

function ActiveOrderCard({ order, isSelected, onSelect }) {
  return (
    <div
      onClick={() => onSelect(order.id)}
      className={`bg-white rounded-xl p-5 cursor-pointer transition-all hover:shadow-card-hover ${
        isSelected ? 'ring-2 ring-accent shadow-card' : 'shadow-card'
      }`}
    >
      {/* Header: ID + Status */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-xs text-gray-400 mb-1">ID</div>
          <div className="font-semibold text-navy">{order.id}</div>
        </div>
        <StatusPill status={order.status} variant="outline" />
      </div>
      
      {/* Category */}
      <div className="text-sm text-gray-600 mb-4">{order.category}</div>
      
      {/* Origin */}
      <div className="flex items-start gap-3 mb-3">
        <div className="mt-1">
          <ArrowUpRight size={16} className="text-status-green" />
        </div>
        <div className="flex-1">
          <div className="text-xs text-gray-400">{order.pickupDate}</div>
          <div className="text-sm text-navy">{order.pickupAddress}</div>
        </div>
      </div>
      
      {/* Destination */}
      <div className="flex items-start gap-3">
        <div className="mt-1">
          <ArrowDownRight size={16} className="text-accent" />
        </div>
        <div className="flex-1">
          <div className="text-xs text-gray-400">{order.dropoffDate}</div>
          <div className="text-sm text-navy">{order.dropoffAddress}</div>
        </div>
      </div>
    </div>
  );
}

export default ActiveOrderCard;