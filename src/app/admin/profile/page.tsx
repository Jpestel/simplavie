'use client'
import { useProfile } from '@/lib/profileContext'
import { useRouter } from 'next/navigation'
import { Contact } from '@/types'
import { useState } from 'react'

function Field({ label, value, onChange, type = 'text', placeholder = '' }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-sm text-gray-500 mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full border border-gray-200 rounded-xl p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
    </div>
  )
}

export default function AdminProfilePage() {
  const { profile, updateProfile } = useProfile()
  const router = useRouter()
  const [newContact, setNewContact] = useState<Partial<Contact>>({ relation: '' })
  const [showForm, setShowForm] = useState(false)

  const f = (key: keyof typeof profile) => (profile[key] as string) || ''
  const s = (key: keyof typeof profile) => (val: string) => updateProfile({ [key]: val })

  const addContact = () => {
    if (!newContact.name) return
    const c: Contact = { id: Date.now().toString(), name: newContact.name || '', relation: newContact.relation || '', ...newContact }
    updateProfile({ contacts: [...profile.contacts, c] })
    setNewContact({ relation: '' })
    setShowForm(false)
  }

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-xl">←</button>
        <h1 className="text-2xl font-bold text-gray-800">Profil utilisateur</h1>
      </div>

      {/* Identité */}
      <section className="bg-white rounded-2xl p-6 shadow-sm mb-4 space-y-3">
        <h2 className="text-lg font-semibold text-gray-700 mb-2">👤 Identité</h2>
        <Field label="Prénom" value={f('firstName')} onChange={s('firstName')} />
        <Field label="Nom" value={f('lastName')} onChange={s('lastName')} />
        <Field label="Date de naissance" value={f('birthDate')} onChange={s('birthDate')} type="date" />
        <Field label="Adresse" value={f('address')} onChange={s('address')} />
        <Field label="Code postal" value={f('postalCode')} onChange={s('postalCode')} />
        <Field label="Ville" value={f('city')} onChange={s('city')} />
      </section>

      {/* Coordonnées */}
      <section className="bg-white rounded-2xl p-6 shadow-sm mb-4 space-y-3">
        <h2 className="text-lg font-semibold text-gray-700 mb-2">📱 Coordonnées</h2>
        <Field label="Téléphone fixe" value={f('phone')} onChange={s('phone')} type="tel" />
        <Field label="Mobile" value={f('mobile')} onChange={s('mobile')} type="tel" />
        <Field label="E-mail" value={f('email')} onChange={s('email')} type="email" />
      </section>

      {/* Administratif */}
      <section className="bg-white rounded-2xl p-6 shadow-sm mb-4 space-y-3">
        <h2 className="text-lg font-semibold text-gray-700 mb-2">📋 Administratif</h2>
        <Field label="N° Sécurité Sociale" value={f('socialSecurityNumber')} onChange={s('socialSecurityNumber')} />
        <Field label="Mutuelle" value={f('mutuelle')} onChange={s('mutuelle')} />
        <Field label="N° adhérent mutuelle" value={f('mutuelleNumber')} onChange={s('mutuelleNumber')} />
        <Field label="N° allocataire CAF" value={f('cafNumber')} onChange={s('cafNumber')} />
        <Field label="N° dossier MDPH" value={f('mdphNumber')} onChange={s('mdphNumber')} />
        <div className="flex items-center gap-3">
          <input type="checkbox" id="aah" checked={profile.aahRecipient || false}
            onChange={e => updateProfile({ aahRecipient: e.target.checked })} className="w-5 h-5 accent-indigo-500" />
          <label htmlFor="aah" className="text-gray-700">Bénéficiaire de l&apos;AAH</label>
        </div>
      </section>

      {/* Médical */}
      <section className="bg-white rounded-2xl p-6 shadow-sm mb-4 space-y-3">
        <h2 className="text-lg font-semibold text-gray-700 mb-2">🏥 Médical</h2>
        <Field label="Médecin traitant" value={f('doctorName')} onChange={s('doctorName')} />
        <Field label="Téléphone médecin" value={f('doctorPhone')} onChange={s('doctorPhone')} type="tel" />
        <Field label="Pharmacie" value={f('pharmacyName')} onChange={s('pharmacyName')} />
        <Field label="Téléphone pharmacie" value={f('pharmacyPhone')} onChange={s('pharmacyPhone')} type="tel" />
        <Field label="Groupe sanguin" value={f('bloodType')} onChange={s('bloodType')} />
        <Field label="Allergies" value={f('allergies')} onChange={s('allergies')} />
        <div>
          <label className="block text-sm text-gray-500 mb-1">Traitements en cours</label>
          <textarea value={f('treatments')} onChange={e => updateProfile({ treatments: e.target.value })} rows={3}
            className="w-full border border-gray-200 rounded-xl p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
        </div>
      </section>

      {/* Contacts */}
      <section className="bg-white rounded-2xl p-6 shadow-sm mb-4">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">👨‍👩‍👧 Proches</h2>
        <div className="space-y-3 mb-4">
          {profile.contacts.map(c => (
            <div key={c.id} className="flex justify-between items-start p-3 rounded-xl bg-gray-50">
              <div>
                <div className="font-medium text-gray-700">{c.name} <span className="text-indigo-400 text-sm">({c.relation})</span></div>
                {c.mobile && <div className="text-sm text-gray-500">📱 {c.mobile}</div>}
                {c.phone && <div className="text-sm text-gray-500">📞 {c.phone}</div>}
                {c.email && <div className="text-sm text-gray-500">✉️ {c.email}</div>}
              </div>
              <button onClick={() => updateProfile({ contacts: profile.contacts.filter(x => x.id !== c.id) })}
                className="text-red-400 hover:text-red-600 ml-2">✕</button>
            </div>
          ))}
        </div>
        {showForm ? (
          <div className="space-y-2 bg-indigo-50 rounded-xl p-4">
            <input placeholder="Nom *" value={newContact.name || ''} onChange={e => setNewContact(p => ({ ...p, name: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            <input placeholder="Relation" value={newContact.relation || ''} onChange={e => setNewContact(p => ({ ...p, relation: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            <input placeholder="Mobile" type="tel" value={newContact.mobile || ''} onChange={e => setNewContact(p => ({ ...p, mobile: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            <input placeholder="E-mail" type="email" value={newContact.email || ''} onChange={e => setNewContact(p => ({ ...p, email: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            <div className="flex gap-2">
              <button onClick={() => { setShowForm(false); setNewContact({ relation: '' }) }}
                className="flex-1 py-2 rounded-xl border border-gray-300 text-gray-600">Annuler</button>
              <button onClick={addContact} disabled={!newContact.name}
                className="flex-1 py-2 rounded-xl bg-indigo-500 text-white font-semibold disabled:opacity-40">Ajouter</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowForm(true)}
            className="w-full py-3 rounded-xl border-2 border-dashed border-indigo-300 text-indigo-500 hover:bg-indigo-50">
            + Ajouter un proche
          </button>
        )}
      </section>

      {/* Reset onboarding button */}
      <section className="bg-white rounded-2xl p-6 shadow-sm mb-8">
        <h2 className="text-lg font-semibold text-gray-700 mb-2">Relancer l&apos;assistant</h2>
        <p className="text-sm text-gray-500 mb-3">Refaire le parcours d&apos;inscription depuis le début.</p>
        <button onClick={() => { updateProfile({ profileCompleted: false }); router.push('/onboarding') }}
          className="w-full py-3 rounded-xl border border-red-200 text-red-500 hover:bg-red-50">
          Relancer l&apos;assistant d&apos;inscription
        </button>
      </section>
    </main>
  )
}
