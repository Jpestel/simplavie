'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CareData, CareAppointment } from '@/types'
import { loadCareData, EMPTY_CARE_DATA } from '@/lib/careService'

const DAYS_FULL = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const DAYS_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

function getWeekDates(offset: number = 0): string[] {
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

export default function AidantsPage() {
  const router = useRouter()
  const [care, setCare] = useState<CareData>(EMPTY_CARE_DATA)
  const [loading, setLoading] = useState(true)
  const [weekOffset, setWeekOffset] = useState(0)
  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    loadCareData().then(d => { setCare(d); setLoading(false) })
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-2xl text-gray-400">Chargement...</div>
    </div>
  )

  const weekDates = getWeekDates(weekOffset)
  const hasCompany = care.company.name.trim().length > 0

  const getAppt = (date: string): CareAppointment[] =>
    (care.appointments || [])
      .filter(a => a.date === date)
      .sort((a, b) => a.time.localeCompare(b.time))

  const todayAppts = getAppt(today)
  const hasAlert = todayAppts.some(a => a.status === 'modified' || a.status === 'cancelled')

  const getCaregiverName = (appt: CareAppointment) => {
    if (appt.caregiverId) {
      const cg = care.caregivers.find(c => c.id === appt.caregiverId)
      if (cg) return cg.name
    }
    return appt.caregiverName || 'Intervenant'
  }

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.push('/')} className="text-3xl text-gray-400 hover:text-gray-600 active:scale-95 transition-all">←</button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Mes aidants</h1>
          <p className="text-gray-400">{DAYS_FULL[new Date().getDay()]} {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</p>
        </div>
      </div>

      {!hasCompany && (care.appointments || []).length === 0 && care.caregivers.length === 0 ? (
        <div className="text-center mt-20 text-gray-400">
          <div className="text-5xl mb-4">🤝</div>
          <p className="text-xl">Aucun aidant enregistré</p>
          <p className="mt-2 text-sm">Demande à ton parent de configurer ce module.</p>
        </div>
      ) : (
        <div className="space-y-5">

          {/* Alert for today */}
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

          {/* Today's appointments */}
          {todayAppts.length > 0 && (
            <section className="bg-indigo-50 border-2 border-indigo-200 rounded-3xl p-5">
              <h2 className="text-lg font-bold text-indigo-700 mb-3">📅 Aujourd&apos;hui</h2>
              <div className="space-y-2">
                {todayAppts.map(appt => (
                  <div key={appt.id} className={`flex items-center gap-3 bg-white rounded-2xl p-3 ${appt.status === 'cancelled' ? 'opacity-50' : ''}`}>
                    <div className="text-2xl font-bold text-indigo-500 w-16 text-center shrink-0">{appt.time}</div>
                    <div className="flex-1">
                      <div className={`font-semibold text-gray-800 ${appt.status === 'cancelled' ? 'line-through' : ''}`}>{getCaregiverName(appt)}</div>
                      {appt.notes && <div className="text-sm text-gray-500">{appt.notes}</div>}
                      {appt.status === 'modified' && appt.modifiedNote && <div className="text-sm text-orange-600 font-medium">→ {appt.modifiedNote}</div>}
                      {appt.status === 'cancelled' && <div className="text-sm text-red-500">Annulé</div>}
                    </div>
                    {appt.endTime && <div className="text-sm text-gray-400 shrink-0">→ {appt.endTime}</div>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Company card */}
          {hasCompany && (
            <section className="bg-white rounded-3xl p-6 shadow-sm border-2 border-gray-100">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Société</div>
              <div className="text-2xl font-bold text-gray-800 mb-1">{care.company.name}</div>
              {care.company.address && <div className="text-gray-500 text-sm mb-4">📍 {care.company.address}{care.company.city ? `, ${care.company.city}` : ''}</div>}
              <div className="flex gap-3">
                {care.company.mobile && (
                  <a href={`tel:${care.company.mobile}`} className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 active:scale-95 text-white font-bold text-xl rounded-2xl py-4 transition-all">
                    <span>📱</span><span>Mobile</span>
                  </a>
                )}
                {care.company.phone && (
                  <a href={`tel:${care.company.phone}`} className="flex-1 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 active:scale-95 text-white font-bold text-xl rounded-2xl py-4 transition-all">
                    <span>📞</span><span>Fixe</span>
                  </a>
                )}
              </div>
            </section>
          )}

          {/* Weekly schedule */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-700">Planning</h2>
              <div className="flex gap-2">
                <button onClick={() => setWeekOffset(w => w - 1)} className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 active:scale-95">←</button>
                <button onClick={() => setWeekOffset(0)} className={`px-3 py-1.5 rounded-xl border text-sm font-medium active:scale-95 ${weekOffset === 0 ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>Cette semaine</button>
                <button onClick={() => setWeekOffset(w => w + 1)} className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 active:scale-95">→</button>
              </div>
            </div>
            <div className="bg-white rounded-3xl shadow-sm border-2 border-gray-100 overflow-hidden">
              {weekDates.map((date) => {
                const appts = getAppt(date)
                const isToday = date === today
                const d = new Date(date + 'T00:00:00')
                return (
                  <div key={date} className={`flex gap-3 p-4 border-b border-gray-50 last:border-0 ${isToday ? 'bg-indigo-50' : ''}`}>
                    <div className="w-14 shrink-0">
                      <div className={`text-sm font-bold ${isToday ? 'text-indigo-600' : 'text-gray-400'}`}>{DAYS_SHORT[d.getDay()]}</div>
                      <div className={`text-xs ${isToday ? 'text-indigo-400' : 'text-gray-300'}`}>{d.getDate()}/{d.getMonth()+1}</div>
                    </div>
                    <div className="flex-1">
                      {appts.length === 0 ? (
                        <span className="text-gray-300 text-sm">—</span>
                      ) : (
                        <div className="space-y-1">
                          {appts.map(a => (
                            <div key={a.id} className={`flex items-center gap-2 ${a.status === 'cancelled' ? 'opacity-40' : ''}`}>
                              <span className={`text-sm font-semibold ${a.status === 'cancelled' ? 'line-through text-gray-400' : isToday ? 'text-indigo-600' : 'text-gray-700'}`}>{a.time}</span>
                              <span className={`text-sm ${a.status === 'cancelled' ? 'line-through text-gray-400' : 'text-gray-500'}`}>{getCaregiverName(a)}</span>
                              {a.status === 'modified' && <span className="text-xs text-orange-500">⚠️</span>}
                              {a.status === 'cancelled' && <span className="text-xs text-red-400">✕</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

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
    </main>
  )
}
