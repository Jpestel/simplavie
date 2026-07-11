'use client'
import { useRef, useState } from 'react'
import { Treatment } from '@/types'
import { MOMENTS, parseTreatments, serializeTreatments, genId } from '@/lib/treatments'

// Éditeur de traitements réutilisable (onboarding + espace aidant).
// Contrôlé : `value` est la chaîne stockée en base, `onChange` reçoit la
// nouvelle chaîne sérialisée à chaque modification. Le champ « Nom du
// médicament » propose une autocomplétion issue de la base officielle (BDPM).
export default function TreatmentsEditor({
  value,
  onChange,
}: {
  value?: string
  onChange: (raw: string) => void
}) {
  const { list, note } = parseTreatments(value)

  // Autocomplétion : suggestions pour la ligne actuellement éditée.
  const [activeId, setActiveId] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [highlight, setHighlight] = useState(-1)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const commit = (nextList: Treatment[], nextNote: string) => onChange(serializeTreatments(nextList, nextNote))
  const updateAt = (id: string, patch: Partial<Treatment>) =>
    commit(list.map(t => (t.id === id ? { ...t, ...patch } : t)), note)
  const addTreatment = () =>
    commit([...list, { id: genId(), name: '', dosage: '', moments: [], time: '' }], note)
  const removeAt = (id: string) => commit(list.filter(t => t.id !== id), note)
  const toggleMoment = (t: Treatment, key: string) =>
    updateAt(t.id, { moments: t.moments.includes(key) ? t.moments.filter(m => m !== key) : [...t.moments, key] })

  const closeSuggestions = () => { setSuggestions([]); setHighlight(-1) }

  const fetchSuggestions = (query: string) => {
    if (timer.current) clearTimeout(timer.current)
    const q = query.trim()
    if (q.length < 2) { closeSuggestions(); return }
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/medications/search?q=${encodeURIComponent(q)}`)
        const d = await res.json()
        setSuggestions(Array.isArray(d.results) ? d.results : [])
        setHighlight(-1)
      } catch {
        setSuggestions([])
      }
    }, 250)
  }

  const onNameChange = (id: string, val: string) => {
    updateAt(id, { name: val })
    setActiveId(id)
    fetchSuggestions(val)
  }

  const selectSuggestion = (id: string, label: string) => {
    updateAt(id, { name: label })
    closeSuggestions()
    setActiveId(null)
  }

  const onNameKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (suggestions.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => Math.min(h + 1, suggestions.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)) }
    else if (e.key === 'Enter' && highlight >= 0) { e.preventDefault(); selectSuggestion(id, suggestions[highlight]) }
    else if (e.key === 'Escape') { closeSuggestions() }
  }

  return (
    <div className="space-y-3">
      {list.length === 0 && (
        <p className="text-sm text-gray-400">Aucun traitement enregistré pour le moment.</p>
      )}

      {list.map(t => (
        <div key={t.id} className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                value={t.name}
                onChange={e => onNameChange(t.id, e.target.value)}
                onFocus={() => { setActiveId(t.id); closeSuggestions() }}
                onBlur={() => setTimeout(() => closeSuggestions(), 150)}
                onKeyDown={e => onNameKeyDown(e, t.id)}
                placeholder="Nom du médicament"
                autoComplete="off"
                className="w-full border border-gray-200 rounded-xl p-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              {activeId === t.id && suggestions.length > 0 && (
                <ul className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-auto">
                  {suggestions.map((s, i) => (
                    <li key={s}>
                      <button
                        type="button"
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => selectSuggestion(t.id, s)}
                        className={`w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50 ${i === highlight ? 'bg-indigo-50' : ''}`}
                      >
                        {s}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button
              type="button"
              onClick={() => removeAt(t.id)}
              aria-label="Supprimer ce traitement"
              className="w-11 shrink-0 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-red-100 text-gray-400 hover:text-red-500 active:scale-95 transition-all"
            >
              🗑️
            </button>
          </div>

          <div className="flex gap-2">
            <input
              value={t.dosage ?? ''}
              onChange={e => updateAt(t.id, { dosage: e.target.value })}
              placeholder="Dosage / quantité (ex : 1 comprimé, 500 mg)"
              className="flex-1 border border-gray-200 rounded-xl p-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <input
              type="time"
              value={t.time ?? ''}
              onChange={e => updateAt(t.id, { time: e.target.value })}
              aria-label="Heure de prise"
              className="w-32 border border-gray-200 rounded-xl p-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-1.5">Moments de prise</p>
            <div className="flex flex-wrap gap-2">
              {MOMENTS.map(m => {
                const active = t.moments.includes(m.key)
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => toggleMoment(t, m.key)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-all active:scale-95 ${
                      active
                        ? 'bg-indigo-500 border-indigo-500 text-white'
                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <span>{active ? '☑' : '☐'}</span>
                    <span>{m.icon} {m.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addTreatment}
        className="w-full py-3.5 rounded-2xl border-2 border-dashed border-indigo-300 text-indigo-600 font-semibold hover:bg-indigo-50 active:scale-95 transition-all"
      >
        + Ajouter un traitement
      </button>

      <div>
        <label className="block text-sm font-medium text-gray-500 mb-1">
          Autres informations sur les traitements <span className="font-normal text-gray-400">(optionnel)</span>
        </label>
        <textarea
          value={note}
          onChange={e => commit(list, e.target.value)}
          rows={2}
          placeholder="Remarques libres…"
          className="w-full border border-gray-200 rounded-xl p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
        />
      </div>
    </div>
  )
}
