const STYLES = {
  pending: "bg-line/40 text-ink-700",
  confirmed: "bg-teal-light text-teal",
  assigned: "bg-amber-light text-amber",
  in_transit: "bg-amber-light text-amber",
  delivered: "bg-teal-light text-teal",
  cancelled: "bg-rust-light text-rust",
  failed: "bg-rust-light text-rust",
  available: "bg-teal-light text-teal",
  on_trip: "bg-amber-light text-amber",
  maintenance: "bg-rust-light text-rust",
  out_of_service: "bg-rust-light text-rust",
  off_duty: "bg-line/40 text-ink-700",
  planned: "bg-line/40 text-ink-700",
  dispatched: "bg-amber-light text-amber",
  in_progress: "bg-amber-light text-amber",
  completed: "bg-teal-light text-teal",
};

export default function StatusBadge({ status }) {
  const cls = STYLES[status] || "bg-line/40 text-ink-700";
  const label = status ? status.replace(/_/g, " ") : "unknown";
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${cls}`}>
      {label}
    </span>
  );
}
