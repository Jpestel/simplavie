'use client'
import BackBar from '@/components/BackBar'
import { useProfile } from '@/lib/profileContext'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function ContactsAdminPage() {
  const { profile } = useProfile()
  const router = useRouter()
  const [orderedIds, setOrderedIds] = useState<string[]>([])

  useEffect(() => {
    setOrderedIds(profile.contacts.map(c => c.id))
  }, [profile.contacts])

  const orderedContacts = orderedIds
    .map(id => profile.contacts.find(c => c.id === id))
    .filter(Boolean)
    .concat(profile.contacts.filter(c => !orderedIds.includes(c.id)))

  const save = (ids: string[]) => {
    setOrderedIds(ids)
  }

  const moveUp = (index: number) => {
    if (index === 0) return
    const next = [...orderedIds]
    ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
    save(next)
  }

  const moveDown = (index: number) => {
    if (index === orderedContacts.length - 1) return
    const next = [...orderedIds]
    ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
    save(next)
  }

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto pb-28">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-xl">←</button>
        <h1 className="text-2xl font-bold text-gray-800">Contacts d&apos;urgence</h1>
      </div>

      <section className="bg-white rounded-2xl p-6 shadow-sm mb-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-2">Ordre d&apos;affichage</h2>
        <p className="text-sm text-gray-400 mb-4">Le premier contact apparaît en haut. Mets les plus importants en premier.</p>

        {orderedContacts.length === 0 ? (
          <div className="text-center py-6 text-gray-400">
            <p>Aucun contact dans le profil.</p>
            <Link href="/admin/profile" className="text-indigo-500 hover:underline mt-2 block">
              Ajouter des contacts →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {orderedContacts.map((contact, i) => {
              if (!contact) return null
              return (
                <div key={contact.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-500 shrink-0">
                    {contact.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-700">{contact.name}</div>
                    <div className="text-sm text-gray-400">{contact.relation} {contact.mobile ? `· ${contact.mobile}` : contact.phone ? `· ${contact.phone}` : ''}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => moveUp(i)} disabled={i === 0} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-20">↑</button>
                    <button onClick={() => moveDown(i)} disabled={i === orderedContacts.length - 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-20">↓</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
        <p className="text-sm text-blue-700">
          Pour ajouter ou modifier des contacts, va dans{' '}
          <Link href="/admin/profile" className="font-semibold underline">
            Profil utilisateur
          </Link>.
        </p>
      </section>
      <BackBar />
    </main>
  )
}
