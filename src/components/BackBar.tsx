'use client'
import { useRouter } from 'next/navigation'

export default function BackBar({ label = 'Accueil' }: { label?: string }) {
  const router = useRouter()
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white/90 backdrop-blur border-t border-gray-100">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => router.push('/')}
          className="w-full flex items-center justify-center gap-3 bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all rounded-2xl py-5 text-gray-700 font-bold text-xl"
        >
          <span className="text-2xl">🏠</span>
          <span>{label}</span>
        </button>
      </div>
    </div>
  )
}
