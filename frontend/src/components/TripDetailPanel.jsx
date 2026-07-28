function TripDetailPanel({ tripDetails }) {
  if (!tripDetails) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <div className="text-center">
          <div className="text-sm">Select an order to view trip details</div>
        </div>
      </div>
    );
  }

  const details = [
    { label: 'Driver Name', value: tripDetails.driverName },
    { label: 'Distance', value: tripDetails.distance },
    { label: 'Experience', value: tripDetails.experience },
    { label: 'License', value: tripDetails.license },
    { label: 'ID Number', value: tripDetails.idNumber },
    { label: 'Estimation', value: tripDetails.estimation },
    { label: 'Weight', value: tripDetails.weight },
    { label: 'Charge', value: tripDetails.charge },
  ];

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-navy mb-6">Trip Details</h3>
      
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