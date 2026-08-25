interface LogoProps {
  className?: string
}

export function Logo({ className = '' }: LogoProps) {
  return (
    <span
      className={`inline-flex items-center gap-[0.6em] font-mono font-extrabold leading-none tracking-[-0.04em] ${className}`}
    >
      <svg
        className="h-[2.05em] w-[2.05em] shrink-0 overflow-visible"
        viewBox="0 0 38 38"
        role="img"
        aria-label="KiasuCode terminal logo"
      >
        <rect x="3" y="4" width="34" height="34" rx="8" fill="#1264f5" opacity="0.28" />
        <rect x="1" y="1" width="34" height="34" rx="8" fill="#0c0e12" />
        <path
          d="M9 8v20m12-20L9 18l12 10"
          fill="none"
          stroke="white"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="m28 8-5 20"
          fill="none"
          stroke="#68a0ff"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      <span className="logo-wordmark">KiasuCode</span>
    </span>
  )
}
