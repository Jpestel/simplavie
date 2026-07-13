'use client'
import { useRef, useState } from 'react'

export type AddressSuggestion = { label: string; address: string; postcode: string; city: string; context: string }

// Champ adresse avec autocomplétion (Base Adresse Nationale). En sélectionnant
// une suggestion, `onSelect` reçoit l'adresse + code postal + ville.
export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Commencez à taper votre adresse…',
  className = 'w-full border border-gray-200 rounded-xl p-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300',
}: {
  value: string
  onChange: (v: string) => void
  onSelect: (s: AddressSuggestion) => void
  placeholder?: string
  className?: string
}) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [highlight, setHighlight] = useState(-1)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const close = () => { setSuggestions([]); setHighlight(-1) }

  const fetchSuggestions = (query: string) => {
    if (timer.current) clearTimeout(timer.current)
    const q = query.trim()
    if (q.length < 3) { close(); return }
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/address/search?q=${encodeURIComponent(q)}`)
        const d = await res.json()
        setSuggestions(Array.isArray(d.results) ? d.results : [])
        setHighlight(-1)
      } catch {
        setSuggestions([])
      }
    }, 250)
  }

  const pick = (s: AddressSuggestion) => {
    onChange(s.address)
    onSelect(s)
    close()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (suggestions.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => Math.min(h + 1, suggestions.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)) }
    else if (e.key === 'Enter' && highlight >= 0) { e.preventDefault(); pick(suggestions[highlight]) }
    else if (e.key === 'Escape') { close() }
  }

  return (
    <div className="relative">
      <input
        value={value}
        onChange={e => { onChange(e.target.value); fetchSuggestions(e.target.value) }}
        onBlur={() => setTimeout(close, 150)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        className={className}
      />
      {suggestions.length > 0 && (
        <ul className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-auto">
          {suggestions.map((s, i) => (
            <li key={`${s.label}-${i}`}>
              <button
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => pick(s)}
                className={`w-full text-left px-3 py-2.5 hover:bg-indigo-50 ${i === highlight ? 'bg-indigo-50' : ''}`}
              >
                <div className="text-sm text-gray-800">{s.address || s.label}</div>
                <div className="text-xs text-gray-400">{s.postcode} {s.city}</div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
