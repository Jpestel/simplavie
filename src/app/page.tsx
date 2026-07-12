'use client'
import { useState, useEffect } from 'react'
import { useConfig } from '@/lib/configContext'
import { useProfile } from '@/lib/profileContext'
import { useAuth } from '@/lib/authContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { loadCareData } from '@/lib/careService'
import { loadEvents } from '@/lib/agendaService'
import { missingPrerequisites } from '@/lib/modulePrerequisites'

function isTodayReminder(r: { recurrence: string; week_days: number[] | null; month_day: number | null; specific_date: string | null; date_start?: string | null; date_end?: string | null }): boolean {
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  switch (r.recurrence) {
    case 'daily': return true
    case 'weekly': return (r.week_days ?? []).includes(now.getDay())
    case 'monthly': return r.month_day === now.getDate()
    case 'once': return r.specific_date === today
    case 'period': return !!(r.date_start && r.date_end && today >= r.date_start && today <= r.date_end)
    default: return false
  }
}

export default function HomePage() {
  const { config, isLoading: configLoading } = useConfig()
  const { profile, isLoading: profileLoading } = useProfile()
  const { signOut, activeUserId, loading: authLoading, user, isSuperAdmin, isAdmin, hasOwnAccount, impersonatedUserId, impersonatedUserName, impersonate } = useAuth()
  const router = useRouter()
  const [careAlert, setCareAlert] = useState<string | null>(null)
  const [reminderAlert, setReminderAlert] = useState<{ count: number; first: string } | null>(null)
  const [agendaAlert, setAgendaAlert] = useState<{ count: number; first: string; tomorrow: boolean } | null>(null)

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  useEffect(() => {
    if (authLoading || configLoading || profileLoading || !user) return
    // En mode impersonation : afficher l'interface de l'utilisateur ciblé
    if (impersonatedUserId) return
    if (isSuperAdmin || (isAdmin && !hasOwnAccount)) return
    // Plus d'onboarding imposé : le profil se complète au choix via /profil.
    // Tant qu'aucun module n'est activé → page d'attente.
    if (config.modules.every(m => !m.enabled)) router.push('/waiting')
  }, [authLoading, configLoading, profileLoading, user, isSuperAdmin, isAdmin, hasOwnAccount, impersonatedUserId, config.modules, router])

  useEffect(() => {
    if (!profileLoading && activeUserId) {
      loadCareData(activeUserId).then(care => {
        const today = new Date().toISOString().slice(0, 10)
        const alerts = (care.appointments || []).filter(a => a.date === today && a.status !== 'planned')
        if (alerts.length > 0) {
          setCareAlert(`⚠️ ${alerts.length} changement(s) dans ton planning aujourd'hui`)
        }
      })
    }
  }, [profileLoading, profile.profileCompleted, activeUserId])

  useEffect(() => {
    if (!profileLoading && activeUserId) {
      const today    = new Date().toISOString().slice(0, 10)
      const tomorrow = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10) })()
      loadEvents(activeUserId).then(events => {
        const todayEvs    = events.filter(e => e.date === today)
        const tomorrowEvs = events.filter(e => e.date === tomorrow)
        if (todayEvs.length > 0) {
          setAgendaAlert({ count: todayEvs.length, first: todayEvs[0].title, tomorrow: false })
        } else if (tomorrowEvs.length > 0) {
          setAgendaAlert({ count: tomorrowEvs.length, first: tomorrowEvs[0].title, tomorrow: true })
        }
      })
    }
  }, [profileLoading, profile.profileCompleted, activeUserId])

  useEffect(() => {
    if (!profileLoading && activeUserId) {
      const todayStr = new Date().toISOString().slice(0, 10)
      Promise.all([
        fetch('/api/reminders?userId=' + activeUserId).then(r => r.json()),
        fetch('/api/reminders/completions?userId=' + activeUserId + '&date=' + todayStr).then(r => r.json()),
      ]).then(([reminders, completions]) => {
        const doneKeys = new Set(
          (Array.isArray(completions) ? completions : []).map((r: { reminderId: string; timeSlot: string }) => `${r.reminderId}_${r.timeSlot}`)
        )
        const todayReminders = (Array.isArray(reminders) ? reminders : []).filter(isTodayReminder)
        const pendingOccs: { label: string }[] = []
        for (const r of todayReminders) {
          const times = (r.times && r.times.length > 1) ? r.times.map((t: string) => t.slice(0,5)) : [r.timeOfDay.slice(0,5)]
          for (const t of times) {
            if (!doneKeys.has(`${r.id}_${t}`)) pendingOccs.push({ label: r.label })
          }
        }
        if (pendingOccs.length > 0) {
          setReminderAlert({ count: pendingOccs.length, first: pendingOccs[0].label })
        } else {
          setReminderAlert(null)
        }
      })
    }
  }, [profileLoading, profile.profileCompleted, activeUserId])

  if (authLoading || configLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-2xl text-gray-400">Chargement...</div>
      </div>
    )
  }

  // Sans impersonation : règles normales
  if (!impersonatedUserId && (!user || isSuperAdmin || (isAdmin && !hasOwnAccount))) return null

  const activeModules = config.modules.filter(m => m.enabled).sort((a, b) => a.order - b.order)

  const handleStopImpersonate = () => {
    impersonate(null)
    router.push('/superadmin')
  }

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto">
      {impersonatedUserId && (
        <div className="flex items-center justify-between bg-amber-50 border-2 border-amber-300 rounded-2xl px-4 py-3 mb-6">
          <div>
            <p className="text-amber-800 font-semibold text-sm">👁️ Mode aperçu</p>
            <p className="text-amber-600 text-xs">Vous visualisez le compte de <strong>{impersonatedUserName || 'cet utilisateur'}</strong></p>
          </div>
          <button
            onClick={handleStopImpersonate}
            className="text-xs px-3 py-2 rounded-xl bg-amber-200 hover:bg-amber-300 text-amber-800 font-semibold active:scale-95 transition-all"
          >
            ✕ Quitter
          </button>
        </div>
      )}

      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">
          Bonjour {impersonatedUserId ? (impersonatedUserName || config.userName) : (profile.firstName || config.userName)} 👋
        </h1>
        <p className="text-xl text-gray-500">
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {careAlert && (
        <div
          onClick={() => router.push('/modules/aidants')}
          className="bg-orange-50 border-2 border-orange-300 rounded-2xl p-4 mb-6 cursor-pointer active:scale-95 transition-all"
        >
          <p className="text-orange-700 font-semibold text-center">{careAlert}</p>
          <p className="text-orange-500 text-sm text-center mt-1">Appuie pour voir les détails →</p>
        </div>
      )}

      {reminderAlert && (
        <div
          onClick={() => router.push('/modules/reminders')}
          className="bg-purple-50 border-2 border-purple-300 rounded-2xl p-4 mb-6 cursor-pointer active:scale-95 transition-all"
        >
          <p className="text-purple-700 font-semibold text-center">🔔 {reminderAlert.count} rappel(s) aujourd&apos;hui</p>
          <p className="text-purple-500 text-sm text-center mt-1">{reminderAlert.first}{reminderAlert.count > 1 ? ` et ${reminderAlert.count - 1} autre(s)` : ''} → Voir</p>
        </div>
      )}

      {agendaAlert && (
        <div
          onClick={() => router.push('/modules/agenda')}
          className={`border-2 rounded-2xl p-4 mb-6 cursor-pointer active:scale-95 transition-all ${
            agendaAlert.tomorrow
              ? 'bg-indigo-50 border-indigo-200'
              : 'bg-red-50 border-red-300'
          }`}
        >
          <p className={`font-semibold text-center ${agendaAlert.tomorrow ? 'text-indigo-700' : 'text-red-700'}`}>
            📅 {agendaAlert.tomorrow ? 'Demain' : "Aujourd'hui"} : {agendaAlert.count} rendez-vous
          </p>
          <p className={`text-sm text-center mt-1 ${agendaAlert.tomorrow ? 'text-indigo-500' : 'text-red-500'}`}>
            {agendaAlert.first}{agendaAlert.count > 1 ? ` et ${agendaAlert.count - 1} autre(s)` : ''} → Voir
          </p>
        </div>
      )}

      {activeModules.length === 0 ? (
        <div className="text-center text-gray-400 mt-20">
          <p className="text-xl">Aucun module activé</p>
          <p className="mt-2">Tu peux activer des modules depuis l&apos;espace configuration ⚙️</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {activeModules.map(module => {
            const locked = missingPrerequisites(module.id, profile).length > 0
            return (
            <Link
              key={module.id}
              href={`/modules/${module.id}`}
              className="flex items-center gap-6 bg-white rounded-3xl p-6 shadow-sm border-2 border-gray-100 hover:shadow-md transition-all active:scale-95"
              style={{ borderColor: `${config.primaryColor}20` }}
            >
              <span className="text-5xl">{module.icon}</span>
              <div className="flex-1">
                <div className="text-2xl font-bold text-gray-800">{module.label}</div>
                <div className="text-gray-500 mt-1">{module.description}</div>
              </div>
              {locked && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-orange-600 shrink-0">🔒 À compléter</span>
              )}
            </Link>
            )
          })}
        </div>
      )}

      <Link
        href="/admin"
        className="mt-10 flex items-center justify-center gap-3 w-full bg-indigo-50 hover:bg-indigo-100 active:scale-95 transition-all rounded-2xl py-5 text-indigo-600 font-bold text-lg border-2 border-indigo-200"
      >
        <span className="text-2xl">⚙️</span>
        <span>Espace configuration</span>
      </Link>

      <button
        onClick={handleSignOut}
        className="mt-3 flex items-center justify-center gap-3 w-full bg-red-50 hover:bg-red-100 active:scale-95 transition-all rounded-2xl py-4 text-red-500 font-semibold text-base border border-red-200"
      >
        <span>🔒</span>
        <span>Se déconnecter</span>
      </button>
    </main>
  )
}
