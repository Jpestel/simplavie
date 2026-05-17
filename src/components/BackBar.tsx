'use client'
import { useRouter } from 'next/navigation'

export default function BackBar({ label = 'Accueil' }: { label?: string }) {
  const router = useRouter()
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t-2 border-gray-200 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => router.push('/')}
          className="w-full flex items-center justify-center gap-3 bg-indigo-500 hover:bg-indigo-600 active:scale-95 transition-all rounded-2xl py-5 text-white font-bold text-xl shadow-sm"
        >
          <span className="text-2xl">🏠</span>
          <span>{label}</span>
        </button>
      </div>
    </div>
  )
}
