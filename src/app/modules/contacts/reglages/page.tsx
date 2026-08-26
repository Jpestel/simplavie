'use client'
import ContactsEditor from '@/components/ContactsEditor'

export default function ContactsSettingsPage() {
  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Réglages des contacts</h1>
        <p className="text-gray-400">
          Le premier de la liste apparaît en haut dans le module. Mettez les plus importants en premier.
        </p>
      </div>

      <ContactsEditor />
    </main>
  )
}
