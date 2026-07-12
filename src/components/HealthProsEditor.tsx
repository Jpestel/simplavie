'use client'
import { HealthPro } from '@/types'
import { MEDICAL_SPECIALTIES, genId } from '@/lib/healthPros'

// Éditeur simplifié de professionnels de santé : on ajoute autant de pros que
// nécessaire, chacun = spécialité (liste déroulante) + nom + téléphone.
export default function HealthProsEditor({
  value,
  onChange,
}: {
  value?: HealthPro[]
  onChange: (list: HealthPro[]) => void
}) {
  const list = value ?? []

  const updateAt = (id: string, patch: Partial<HealthPro>) =>
    onChange(list.map(p => (p.id === id ? { ...p, ...patch } : p)))
  const add = () => onChange([...list, { id: genId(), specialty: 'generaliste', name: '', phone: '' }])
  const removeAt = (id: string) => onChange(list.filter(p => p.id !== id))

  return (
    <div className="space-y-3">
      {list.length === 0 && (
        <p className="text-sm text-gray-400">Aucun professionnel de santé enregistré pour le moment.</p>
      )}

      {list.map(pro => (
        <div key={pro.id} className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
          <div className="flex gap-2">
            <select
              value={pro.specialty}
              onChange={e => updateAt(pro.id, { specialty: e.target.value })}
              className="flex-1 border border-gray-200 rounded-xl p-3 text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              {MEDICAL_SPECIALTIES.map(s => (
                <option key={s.key} value={s.key}>{s.icon} {s.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => removeAt(pro.id)}
              aria-label="Supprimer ce professionnel"
              className="w-11 shrink-0 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-red-100 text-gray-400 hover:text-red-500 active:scale-95 transition-all"
            >
              🗑️
            </button>
          </div>

          {pro.specialty === 'autre' && (
            <input
              value={pro.customSpecialty ?? ''}
              onChange={e => updateAt(pro.id, { customSpecialty: e.target.value })}
              placeholder="Préciser la spécialité"
              className="w-full border border-gray-200 rounded-xl p-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          )}

          <input
            value={pro.name ?? ''}
            onChange={e => updateAt(pro.id, { name: e.target.value })}
            placeholder="Nom (ex : Dr Dupont)"
            className="w-full border border-gray-200 rounded-xl p-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <input
            type="tel"
            value={pro.phone ?? ''}
            onChange={e => updateAt(pro.id, { phone: e.target.value })}
            placeholder="Téléphone"
            className="w-full border border-gray-200 rounded-xl p-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        className="w-full py-3.5 rounded-2xl border-2 border-dashed border-indigo-300 text-indigo-600 font-semibold hover:bg-indigo-50 active:scale-95 transition-all"
      >
        + Ajouter un professionnel de santé
      </button>
    </div>
  )
}
