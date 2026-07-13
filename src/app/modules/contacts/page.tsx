'use client'
import { useProfile } from '@/lib/profileContext'
import { useRouter } from 'next/navigation'

export default function ContactsPage() {
  const { profile } = useProfile()
  const router = useRouter()

  const contacts = profile.contacts

  const getPhone = (c: typeof profile.contacts[0]) => c.mobile || c.phone || ''

  return (
    <main className="min-h-screen p-6 pb-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Contacts</h1>
        <p className="text-gray-400">Appuie sur un contact pour appeler</p>
      </div>

      {contacts.length === 0 ? (
        <div className="text-center mt-20 text-gray-400">
          <div className="text-5xl mb-4">📞</div>
          <p className="text-xl">Aucun contact enregistré</p>
          <p className="mt-2 text-sm">Tu peux en ajouter depuis l&apos;espace configuration ⚙️</p>
        </div>
      ) : (
        <div className="space-y-4">
          {contacts.map((contact) => {
            if (!contact) return null
            const phone = getPhone(contact)
            return (
              <div
                key={contact.id}
                className="bg-white rounded-3xl p-6 shadow-sm border-2 border-gray-100"
              >
                {/* Contact info */}
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-2xl font-bold text-indigo-500 shrink-0">
                    {contact.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-800">{contact.name}</div>
                    {contact.relation && (
                      <div className="text-indigo-500 font-medium">{contact.relation}</div>
                    )}
                    {phone && (
                      <div className="text-gray-500 mt-1">{phone}</div>
                    )}
                  </div>
                </div>

                {/* Call buttons */}
                <div className="flex gap-3">
                  {contact.mobile && (
                    <a
                      href={`tel:${contact.mobile}`}
                      className="flex-1 flex items-center justify-center gap-3 bg-green-500 hover:bg-green-600 active:scale-95 text-white font-bold text-xl rounded-2xl py-5 transition-all shadow-sm"
                    >
                      <span className="text-2xl">📱</span>
                      <span>Mobile</span>
                    </a>
                  )}
                  {contact.phone && (
                    <a
                      href={`tel:${contact.phone}`}
                      className="flex-1 flex items-center justify-center gap-3 bg-blue-500 hover:bg-blue-600 active:scale-95 text-white font-bold text-xl rounded-2xl py-5 transition-all shadow-sm"
                    >
                      <span className="text-2xl">📞</span>
                      <span>Fixe</span>
                    </a>
                  )}
                  {!contact.mobile && !contact.phone && (
                    <div className="flex-1 flex items-center justify-center bg-gray-100 text-gray-400 rounded-2xl py-5 text-lg">
                      Pas de numéro
                    </div>
                  )}
                </div>

                {/* Email button if available */}
                {contact.email && (
                  <a
                    href={`mailto:${contact.email}`}
                    className="mt-3 w-full flex items-center justify-center gap-3 bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-600 font-semibold text-lg rounded-2xl py-4 transition-all"
                  >
                    <span>✉️</span>
                    <span>Envoyer un e-mail</span>
                  </a>
                )}
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
