interface EagleMarkProps {
  className?: string;
  title?: string;
}

export function EagleMark({ className, title }: EagleMarkProps) {
  return (
    <svg
      viewBox="0 0 64 40"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      fill="none"
    >
      <defs>
        <linearGradient id="eagle-chrome" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.45" stopColor="#d4d4d8" />
          <stop offset="0.7" stopColor="#71717a" />
          <stop offset="1" stopColor="#27272a" />
        </linearGradient>
      </defs>
      <path d="M2 6 L27 13 L31 21 L21 19 L24 26 L13 22 L15 29 L2 21 Z" fill="url(#eagle-chrome)" />
      <path d="M62 6 L37 13 L33 21 L43 19 L40 26 L51 22 L49 29 L62 21 Z" fill="url(#eagle-chrome)" />
      <path d="M32 3 L39 12 L37 26 L32 37 L27 26 L25 12 Z" fill="url(#eagle-chrome)" />
      <path d="M32 3 L34 9 L32 12 L30 9 Z" fill="#050506" />
      <path d="M28.5 14.5 L31 16 L31 18 L28 16.5 Z M35.5 14.5 L33 16 L33 18 L36 16.5 Z" fill="#b91c1c" />
    </svg>
  );
}
