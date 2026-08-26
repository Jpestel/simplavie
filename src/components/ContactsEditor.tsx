'use client'
import { useState } from 'react'
import { Contact } from '@/types'
import { useProfile } from '@/lib/profileContext'

const EMPTY: Contact = { id: '', name: '', relation: '', mobile: '', phone: '', email: '' }

function Field({ label, value, onChange, type = 'text', placeholder = '' }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-base text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border-2 border-gray-200 rounded-2xl p-4 text-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
      />
    </div>
  )
}

// Éditeur complet des contacts : ajouter, modifier, supprimer, réordonner.
// L'ordre du tableau est l'ordre d'affichage dans le module Contacts.
export default function ContactsEditor() {
  const { profile, updateProfile } = useProfile()
  const contacts = profile.contacts

  // id du contact en cours d'édition, 'new' pour un ajout, null si aucun
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Contact>(EMPTY)
  const [error, setError] = useState('')

  const startEdit = (c: Contact) => {
    setDraft({ ...EMPTY, ...c })
    setEditingId(c.id)
    setError('')
  }

  const startAdd = () => {
    setDraft({ ...EMPTY })
    setEditingId('new')
    setError('')
  }

  const cancel = () => {
    setEditingId(null)
    setDraft(EMPTY)
    setError('')
  }

  const set = (key: keyof Contact) => (v: string) => setDraft(d => ({ ...d, [key]: v }))

  const save = () => {
    if (!draft.name.trim()) {
      setError('Indiquez au moins un nom.')
      return
    }
    const clean: Contact = {
      ...draft,
      name: draft.name.trim(),
      relation: (draft.relation || '').trim(),
      mobile: (draft.mobile || '').trim(),
      phone: (draft.phone || '').trim(),
      email: (draft.email || '').trim(),
    }
    if (editingId === 'new') {
      updateProfile({ contacts: [...contacts, { ...clean, id: Date.now().toString() }] })
    } else {
      updateProfile({ contacts: contacts.map(c => (c.id === editingId ? clean : c)) })
    }
    cancel()
  }

  const remove = (id: string) => {
    const c = contacts.find(x => x.id === id)
    if (!confirm(`Supprimer ${c?.name ?? 'ce contact'} ?`)) return
    updateProfile({ contacts: contacts.filter(x => x.id !== id) })
    cancel()
  }

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= contacts.length) return
    const next = [...contacts]
    ;[next[index], next[target]] = [next[target], next[index]]
    updateProfile({ contacts: next })
  }

  const form = (
    <div className="space-y-3">
      <Field label="Nom" value={draft.name} onChange={set('name')} placeholder="Marie" />
      <Field label="Lien avec vous" value={draft.relation || ''} onChange={set('relation')} placeholder="Fille, médecin, voisin…" />
      <Field label="Mobile" value={draft.mobile || ''} onChange={set('mobile')} type="tel" placeholder="06 12 34 56 78" />
      <Field label="Téléphone fixe" value={draft.phone || ''} onChange={set('phone')} type="tel" placeholder="02 40 11 22 33" />
      <Field label="E-mail" value={draft.email || ''} onChange={set('email')} type="email" placeholder="marie@exemple.fr" />

      {error && <p className="text-red-500 text-base font-medium">{error}</p>}

      <div className="flex flex-wrap gap-3 pt-1">
        <button
          onClick={cancel}
          className="flex-1 min-w-[120px] py-4 rounded-2xl border-2 border-gray-300 text-gray-600 font-semibold text-lg active:scale-95 transition-all"
        >
          Annuler
        </button>
        <button
          onClick={save}
          className="flex-1 min-w-[120px] py-4 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-lg active:scale-95 transition-all"
        >
          Enregistrer
        </button>
        {editingId !== 'new' && (
          <button
            onClick={() => remove(editingId as string)}
            aria-label="Supprimer ce contact"
            className="w-16 py-4 rounded-2xl border-2 border-red-200 text-red-500 hover:bg-red-50 font-bold text-lg active:scale-95 transition-all"
          >
            🗑
          </button>
        )}
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {contacts.length === 0 && editingId !== 'new' && (
        <div className="text-center py-8 text-gray-400">
          <div className="text-5xl mb-3">📞</div>
          <p className="text-lg">Aucun contact pour l&apos;instant</p>
        </div>
      )}

      {contacts.map((contact, i) => (
        <div
          key={contact.id}
          className={`bg-white rounded-3xl p-4 shadow-sm border-2 ${editingId === contact.id ? 'border-indigo-300' : 'border-gray-100'}`}
        >
          {editingId === contact.id ? (
            <>
              <p className="text-base text-gray-500 mb-3">Modification de <strong className="text-gray-700">{contact.name}</strong></p>
              {form}
            </>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-1 shrink-0">
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label={`Monter ${contact.name}`}
                  className="w-12 h-11 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-indigo-100 hover:text-indigo-600 active:scale-95 transition-all disabled:opacity-20 disabled:pointer-events-none text-gray-500 text-lg font-bold"
                >▲</button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === contacts.length - 1}
                  aria-label={`Descendre ${contact.name}`}
                  className="w-12 h-11 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-indigo-100 hover:text-indigo-600 active:scale-95 transition-all disabled:opacity-20 disabled:pointer-events-none text-gray-500 text-lg font-bold"
                >▼</button>
              </div>

              <div className="w-14 h-14 shrink-0 rounded-full bg-indigo-100 flex items-center justify-center text-xl font-bold text-indigo-500">
                {contact.name.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-xl font-bold text-gray-800 truncate">{contact.name}</div>
                <div className="text-gray-500 truncate">
                  {contact.relation}
                  {contact.relation && (contact.mobile || contact.phone) ? ' · ' : ''}
                  {contact.mobile || contact.phone || ''}
                </div>
              </div>

              <button
                onClick={() => startEdit(contact)}
                className="shrink-0 px-5 py-4 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-lg active:scale-95 transition-all"
              >
                Modifier
              </button>
            </div>
          )}
        </div>
      ))}

      {editingId === 'new' ? (
        <div className="bg-white rounded-3xl p-4 shadow-sm border-2 border-indigo-300">
          <p className="text-base text-gray-500 mb-3">Nouveau contact</p>
          {form}
        </div>
      ) : (
        <button
          onClick={startAdd}
          className="w-full py-5 rounded-3xl border-2 border-dashed border-indigo-300 text-indigo-600 font-bold text-lg hover:bg-indigo-50 active:scale-95 transition-all"
        >
          + Ajouter un contact
        </button>
      )}
    </div>
  )
}
