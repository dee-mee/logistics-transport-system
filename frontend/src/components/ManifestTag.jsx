export default function ManifestTag({ children, className = "" }) {
  return (
    <span className={`manifest-tag inline-block px-3 py-1 text-sm font-medium text-ink-800 ${className}`}>
      {children}
    </span>
  );
}
