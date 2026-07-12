'use client'

export const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Je ne sais pas']

// Choix du groupe sanguin dans une liste (évite les erreurs de saisie).
export default function BloodTypeSelect({
  value,
  onChange,
}: {
  value?: string
  onChange: (v: string) => void
}) {
  return (
    <select
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      className="w-full border border-gray-200 rounded-xl p-3 text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
    >
      <option value="">— Choisir —</option>
      {BLOOD_TYPES.map(bt => (
        <option key={bt} value={bt}>{bt}</option>
      ))}
    </select>
  )
}
