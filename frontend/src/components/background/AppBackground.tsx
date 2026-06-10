/**
 * Warm premium background — complements red primary theme.
 * Fixed layer only; does not affect layout.
 */
export function AppBackground() {
  return (
    <div
      className="app-background pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      <div className="app-background__base absolute inset-0" />

      <div className="app-background__blob app-background__blob--rose-tr absolute -right-24 -top-24 h-[520px] w-[520px] rounded-full" />
      <div className="app-background__blob app-background__blob--red-bl absolute -bottom-32 -left-28 h-[480px] w-[480px] rounded-full" />
      <div className="app-background__blob app-background__blob--beige-br absolute bottom-[18%] right-[8%] h-[320px] w-[320px] rounded-full" />
      <div className="app-background__blob app-background__blob--warm-tl absolute -left-16 top-[28%] h-[280px] w-[280px] rounded-full" />

      <div className="app-background__glow absolute left-1/2 top-[42%] h-[70vh] w-[min(90vw,72rem)] -translate-x-1/2 -translate-y-1/2 rounded-full" />

      <svg
        className="app-background__wave app-background__wave--upper absolute left-0 right-0 top-[12%] h-[38vh] w-full"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fill="url(#wave-rose-upper)"
          d="M0,128L48,138.7C96,149,192,171,288,181.3C384,192,480,192,576,170.7C672,149,768,107,864,101.3C960,96,1056,128,1152,138.7C1248,149,1344,139,1392,133.3L1440,128L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"
        />
        <defs>
          <linearGradient id="wave-rose-upper" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255, 228, 220, 0.28)" />
            <stop offset="100%" stopColor="rgba(255, 245, 240, 0.06)" />
          </linearGradient>
        </defs>
      </svg>

      <svg
        className="app-background__wave app-background__wave--lower absolute bottom-0 left-0 right-0 h-[42vh] w-full"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fill="url(#wave-warm-lower)"
          d="M0,224L60,213.3C120,203,240,181,360,181.3C480,181,600,203,720,213.3C840,224,960,224,1080,208C1200,192,1320,160,1380,144L1440,128L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"
        />
        <defs>
          <linearGradient id="wave-warm-lower" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255, 237, 228, 0.32)" />
            <stop offset="50%" stopColor="rgba(255, 248, 245, 0.18)" />
            <stop offset="100%" stopColor="rgba(250, 248, 246, 0.04)" />
          </linearGradient>
        </defs>
      </svg>

      <div className="app-background__noise absolute inset-0" />
    </div>
  );
}
