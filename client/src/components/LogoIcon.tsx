export function LogoIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Maletín cuadrado redondeado - contenedor exterior */}
      <rect x="2" y="4" width="20" height="16" rx="3" ry="3" fill="currentColor" opacity="0.1" />
      <rect x="2" y="4" width="20" height="16" rx="3" ry="3" />
      
      {/* Manija del maletín */}
      <path d="M 8 4 Q 8 2 12 2 Q 16 2 16 4" />
      
      {/* Casa - parte inferior (base) */}
      <rect x="8" y="10" width="8" height="7" />
      
      {/* Casa - techo (triángulo) */}
      <path d="M 8 10 L 12 6 L 16 10" />
      
      {/* Casa - puerta */}
      <rect x="11" y="13" width="2" height="4" />
      
      {/* Casa - perilla de puerta */}
      <circle cx="13.2" cy="15" r="0.3" />
    </svg>
  );
}
