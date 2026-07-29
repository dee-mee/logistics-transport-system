function TripDetailPanel({ tripDetails }) {
  if (!tripDetails) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <div className="text-center">
          <div className="text-sm">Select a shipment to view details</div>
        </div>
      </div>
    );
  }

  const details = [
    { label: 'Tracking Code', value: tripDetails.tracking_code },
    { label: 'Customer', value: tripDetails.customer_name },
    { label: 'Driver', value: tripDetails.driver_name || 'Not assigned' },
    { label: 'Vehicle', value: tripDetails.vehicle_plate || 'Not assigned' },
    { label: 'Status', value: tripDetails.status },
    { label: 'Weight', value: `${tripDetails.weight_kg} kg` },
    { label: 'Priority', value: tripDetails.priority },
    { label: 'Pickup', value: tripDetails.pickup_address },
  ];

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-navy mb-6">Shipment Details</h3>
      
      <div className="grid grid-cols-2 gap-4">
        {details.map((detail) => (
          <div key={detail.label} className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-1">{detail.label}</div>
            <div className="text-sm font-medium text-navy">{detail.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TripDetailPanel;