'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CareData, CareAppointment } from '@/types'
import { loadCareData, EMPTY_CARE_DATA } from '@/lib/careService'
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
  const [care, setCare] = useState<CareData>(EMPTY_CARE_DATA)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('semaine')
  const [offset, setOffset] = useState(0)
  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    loadCareData().then(d => { setCare(d); setLoading(false) })
  }, [])

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
    <main className="min-h-screen p-6 pb-28 max-w-2xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-800">Mes aidants</h1>
        <p className="text-gray-400">{DAYS_FULL[new Date().getDay()]} {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</p>
      </div>

      {!hasCompany && (care.appointments || []).length === 0 && care.caregivers.length === 0 ? (
        <div className="text-center mt-20 text-gray-400">
          <div className="text-5xl mb-4">🤝</div>
          <p className="text-xl">Ce module n&apos;est pas encore configuré</p>
          <p className="mt-2 text-sm">Tu peux le configurer depuis l&apos;espace famille ⚙️</p>
        </div>
      ) : (
        <div className="space-y-4">

          {/* Alert today */}
          {hasAlert && (
            <div className="bg-orange-50 border-2 border-orange-300 rounded-3xl p-5">
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

          {/* View tabs */}
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

          {/* Navigation bar */}
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

          {/* Planning */}
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
                        <div key={a.id} className={`flex items-center gap-2 flex-wrap ${a.status === 'cancelled' ? 'opacity-40' : ''}`}>
                          <span className={`text-sm font-semibold ${a.status === 'cancelled' ? 'line-through text-gray-400' : isToday ? 'text-indigo-600' : 'text-gray-700'}`}>
                            {a.time}{a.endTime ? ` → ${a.endTime}` : ''}
                          </span>
                          <span className={`text-sm ${a.status === 'cancelled' ? 'line-through text-gray-400' : 'text-gray-500'}`}>{getCaregiverName(a)}</span>
                          {a.status === 'modified' && <span className="text-xs text-orange-500">⚠️</span>}
                          {a.status === 'cancelled' && <span className="text-xs text-red-400">✕</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Company card */}
          {hasCompany && (
            <section className="bg-white rounded-3xl p-6 shadow-sm border-2 border-gray-100">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Société</div>
              <div className="text-2xl font-bold text-gray-800 mb-1">{care.company.name}</div>
              {care.company.address && <div className="text-gray-500 text-sm mb-4">📍 {care.company.address}{care.company.city ? `, ${care.company.city}` : ''}</div>}
              <div className="flex gap-3">
                {care.company.mobile && <a href={`tel:${care.company.mobile}`} className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 active:scale-95 text-white font-bold text-xl rounded-2xl py-4 transition-all"><span>📱</span><span>Mobile</span></a>}
                {care.company.phone && <a href={`tel:${care.company.phone}`} className="flex-1 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 active:scale-95 text-white font-bold text-xl rounded-2xl py-4 transition-all"><span>📞</span><span>Fixe</span></a>}
              </div>
            </section>
          )}

          {/* Caregivers */}
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
      )}
      <BackBar />
    </main>
  )
}
