'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CareData, CareAppointment } from '@/types'
import { loadCareData, EMPTY_CARE_DATA } from '@/lib/careService'
import { loadAlertMessages } from '@/lib/alertMessagesService'
import { useAuth } from '@/lib/authContext'
import BackBar from '@/components/BackBar'

const DAYS_FULL = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const DAYS_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

type View = 'jour' | 'semaine' | 'mois' | 'annee'

function getAnchor(view: View, offset: number): Date {
  const base = new Date()
  if (view === 'jour') base.setDate(base.getDate() + offset)
  if (view === 'semaine') base.setDate(base.getDate() + offset * 7)
  if (view === 'mois') base.setMonth(base.getMonth() + offset)
  if (view === 'annee') base.setFullYear(base.getFullYear() + offset)
  return base
}

function localISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getDates(view: View, anchor: Date): string[] {
  if (view === 'jour') return [localISO(anchor)]

  if (view === 'semaine') {
    const day = anchor.getDay()
    const monday = new Date(anchor)
    monday.setDate(anchor.getDate() - (day === 0 ? 6 : day - 1))
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      return localISO(d)
    })
  }

  if (view === 'mois') {
    const y = anchor.getFullYear(), m = anchor.getMonth()
    const days = new Date(y, m + 1, 0).getDate()
    return Array.from({ length: days }, (_, i) => localISO(new Date(y, m, i + 1)))
  }

  // annee
  const y = anchor.getFullYear()
  const dates: string[] = []
  for (let m = 0; m < 12; m++) {
    const days = new Date(y, m + 1, 0).getDate()
    for (let i = 1; i <= days; i++) dates.push(localISO(new Date(y, m, i)))
  }
  return dates
}

function getPeriodLabel(view: View, anchor: Date): string {
  if (view === 'jour') return DAYS_FULL[anchor.getDay()] + ' ' + anchor.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  if (view === 'semaine') {
    const day = anchor.getDay()
    const monday = new Date(anchor)
    monday.setDate(anchor.getDate() - (day === 0 ? 6 : day - 1))
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    return monday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + ' – ' + sunday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  }
  if (view === 'mois') return MONTHS[anchor.getMonth()] + ' ' + anchor.getFullYear()
  return String(anchor.getFullYear())
}

const VIEWS: { key: View; label: string }[] = [
  { key: 'jour', label: 'Jour' },
  { key: 'semaine', label: 'Semaine' },
  { key: 'mois', label: 'Mois' },
  { key: 'annee', label: 'Année' },
]

