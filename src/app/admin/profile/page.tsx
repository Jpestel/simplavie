'use client'
import TreatmentsEditor from '@/components/TreatmentsEditor'
import HealthProsEditor from '@/components/HealthProsEditor'
import BloodTypeSelect from '@/components/BloodTypeSelect'
import AddressAutocomplete from '@/components/AddressAutocomplete'
import { useProfile } from '@/lib/profileContext'
import { getHealthPros } from '@/lib/healthPros'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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

  const f = (key: keyof typeof profile) => (profile[key] as string) || ''
  const s = (key: keyof typeof profile) => (val: string) => updateProfile({ [key]: val })

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto pb-8">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all text-gray-600 font-bold text-lg">←</button>
        <h1 className="text-2xl font-bold text-gray-800">Profil utilisateur</h1>
      </div>

      {/* Identité */}
      <section className="bg-white rounded-2xl p-6 shadow-sm mb-4 space-y-3">
        <h2 className="text-lg font-semibold text-gray-700 mb-2">👤 Identité</h2>
        <Field label="Prénom" value={f('firstName')} onChange={s('firstName')} />
        <Field label="Nom" value={f('lastName')} onChange={s('lastName')} />
        <Field label="Date de naissance" value={f('birthDate')} onChange={s('birthDate')} type="date" />
        <div>
          <label className="block text-sm text-gray-500 mb-1">Adresse</label>
          <AddressAutocomplete
            value={f('address')}
            onChange={s('address')}
            onSelect={a => updateProfile({ address: a.address, postalCode: a.postcode, city: a.city })}
          />
        </div>
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
        <div>
          <label className="block text-sm text-gray-500 mb-1">Groupe sanguin</label>
          <BloodTypeSelect value={f('bloodType')} onChange={s('bloodType')} />
        </div>
        <Field label="Allergies" value={f('allergies')} onChange={s('allergies')} />
        <div>
          <label className="block text-sm text-gray-500 mb-1">Traitements / médicaments</label>
          <TreatmentsEditor value={f('treatments')} onChange={raw => updateProfile({ treatments: raw })} />
        </div>
        <div>
          <label className="block text-sm text-gray-500 mb-1">Professionnels de santé</label>
          <HealthProsEditor value={getHealthPros(profile)} onChange={list => updateProfile({ healthPros: list })} />
        </div>
      </section>

      {/* Contacts : gérés dans le module Contacts, pour n'avoir qu'un seul endroit */}
      <section className="bg-white rounded-2xl p-6 shadow-sm mb-4">
        <h2 className="text-lg font-semibold text-gray-700 mb-2">👨‍👩‍👧 Proches</h2>
        <p className="text-sm text-gray-400 mb-4">
          {profile.contacts.length === 0
            ? 'Aucun contact enregistré.'
            : `${profile.contacts.length} contact${profile.contacts.length > 1 ? 's' : ''} enregistré${profile.contacts.length > 1 ? 's' : ''} : ${profile.contacts.map(c => c.name).join(', ')}.`}
        </p>
        <Link
          href="/modules/contacts/reglages"
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-semibold active:scale-95 transition-all"
        >
          <span>📞</span> Gérer les contacts
        </Link>
      </section>
    </main>
  )
}
