'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CareData } from '@/types'
import { loadCareData, EMPTY_CARE_DATA } from '@/lib/careService'

const DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
const DAYS_FULL = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

export default function AidantsPage() {
  const router = useRouter()
  const [care, setCare] = useState<CareData>(EMPTY_CARE_DATA)
  const [loading, setLoading] = useState(true)
  const today = new Date().getDay()

  useEffect(() => {
    loadCareData().then(d => { setCare(d); setLoading(false) })
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-2xl text-gray-400">Chargement...</div>
    </div>
  )

  const hasCompany = care.company.name.trim().length > 0
  const todayVisits = care.visits.filter(v => v.days.includes(today)).sort((a, b) => a.time.localeCompare(b.time))

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.push('/')} className="text-3xl text-gray-400 hover:text-gray-600 active:scale-95 transition-all">←</button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Mes aidants</h1>
          <p className="text-gray-400">{DAYS_FULL[today]}</p>
        </div>
      </div>

      {!hasCompany && care.caregivers.length === 0 ? (
        <div className="text-center mt-20 text-gray-400">
          <div className="text-5xl mb-4">🤝</div>
          <p className="text-xl">Aucun aidant enregistré</p>
          <p className="mt-2 text-sm">Demande à ton aidant de configurer ce module.</p>
        </div>
      ) : (
        <div className="space-y-5">

          {/* Today's visits highlight */}
          {todayVisits.length > 0 && (
            <section className="bg-indigo-50 border-2 border-indigo-200 rounded-3xl p-5">
              <h2 className="text-lg font-bold text-indigo-700 mb-3">📅 Aujourd&apos;hui</h2>
              <div className="space-y-2">
                {todayVisits.map(visit => {
                  const cg = care.caregivers.find(c => c.id === visit.caregiverId)
                  return (
                    <div key={visit.id} className="flex items-center gap-3 bg-white rounded-2xl p-3">
                      <div className="text-2xl font-bold text-indigo-500 w-16 text-center">{visit.time}</div>
                      <div>
                        <div className="font-semibold text-gray-800">{cg ? cg.name : 'Intervenant'}</div>
                        {cg && <div className="text-sm text-gray-500">{cg.role}</div>}
                        {visit.notes && <div className="text-sm text-gray-400">{visit.notes}</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Company card */}
          {hasCompany && (
            <section className="bg-white rounded-3xl p-6 shadow-sm border-2 border-gray-100">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Société</h2>
              <div className="text-2xl font-bold text-gray-800 mb-1">{care.company.name}</div>
              {care.company.address && (
                <div className="text-gray-500 text-sm mb-4">📍 {care.company.address}{care.company.city ? `, ${care.company.city}` : ''}</div>
              )}
              <div className="flex gap-3">
                {care.company.mobile && (
                  <a href={`tel:${care.company.mobile}`}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 active:scale-95 text-white font-bold text-xl rounded-2xl py-4 transition-all">
                    <span>📱</span><span>Mobile</span>
                  </a>
                )}
                {care.company.phone && (
                  <a href={`tel:${care.company.phone}`}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 active:scale-95 text-white font-bold text-xl rounded-2xl py-4 transition-all">
                    <span>📞</span><span>Fixe</span>
                  </a>
                )}
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
                      <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-xl font-bold text-indigo-500 shrink-0">
                        {cg.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xl font-bold text-gray-800">{cg.name}</div>
                        <div className="text-indigo-500">{cg.role}</div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      {cg.mobile && (
                        <a href={`tel:${cg.mobile}`}
                          className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 active:scale-95 text-white font-bold text-lg rounded-2xl py-4 transition-all">
                          <span>📱</span><span>Mobile</span>
                        </a>
                      )}
                      {cg.phone && (
                        <a href={`tel:${cg.phone}`}
                          className="flex-1 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 active:scale-95 text-white font-bold text-lg rounded-2xl py-4 transition-all">
                          <span>📞</span><span>Fixe</span>
                        </a>
                      )}
                      {!cg.mobile && !cg.phone && (
                        <div className="flex-1 text-center text-gray-400 py-4">Pas de numéro</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Weekly schedule */}
          {care.visits.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-gray-700 mb-3">Planning de la semaine</h2>
              <div className="bg-white rounded-3xl shadow-sm border-2 border-gray-100 overflow-hidden">
                {[1,2,3,4,5,6,0].map(day => {
                  const dayVisits = care.visits.filter(v => v.days.includes(day)).sort((a,b) => a.time.localeCompare(b.time))
                  const isToday = day === today
                  return (
                    <div key={day} className={`flex gap-4 p-4 border-b border-gray-50 last:border-0 ${isToday ? 'bg-indigo-50' : ''}`}>
                      <div className={`w-12 text-sm font-bold pt-0.5 ${isToday ? 'text-indigo-600' : 'text-gray-400'}`}>
                        {DAYS[day]}
                      </div>
                      <div className="flex-1">
                        {dayVisits.length === 0 ? (
                          <span className="text-gray-300 text-sm">—</span>
                        ) : (
                          <div className="space-y-1">
                            {dayVisits.map(v => {
                              const cg = care.caregivers.find(c => c.id === v.caregiverId)
                              return (
                                <div key={v.id} className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-gray-700">{v.time}</span>
                                  {cg && <span className="text-sm text-gray-500">{cg.name}</span>}
                                  {v.notes && <span className="text-xs text-gray-400">({v.notes})</span>}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  )
}
