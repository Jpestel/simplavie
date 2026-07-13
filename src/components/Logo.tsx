import Link from 'next/link'

// Logo SimplaVie : un cœur porté par des mains — symbolise l'aide, le soin et
// l'accompagnement d'une personne au quotidien (inclusif, non limité à un
// handicap précis). Aux couleurs de la marque (indigo → violet).
export default function Logo({ showText = true }: { showText?: boolean }) {
  return (
    <Link href="/" aria-label="Accueil SimplaVie" className="inline-flex items-center gap-2.5 group">
      <svg
        width="40"
        height="40"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform group-active:scale-95"
        role="img"
        aria-hidden="true"
      >
        <rect width="48" height="48" rx="13" fill="url(#sv-logo-grad)" />
        {/* Cœur */}
        <path
          d="M24 28.8C24 28.8 14 22.4 14 17.4C14 14.9 16 13.1 18.3 13.1C20.3 13.1 22.3 14.3 24 16.6C25.7 14.3 27.7 13.1 29.7 13.1C32 13.1 34 14.9 34 17.4C34 22.4 24 28.8 24 28.8Z"
          fill="white"
        />
        {/* Mains qui portent (berceau) */}
        <path
          d="M12.5 31C12.5 39 18 42.8 24 42.8C30 42.8 35.5 39 35.5 31"
          stroke="white"
          strokeOpacity="0.92"
          strokeWidth="3.2"
          strokeLinecap="round"
          fill="none"
        />
        <defs>
          <linearGradient id="sv-logo-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6366f1" />
            <stop offset="1" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>
      {showText && (
        <span className="font-bold text-xl tracking-tight leading-none">
          <span className="text-indigo-600">Simpla</span><span className="text-gray-400">vie</span>
        </span>
      )}
    </Link>
  )
}
