'use client'
import { useState } from 'react'
import { useProfile } from '@/lib/profileContext'
import { useConfig } from '@/lib/configContext'
import { useAuth } from '@/lib/authContext'
import { useRouter } from 'next/navigation'
import { Contact } from '@/types'

const STEPS = [
  { id: 'identity', label: 'Identité', icon: '👤' },
  { id: 'contact', label: 'Coordonnées', icon: '📱' },
  { id: 'admin', label: 'Administratif', icon: '📋' },
  { id: 'medical', label: 'Médical', icon: '🏥' },
  { id: 'contacts', label: 'Proches', icon: '👨‍👩‍👧' },
  { id: 'done', label: 'Terminé', icon: '✅' },
]

function InputField({ label, value, onChange, type = 'text', placeholder = '', optional = true }: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  optional?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1">
        {label} {optional && <span className="text-gray-400 font-normal">(optionnel)</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-2xl p-4 text-gray-800 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
      />
    </div>
  )
}

export default function OnboardingPage() {
  const { profile, updateProfile } = useProfile()
  const { updateConfig } = useConfig()
  const { signOut } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }
  const [step, setStep] = useState(0)
  const [newContact, setNewContact] = useState<Partial<Contact>>({ relation: '' })
  const [showContactForm, setShowContactForm] = useState(false)

  const field = (key: keyof typeof profile) => (profile[key] as string) || ''
  const set = (key: keyof typeof profile) => (val: string) => updateProfile({ [key]: val })

  const addContact = () => {
    if (!newContact.name) return
    const contact: Contact = {
      id: Date.now().toString(),
      name: newContact.name || '',
      relation: newContact.relation || '',
      phone: newContact.phone,
      mobile: newContact.mobile,
      email: newContact.email,
      address: newContact.address,
      city: newContact.city,
    }
    updateProfile({ contacts: [...profile.contacts, contact] })
    setNewContact({ relation: '' })
    setShowContactForm(false)
  }

  const removeContact = (id: string) => {
    updateProfile({ contacts: profile.contacts.filter(c => c.id !== id) })
  }

  const finish = () => {
    updateProfile({ profileCompleted: true })
    if (profile.firstName) updateConfig({ userName: profile.firstName })
    router.push('/waiting')
  }

  const progress = ((step) / (STEPS.length - 1)) * 100

  return (
    <main className="min-h-screen p-6 max-w-lg mx-auto flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Bienvenue sur SimplaVie</h1>
          <p className="text-gray-500">Quelques informations pour personnaliser l&apos;application</p>
        </div>
        <button onClick={handleSignOut} className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5 rounded-xl hover:bg-gray-100 transition-all">
          Déconnexion
        </button>
      </div>

      {/* Steps indicator */}
      <div className="flex gap-2 mb-2">
        {STEPS.map((s, i) => (
          <div
            key={s.id}
            className={`flex-1 h-1.5 rounded-full transition-all ${i <= step ? 'bg-indigo-500' : 'bg-gray-200'}`}
          />
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-400 mb-8">
        <span>{STEPS[step].icon} {STEPS[step].label}</span>
        <span>Étape {step + 1} / {STEPS.length}</span>
      </div>

      {/* Step content */}
      <div className="flex-1 space-y-4">

        {/* STEP 0: Identité */}
        {step === 0 && (
          <>
            <InputField label="Prénom" value={field('firstName')} onChange={set('firstName')} optional={false} placeholder="Prénom" />
            <InputField label="Nom" value={field('lastName')} onChange={set('lastName')} optional={false} placeholder="Nom de famille" />
            <InputField label="Date de naissance" value={field('birthDate')} onChange={set('birthDate')} type="date" />
            <InputField label="Adresse" value={field('address')} onChange={set('address')} placeholder="Numéro et rue" />
            <InputField label="Code postal" value={field('postalCode')} onChange={set('postalCode')} placeholder="76000" />
            <InputField label="Ville" value={field('city')} onChange={set('city')} placeholder="Le Havre" />
          </>
        )}

        {/* STEP 1: Coordonnées */}
        {step === 1 && (
          <>
            <InputField label="Téléphone fixe" value={field('phone')} onChange={set('phone')} type="tel" placeholder="02 XX XX XX XX" />
            <InputField label="Téléphone mobile" value={field('mobile')} onChange={set('mobile')} type="tel" placeholder="06 XX XX XX XX" />
            <InputField label="Adresse e-mail" value={field('email')} onChange={set('email')} type="email" placeholder="prenom@exemple.fr" />
          </>
        )}

        {/* STEP 2: Administratif */}
        {step === 2 && (
          <>
            <InputField label="Numéro de Sécurité Sociale" value={field('socialSecurityNumber')} onChange={set('socialSecurityNumber')} placeholder="1 XX XX XX XXX XXX XX" />
            <InputField label="Mutuelle / Complémentaire santé" value={field('mutuelle')} onChange={set('mutuelle')} placeholder="Nom de la mutuelle" />
            <InputField label="Numéro adhérent mutuelle" value={field('mutuelleNumber')} onChange={set('mutuelleNumber')} />
            <InputField label="Numéro allocataire CAF" value={field('cafNumber')} onChange={set('cafNumber')} />
            <InputField label="Numéro dossier MDPH" value={field('mdphNumber')} onChange={set('mdphNumber')} />
            <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-200">
              <input
                type="checkbox"
                id="aah"
                checked={profile.aahRecipient || false}
                onChange={e => updateProfile({ aahRecipient: e.target.checked })}
                className="w-5 h-5 accent-indigo-500"
              />
              <label htmlFor="aah" className="text-gray-700">Bénéficiaire de l&apos;AAH</label>
            </div>
          </>
        )}

        {/* STEP 3: Médical */}
        {step === 3 && (
          <>
            <InputField label="Médecin traitant" value={field('doctorName')} onChange={set('doctorName')} placeholder="Dr. Dupont" />
            <InputField label="Téléphone médecin" value={field('doctorPhone')} onChange={set('doctorPhone')} type="tel" placeholder="02 XX XX XX XX" />
            <InputField label="Pharmacie" value={field('pharmacyName')} onChange={set('pharmacyName')} placeholder="Pharmacie du Centre" />
            <InputField label="Téléphone pharmacie" value={field('pharmacyPhone')} onChange={set('pharmacyPhone')} type="tel" placeholder="02 XX XX XX XX" />
            <InputField label="Groupe sanguin" value={field('bloodType')} onChange={set('bloodType')} placeholder="A+, O-, etc." />
            <InputField label="Allergies" value={field('allergies')} onChange={set('allergies')} placeholder="Pénicilline, arachides..." />
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Traitements en cours <span className="text-gray-400 font-normal">(optionnel)</span>
              </label>
              <textarea
                value={field('treatments')}
                onChange={e => updateProfile({ treatments: e.target.value })}
                placeholder="Médicament A le matin, Médicament B le soir..."
                rows={3}
                className="w-full border border-gray-200 rounded-2xl p-4 text-gray-800 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white resize-none"
              />
            </div>
          </>
        )}

        {/* STEP 4: Contacts proches */}
        {step === 4 && (
          <div className="space-y-4">
            {/* Existing contacts */}
            {profile.contacts.map(c => (
              <div key={c.id} className="bg-white rounded-2xl p-4 border border-gray-200 flex justify-between items-start">
                <div>
                  <div className="font-semibold text-gray-800">{c.name}</div>
                  <div className="text-sm text-indigo-500">{c.relation}</div>
                  {c.mobile && <div className="text-sm text-gray-500">📱 {c.mobile}</div>}
                  {c.phone && <div className="text-sm text-gray-500">📞 {c.phone}</div>}
                  {c.email && <div className="text-sm text-gray-500">✉️ {c.email}</div>}
                  {c.address && <div className="text-sm text-gray-500">📍 {c.address}{c.city ? `, ${c.city}` : ''}</div>}
                </div>
                <button onClick={() => removeContact(c.id)} className="text-red-400 hover:text-red-600 text-xl ml-4">✕</button>
              </div>
            ))}

            {/* Add contact form */}
            {showContactForm ? (
              <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-200 space-y-3">
                <input type="text" placeholder="Prénom Nom *" value={newContact.name || ''} onChange={e => setNewContact(p => ({ ...p, name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl p-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                <input type="text" placeholder="Relation (ex: père, médecin, voisin...)" value={newContact.relation || ''} onChange={e => setNewContact(p => ({ ...p, relation: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl p-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                <input type="tel" placeholder="Mobile" value={newContact.mobile || ''} onChange={e => setNewContact(p => ({ ...p, mobile: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl p-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                <input type="tel" placeholder="Téléphone fixe" value={newContact.phone || ''} onChange={e => setNewContact(p => ({ ...p, phone: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl p-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                <input type="email" placeholder="E-mail" value={newContact.email || ''} onChange={e => setNewContact(p => ({ ...p, email: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl p-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                <input type="text" placeholder="Adresse" value={newContact.address || ''} onChange={e => setNewContact(p => ({ ...p, address: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl p-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                <input type="text" placeholder="Ville" value={newContact.city || ''} onChange={e => setNewContact(p => ({ ...p, city: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl p-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                <div className="flex gap-3">
                  <button onClick={() => { setShowContactForm(false); setNewContact({ relation: '' }) }}
                    className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50">
                    Annuler
                  </button>
                  <button onClick={addContact} disabled={!newContact.name}
                    className="flex-1 py-3 rounded-xl bg-indigo-500 text-white font-semibold hover:bg-indigo-600 disabled:opacity-40">
                    Ajouter
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowContactForm(true)}
                className="w-full py-4 rounded-2xl border-2 border-dashed border-indigo-300 text-indigo-500 font-semibold hover:bg-indigo-50 transition-colors">
                + Ajouter un proche
              </button>
            )}
          </div>
        )}

        {/* STEP 5: Done */}
        {step === 5 && (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">
              Tout est prêt, {profile.firstName || 'bienvenue'} !
            </h2>
            <p className="text-gray-500 mb-6">
              Ton profil est enregistré. Tu peux modifier ces informations à tout moment depuis l&apos;espace aidant.
            </p>
            <div className="bg-white rounded-2xl p-4 border border-gray-200 text-left space-y-2 text-sm text-gray-600 mb-6">
              {profile.firstName && <div>👤 {profile.firstName} {profile.lastName}</div>}
              {profile.mobile && <div>📱 {profile.mobile}</div>}
              {profile.email && <div>✉️ {profile.email}</div>}
              {profile.doctorName && <div>🏥 Dr. {profile.doctorName}</div>}
              {profile.contacts.length > 0 && <div>👨‍👩‍👧 {profile.contacts.length} proche(s) enregistré(s)</div>}
            </div>
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex gap-3 mt-8 pt-4">
        {step > 0 && step < STEPS.length - 1 && (
          <button onClick={() => setStep(s => s - 1)}
            className="flex-1 py-4 rounded-2xl border border-gray-300 text-gray-600 font-semibold text-lg hover:bg-gray-50 active:scale-95 transition-all">
            ← Retour
          </button>
        )}
        {step < STEPS.length - 2 && (
          <button onClick={() => setStep(s => s + 1)}
            className="flex-1 py-4 rounded-2xl bg-indigo-500 text-white font-bold text-lg hover:bg-indigo-600 active:scale-95 transition-all shadow-sm">
            Suivant →
          </button>
        )}
        {step === STEPS.length - 2 && (
          <button onClick={() => setStep(s => s + 1)}
            className="flex-1 py-4 rounded-2xl bg-indigo-500 text-white font-bold text-lg hover:bg-indigo-600 active:scale-95 transition-all shadow-sm">
            Voir le récapitulatif →
          </button>
        )}
        {step === STEPS.length - 1 && (
          <button onClick={finish}
            className="flex-1 py-4 rounded-2xl bg-green-500 text-white font-bold text-lg hover:bg-green-600 active:scale-95 transition-all shadow-sm">
            Commencer 🚀
          </button>
        )}
      </div>

      {/* Skip onboarding link */}
      {step < STEPS.length - 1 && (
        <button onClick={finish} className="text-center text-gray-400 text-sm mt-4 hover:text-gray-500">
          Passer et compléter plus tard
        </button>
      )}
    </main>
  )
}
