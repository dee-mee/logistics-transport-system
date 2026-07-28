const STATUS_CONFIG = {
  // For active orders
  'in_transit': { label: 'In Transit', color: 'blue' },
  'no_connection': { label: 'No Connection', color: 'amber' },
  'idle_timeout': { label: 'Idle Timeout', color: 'gray' },
  'delivered': { label: 'Delivered', color: 'green' },
  'pending': { label: 'Pending', color: 'amber' },
  
  // For transactions
  'ongoing': { label: 'On going', color: 'green' },
  'on_hold': { label: 'On hold', color: 'amber' },
  'completed': { label: 'Completed', color: 'green' },
  'cancelled': { label: 'Cancelled', color: 'red' },
  
  // Fallback
  'unknown': { label: 'Unknown', color: 'gray' },
};

const COLOR_STYLES = {
  blue: 'bg-accent/10 text-accent border-accent/30',
  green: 'bg-status-green/10 text-status-green border-status-green/30',
  amber: 'bg-status-amber/10 text-status-amber border-status-amber/30',
  red: 'bg-status-red/10 text-status-red border-status-red/30',
  gray: 'bg-status-gray/10 text-status-gray border-status-gray/30',
};

function StatusPill({ status, variant = 'default' }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.unknown;
  const colorStyle = COLOR_STYLES[config.color] || COLOR_STYLES.gray;
  
  const baseStyles = 'px-3 py-1 rounded-full text-xs font-medium border';
  const variantStyles = variant === 'outline' 
    ? 'bg-transparent border-current' 
    : colorStyle;
  
  return (
    <span className={`${baseStyles} ${variantStyles}`}>
      {config.label}
    </span>
  );
}

export default StatusPill;