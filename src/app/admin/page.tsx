'use client'
import { useState } from 'react'
import { useConfig } from '@/lib/configContext'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const { config } = useConfig()
  const router = useRouter()
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)

  const handleDigit = (d: string) => {
    if (pin.length >= 4) return
    const next = pin + d
    setPin(next)
    setError(false)
    if (next.length === 4) {
      if (next === config.adminPassword) {
        router.push('/admin/dashboard')
      } else {
        setError(true)
        setTimeout(() => setPin(''), 600)
      }
    }
  }

  const handleClear = () => {
    setPin('')
    setError(false)
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
      <h1 className="text-3xl font-bold text-gray-700 mb-2">Espace aidant</h1>
      <p className="text-gray-400 mb-10">Entrez votre code PIN</p>

      {/* PIN display */}
      <div className="flex gap-4 mb-10">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`w-5 h-5 rounded-full transition-all ${
              pin.length > i
                ? error ? 'bg-red-400' : 'bg-indigo-500'
                : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-4 w-72">
        {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d, i) => (
          <button
            key={i}
            onClick={() => d === '⌫' ? handleClear() : d ? handleDigit(d) : null}
            disabled={!d}
            className={`h-16 rounded-2xl text-2xl font-semibold transition-all ${
              d
                ? 'bg-white shadow text-gray-700 hover:bg-indigo-50 active:scale-95'
                : 'invisible'
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {error && <p className="text-red-400 mt-6 text-lg">Code incorrect</p>}

      <button
        onClick={() => router.push('/')}
        className="mt-10 text-gray-400 hover:text-gray-600 text-sm"
      >
        ← Retour
      </button>
    </main>
  )
}
