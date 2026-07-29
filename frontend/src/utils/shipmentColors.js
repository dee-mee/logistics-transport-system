// Color palette for different shipments
export const SHIPMENT_COLORS = [
  { primary: '#2f5fe3', secondary: '#1e3a8a', name: 'Blue' },
  { primary: '#e53e3e', secondary: '#9b2c2c', name: 'Red' },
  { primary: '#38a169', secondary: '#276749', name: 'Green' },
  { primary: '#d69e2e', secondary: '#975a16', name: 'Yellow' },
  { primary: '#805ad5', secondary: '#553c9a', name: 'Purple' },
  { primary: '#dd6b20', secondary: '#9c4221', name: 'Orange' },
  { primary: '#319795', secondary: '#285e61', name: 'Teal' },
  { primary: '#d53f8c', secondary: '#97266d', name: 'Pink' },
];

// Get consistent color for a shipment based on its ID
export function getShipmentColor(shipmentId) {
  if (!shipmentId) return SHIPMENT_COLORS[0];
  const hash = shipmentId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colorIndex = hash % SHIPMENT_COLORS.length;
  return SHIPMENT_COLORS[colorIndex];
}