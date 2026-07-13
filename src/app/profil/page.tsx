'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useProfile } from '@/lib/profileContext'
import { Contact } from '@/types'
import { completionItems, completionPercent } from '@/lib/profileCompletion'
import { getHealthPros } from '@/lib/healthPros'
import TreatmentsEditor from '@/components/TreatmentsEditor'
import HealthProsEditor from '@/components/HealthProsEditor'
import BloodTypeSelect from '@/components/BloodTypeSelect'
import AddressAutocomplete from '@/components/AddressAutocomplete'

function Field({ label, value, onChange, type = 'text', placeholder = '' }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-sm text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-xl p-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
      />
    </div>
  )
}

export default function ProfilPage() {
  const { profile, updateProfile, isLoading } = useProfile()
  const router = useRouter()
  const [open, setOpen] = useState<string | null>('identity')
  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get('section')
    if (s) setOpen(s)
  }, [])
  const [newContact, setNewContact] = useState<Partial<Contact>>({ relation: '' })
  const [showContactForm, setShowContactForm] = useState(false)

  const f = (key: keyof typeof profile) => (profile[key] as string) || ''
  const s = (key: keyof typeof profile) => (val: string) => updateProfile({ [key]: val })

  const percent = completionPercent(profile)
  const items = completionItems(profile)
  const itemMap = Object.fromEntries(items.map(i => [i.key, i]))
  const sectionStatus = (keys: string[]): 'done' | 'todo' | 'optional' => {
    const required = keys.map(k => itemMap[k]).filter(i => i && !i.optional)
    if (required.length === 0) return 'optional'
    return required.every(i => i.done) ? 'done' : 'todo'
  }

  const addContact = () => {
    if (!newContact.name) return
    const c: Contact = { id: Date.now().toString(), name: newContact.name || '', relation: newContact.relation || '', ...newContact }
    updateProfile({ contacts: [...profile.contacts, c] })
    setNewContact({ relation: '' })
    setShowContactForm(false)
  }

  const sections = [
    { id: 'identity', icon: '👤', title: 'Identité', keys: ['identity', 'birth', 'address'] },
    { id: 'contact', icon: '📱', title: 'Coordonnées', keys: ['contact', 'email'] },
    { id: 'medical', icon: '🏥', title: 'Médical', keys: ['bloodType', 'allergies', 'treatments'] },
    { id: 'pros', icon: '🩺', title: 'Professionnels de santé', keys: ['healthPros'] },
    { id: 'admin', icon: '📋', title: 'Administratif', keys: ['admin'] },
    { id: 'contacts', icon: '👨‍👩‍👧', title: 'Proches', keys: ['contacts'] },
  ]

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="text-2xl text-gray-400">Chargement...</div></div>
  }

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto pb-28">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.push('/')} className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all text-gray-600 font-bold text-lg">←</button>
        <h1 className="text-2xl font-bold text-gray-800">Mon profil</h1>
      </div>

      {/* Barre de progression */}
      <div className="bg-white rounded-2xl p-5 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-gray-700">Profil rempli</span>
          <span className="font-bold text-indigo-600">{percent}%</span>
        </div>
        <div className="w-full h-3 rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${percent}%` }} />
        </div>
        <p className="text-sm text-gray-400 mt-3">Complétez les sections qui vous intéressent, dans l&apos;ordre que vous voulez. Tout est enregistré automatiquement.</p>
      </div>

      <div className="space-y-3">
        {sections.map(sec => {
          const status = sectionStatus(sec.keys)
          const badge = status === 'done'
            ? { cls: 'bg-green-100 text-green-600', text: '✓ Rempli' }
            : status === 'optional'
              ? { cls: 'bg-gray-100 text-gray-400', text: 'Facultatif' }
              : { cls: 'bg-orange-100 text-orange-600', text: 'À compléter' }
          return (
          <section key={sec.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <button
              onClick={() => setOpen(open === sec.id ? null : sec.id)}
              className="w-full flex items-center gap-3 p-5 text-left active:scale-[0.99] transition-all"
            >
              <span className="text-2xl">{sec.icon}</span>
              <span className="flex-1 font-semibold text-gray-800">{sec.title}</span>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${badge.cls}`}>
                {badge.text}
              </span>
              <span className={`text-gray-300 transition-transform ${open === sec.id ? 'rotate-90' : ''}`}>›</span>
            </button>

            {open === sec.id && (
              <div className="px-5 pb-5 space-y-3 border-t border-gray-50 pt-4">
                {sec.id === 'identity' && (
                  <>
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
                  </>
                )}

                {sec.id === 'contact' && (
                  <>
                    <Field label="Téléphone fixe" value={f('phone')} onChange={s('phone')} type="tel" />
                    <Field label="Mobile" value={f('mobile')} onChange={s('mobile')} type="tel" />
                    <Field label="E-mail" value={f('email')} onChange={s('email')} type="email" />
                  </>
                )}

                {sec.id === 'medical' && (
                  <>
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">Groupe sanguin</label>
                      <BloodTypeSelect value={f('bloodType')} onChange={s('bloodType')} />
                    </div>
                    <Field label="Allergies" value={f('allergies')} onChange={s('allergies')} placeholder="Pénicilline, arachides…" />
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">Traitements / médicaments</label>
                      <TreatmentsEditor value={f('treatments')} onChange={raw => updateProfile({ treatments: raw })} />
                    </div>
                  </>
                )}

                {sec.id === 'pros' && (
                  <HealthProsEditor value={getHealthPros(profile)} onChange={list => updateProfile({ healthPros: list })} />
                )}

                {sec.id === 'admin' && (
                  <>
                    <Field label="N° Sécurité Sociale" value={f('socialSecurityNumber')} onChange={s('socialSecurityNumber')} />
                    <Field label="Mutuelle" value={f('mutuelle')} onChange={s('mutuelle')} />
                    <Field label="N° adhérent mutuelle" value={f('mutuelleNumber')} onChange={s('mutuelleNumber')} />
                    <Field label="N° allocataire CAF" value={f('cafNumber')} onChange={s('cafNumber')} />
                    <Field label="N° dossier MDPH" value={f('mdphNumber')} onChange={s('mdphNumber')} />
                    <div className="flex items-center gap-3 pt-1">
                      <input type="checkbox" id="aah" checked={profile.aahRecipient || false}
                        onChange={e => updateProfile({ aahRecipient: e.target.checked })} className="w-5 h-5 accent-indigo-500" />
                      <label htmlFor="aah" className="text-gray-700">Bénéficiaire de l&apos;AAH</label>
                    </div>
                  </>
                )}

                {sec.id === 'contacts' && (
                  <>
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
                    {showContactForm ? (
                      <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-200 space-y-2">
                        <input type="text" placeholder="Prénom Nom *" value={newContact.name || ''} onChange={e => setNewContact(p => ({ ...p, name: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                        <input type="text" placeholder="Relation (père, voisin…)" value={newContact.relation || ''} onChange={e => setNewContact(p => ({ ...p, relation: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                        <input type="tel" placeholder="Mobile" value={newContact.mobile || ''} onChange={e => setNewContact(p => ({ ...p, mobile: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                        <div className="flex gap-2">
                          <button onClick={() => { setShowContactForm(false); setNewContact({ relation: '' }) }} className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-600">Annuler</button>
                          <button onClick={addContact} disabled={!newContact.name} className="flex-1 py-2.5 rounded-lg bg-green-500 text-white font-semibold disabled:opacity-40">Ajouter</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setShowContactForm(true)} className="w-full py-3 rounded-xl border-2 border-dashed border-green-300 text-green-600 font-semibold hover:bg-green-50">
                        + Ajouter un proche
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </section>
          )
        })}
      </div>
    </main>
  )
}