export default function AidantsPage() {
  const router = useRouter()
  const { activeUserId } = useAuth()
  const [care, setCare] = useState<CareData>(EMPTY_CARE_DATA)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('semaine')
  const [offset, setOffset] = useState(0)
  const [alertAppt, setAlertAppt] = useState<CareAppointment | null>(null)
  const [alertStep, setAlertStep] = useState<'contact' | 'email'>('contact')
  const [alertMessages, setAlertMessages] = useState<string[]>([])
  const [freeText, setFreeText] = useState('')
  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    if (!activeUserId) return
    loadCareData(activeUserId).then(d => { setCare(d); setLoading(false) })
    loadAlertMessages(activeUserId).then(setAlertMessages)
  }, [activeUserId])

  function switchView(v: View) { setView(v); setOffset(0) }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-2xl text-gray-400">Chargement...</div>
    </div>
  )

  const hasCompany = care.company.name.trim().length > 0
  const getAppt = (date: string): CareAppointment[] =>
    (care.appointments || []).filter(a => a.date === date).sort((a, b) => a.time.localeCompare(b.time))

  const todayAppts = getAppt(today)
  const hasAlert = todayAppts.some(a => a.status === 'modified' || a.status === 'cancelled')

  const getCaregiverName = (appt: CareAppointment) => {
    if (appt.caregiverId) {
      const cg = care.caregivers.find(c => c.id === appt.caregiverId)
      if (cg) return cg.name
    }
    return appt.caregiverName || 'Intervenant'
  }

  const anchor = getAnchor(view, offset)
  const allDates = getDates(view, anchor)
  const datesWithAppts = view === 'mois' || view === 'annee'
    ? allDates.filter(d => getAppt(d).length > 0)
    : allDates
  const periodLabel = getPeriodLabel(view, anchor)
  const isCurrentPeriod = offset === 0

  return (
    <main className="min-h-screen p-6 pb-28 max-w-6xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-800">Mes aidants</h1>
        <p className="text-gray-400">{DAYS_FULL[new Date().getDay()]} {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</p>
      </div>

      {!hasCompany && (care.appointments || []).length === 0 && care.caregivers.length === 0 ? (
        <div className="text-center mt-20 text-gray-400">
          <div className="text-5xl mb-4">🤝</div>
          <p className="text-xl">Ce module n&apos;est pas encore configuré</p>
          <p className="mt-2 text-sm">Tu peux le configurer depuis l&apos;espace configuration ⚙️</p>
        </div>
      ) : (
        <>
          {/* Alert today — always full width */}
          {hasAlert && (
            <div className="bg-orange-50 border-2 border-orange-300 rounded-3xl p-5 mb-4">
              <h2 className="text-lg font-bold text-orange-700 mb-2">⚠️ Changement aujourd&apos;hui</h2>
              {todayAppts.filter(a => a.status !== 'planned').map(a => (
                <div key={a.id} className="text-orange-800">
                  <span className="font-semibold">{a.time}</span>
                  {a.status === 'cancelled' && <span className="ml-2 line-through text-gray-400">{getCaregiverName(a)}</span>}
                  {a.modifiedNote && <p className="text-sm mt-1">{a.modifiedNote}</p>}
                </div>
              ))}
            </div>
          )}

          {/* 3-col desktop / stacked mobile */}
          <div className="flex flex-col gap-4 lg:grid lg:grid-cols-5 lg:items-start lg:gap-6">

            {/* CALENDRIER — top on mobile (order 1), center on desktop (order 2) */}
            <div className="lg:order-2 lg:col-span-3 space-y-4">
              <div className="grid grid-cols-4 gap-2">
                {VIEWS.map(v => (
                  <button key={v.key} onClick={() => switchView(v.key)}
                    className={`py-3 rounded-2xl font-semibold text-sm transition-all active:scale-95 ${
                      view === v.key ? 'bg-indigo-500 text-white shadow-md' : 'bg-white border-2 border-gray-200 text-gray-600'
                    }`}>
                    {v.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button onClick={() => setOffset(o => o - 1)}
                  className="w-14 h-14 flex items-center justify-center bg-white border-2 border-gray-200 rounded-2xl text-2xl text-gray-600 active:scale-95 hover:bg-gray-50 transition-all shrink-0">
                  ‹
                </button>
                <div className="flex-1 text-center">
                  <div className="font-bold text-gray-800 text-base leading-tight">{periodLabel}</div>
                  {!isCurrentPeriod && (
                    <button onClick={() => setOffset(0)} className="text-xs text-indigo-500 font-semibold mt-1 underline">
                      Aujourd&apos;hui
                    </button>
                  )}
                </div>
                <button onClick={() => setOffset(o => o + 1)}
                  className="w-14 h-14 flex items-center justify-center bg-white border-2 border-gray-200 rounded-2xl text-2xl text-gray-600 active:scale-95 hover:bg-gray-50 transition-all shrink-0">
                  ›
                </button>
              </div>

              <div className="bg-white rounded-3xl shadow-sm border-2 border-gray-100 overflow-hidden">
                {datesWithAppts.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <div className="text-4xl mb-2">📭</div>
                    <p>Aucune intervention sur cette période</p>
                  </div>
                ) : (
                  datesWithAppts.map((date) => {
                    const appts = getAppt(date)
                    const isToday = date === today
                    const d = new Date(date + 'T00:00:00')
                    return (
                      <div key={date} className={`flex gap-3 p-4 border-b border-gray-50 last:border-0 ${isToday ? 'bg-indigo-50' : ''}`}>
                        <div className="w-16 shrink-0">
                          <div className={`text-sm font-bold ${isToday ? 'text-indigo-600' : 'text-gray-500'}`}>{DAYS_SHORT[d.getDay()]}</div>
                          <div className={`text-xs ${isToday ? 'text-indigo-400' : 'text-gray-400'}`}>{d.getDate()} {MONTHS[d.getMonth()].slice(0,3)}.</div>
                        </div>
                        <div className="flex-1 space-y-1">
                          {appts.length === 0 ? (
                            <span className="text-gray-300 text-sm">—</span>
                          ) : appts.map(a => (
                            <div key={a.id} className={`flex items-center gap-2 ${a.status === 'cancelled' ? 'opacity-40' : ''}`}>
                              <div className="flex-1 flex items-center gap-2 flex-wrap">
                                <span className={`text-sm font-semibold ${a.status === 'cancelled' ? 'line-through text-gray-400' : isToday ? 'text-indigo-600' : 'text-gray-700'}`}>
                                  {a.time}{a.endTime ? ` → ${a.endTime}` : ''}
                                </span>
                                <span className={`text-sm ${a.status === 'cancelled' ? 'line-through text-gray-400' : 'text-gray-500'}`}>{getCaregiverName(a)}</span>
                                {a.status === 'modified' && <span className="text-xs text-orange-500">⚠️</span>}
                                {a.status === 'cancelled' && <span className="text-xs text-red-400">✕</span>}
                              </div>
                              <button
                                onClick={() => setAlertAppt(a)}
                                className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-50 border border-orange-200 text-orange-500 font-semibold text-sm hover:bg-orange-100 active:scale-95 transition-all"
                              >
                                <span>🔔</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* INTERVENANTS — middle on mobile (order 2), right on desktop (order 3) */}
            <div className="lg:order-3 lg:col-span-1">
              {care.caregivers.length > 0 && (
                <section>
                  <h2 className="text-lg font-bold text-gray-700 mb-3">Mes intervenants</h2>
                  <div className="space-y-3">
                    {care.caregivers.map(cg => (
                      <div key={cg.id} className="bg-white rounded-3xl p-5 shadow-sm border-2 border-gray-100">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-xl font-bold text-indigo-500 shrink-0">{cg.name.charAt(0).toUpperCase()}</div>
                          <div>
                            <div className="text-xl font-bold text-gray-800">{cg.name}</div>
                            <div className="text-indigo-500">{cg.role}</div>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          {cg.mobile && <a href={`tel:${cg.mobile}`} className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 active:scale-95 text-white font-bold text-lg rounded-2xl py-4 transition-all"><span>📱</span><span>Mobile</span></a>}
                          {cg.phone && <a href={`tel:${cg.phone}`} className="flex-1 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 active:scale-95 text-white font-bold text-lg rounded-2xl py-4 transition-all"><span>📞</span><span>Fixe</span></a>}
                          {!cg.mobile && !cg.phone && <div className="flex-1 text-center text-gray-400 py-4">Pas de numéro</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* SOCIÉTÉ — bottom on mobile (order 3), left on desktop (order 1) */}
            <div className="lg:order-1 lg:col-span-1">
              {hasCompany && (
                <section className="bg-white rounded-3xl p-6 shadow-sm border-2 border-gray-100">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Société</div>
                  <div className="text-2xl font-bold text-gray-800 mb-1">{care.company.name}</div>
                  {care.company.address && <div className="text-gray-500 text-sm mb-4">📍 {care.company.address}{care.company.city ? `, ${care.company.city}` : ''}</div>}
                  <div className="flex gap-2">
                    {care.company.mobile && <a href={`tel:${care.company.mobile}`} className="flex-1 flex items-center justify-center gap-1.5 bg-green-500 hover:bg-green-600 active:scale-95 text-white font-semibold text-sm rounded-xl py-2.5 transition-all"><span>📱</span><span>Mobile</span></a>}
                    {care.company.phone && <a href={`tel:${care.company.phone}`} className="flex-1 flex items-center justify-center gap-1.5 bg-blue-500 hover:bg-blue-600 active:scale-95 text-white font-semibold text-sm rounded-xl py-2.5 transition-all"><span>📞</span><span>Fixe</span></a>}
                  </div>
                  {care.company.email && (
                    <a href={`mailto:${care.company.email}`} className="mt-2 flex items-center justify-center gap-1.5 w-full bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white font-semibold text-sm rounded-xl py-2.5 transition-all">
                      <span>✉️</span><span>E-mail</span>
                    </a>
                  )}
                </section>
              )}
            </div>

          </div>
        </>
      )}
      {/* Alert absence bottom sheet */}
      {alertAppt && (() => {
        const name = getCaregiverName(alertAppt)
        const d = new Date(alertAppt.date + 'T00:00:00')
        const dateShort = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
        const subject = encodeURIComponent(`Intervention de ${name} ce ${dateShort} à ${alertAppt.time}`)

        const closeSheet = () => { setAlertAppt(null); setAlertStep('contact'); setFreeText('') }

        const sendEmail = (message: string) => {
          const body = encodeURIComponent(`Bonjour,\n\n${message}\n\nIntervenant(e) : ${name}\nDate : ${dateShort} à ${alertAppt.time}${alertAppt.endTime ? ` → ${alertAppt.endTime}` : ''}\n\nCordialement`)
          window.location.href = `mailto:${care.company.email}?subject=${subject}&body=${body}`
        }

        return (
          <div className="fixed inset-0 z-[60] flex flex-col justify-end">
            <div className="absolute inset-0 bg-black/30" onClick={closeSheet} />
            <div className="relative bg-white rounded-t-3xl p-6 shadow-2xl max-w-2xl w-full mx-auto">

              {/* Header */}
              <div className="text-center mb-5">
                <div className="text-4xl mb-2">🔔</div>
                <h2 className="text-xl font-bold text-gray-800">Signaler une absence</h2>
                <p className="text-gray-500 mt-1 text-sm">
                  <span className="font-semibold text-gray-700">{name}</span> — {dateShort} à {alertAppt.time}{alertAppt.endTime ? ` → ${alertAppt.endTime}` : ''}
                </p>
              </div>

              {/* Étape 1 : choisir contact ou email */}
              {alertStep === 'contact' && (
                <div className="space-y-3">
                  {care.company.phone && (
                    <a href={`tel:${care.company.phone}`} className="flex items-center gap-4 bg-blue-50 border-2 border-blue-100 rounded-2xl p-4 active:scale-95 transition-all">
                      <span className="text-3xl">📞</span>
                      <div>
                        <div className="font-bold text-blue-700">Appeler {care.company.name || 'la société'}</div>
                        <div className="text-sm text-blue-500">{care.company.phone}</div>
                      </div>
                    </a>
                  )}
                  {care.company.mobile && (
                    <a href={`tel:${care.company.mobile}`} className="flex items-center gap-4 bg-green-50 border-2 border-green-100 rounded-2xl p-4 active:scale-95 transition-all">
                      <span className="text-3xl">📱</span>
                      <div>
                        <div className="font-bold text-green-700">Mobile {care.company.name || 'la société'}</div>
                        <div className="text-sm text-green-500">{care.company.mobile}</div>
                      </div>
                    </a>
                  )}
                  {care.company.email && (
                    <button onClick={() => setAlertStep('email')} className="w-full flex items-center gap-4 bg-indigo-50 border-2 border-indigo-100 rounded-2xl p-4 active:scale-95 transition-all text-left">
                      <span className="text-3xl">✉️</span>
                      <div>
                        <div className="font-bold text-indigo-700">Envoyer un e-mail</div>
                        <div className="text-sm text-indigo-400">Choisir ou rédiger un message</div>
                      </div>
                      <span className="ml-auto text-indigo-300 text-xl">›</span>
                    </button>
                  )}
                  {!care.company.phone && !care.company.mobile && !care.company.email && (
                    <p className="text-center text-gray-400 py-4">Aucun contact configuré pour la société</p>
                  )}
                  <button onClick={closeSheet} className="w-full py-4 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold text-lg active:scale-95 transition-all">Fermer</button>
                </div>
              )}

              {/* Étape 2 : choisir le message */}
              {alertStep === 'email' && (
                <div className="space-y-3">
                  <button onClick={() => setAlertStep('contact')} className="text-indigo-500 text-sm font-semibold flex items-center gap-1 mb-1">‹ Retour</button>
                  <p className="text-sm font-semibold text-gray-500 mb-2">Choisir un message ou en saisir un :</p>

                  {/* Template messages */}
                  <div className="space-y-2 max-h-52 overflow-y-auto">
                    {alertMessages.map((msg, i) => (
                      <button key={i} onClick={() => sendEmail(msg)}
                        className="w-full text-left bg-gray-50 border-2 border-gray-100 hover:border-indigo-300 hover:bg-indigo-50 rounded-2xl p-4 text-gray-700 text-sm active:scale-95 transition-all">
                        {msg}
                      </button>
                    ))}
                  </div>

                  {/* Free text */}
                  <div className="border-t border-gray-100 pt-3">
                    <textarea
                      rows={3}
                      className="w-full border-2 border-gray-200 rounded-2xl p-3 text-gray-700 focus:outline-none focus:border-indigo-400 resize-none text-sm"
                      placeholder="Ou écris ton propre message..."
                      value={freeText}
                      onChange={e => setFreeText(e.target.value)}
                    />
                    <button
                      onClick={() => sendEmail(freeText)}
                      disabled={!freeText.trim()}
                      className="w-full py-4 rounded-2xl bg-indigo-500 disabled:bg-gray-200 text-white font-bold text-lg active:scale-95 transition-all mt-2">
                      Envoyer
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      <BackBar />
    </main>
  )
}
