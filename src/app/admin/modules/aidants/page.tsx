'use client'
import BackBar from '@/components/BackBar'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { CareData, Caregiver, CareAppointment } from '@/types'
import { loadCareData, saveCareData, EMPTY_CARE_DATA } from '@/lib/careService'
import { loadAlertMessages, saveAlertMessages } from '@/lib/alertMessagesService'
import { useAuth } from '@/lib/authContext'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'

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

export default function AidantsAdminPage() {
  const router = useRouter()
  const { activeUserId } = useAuth()
  const [care, setCare] = useState<CareData>(EMPTY_CARE_DATA)
  const [loading, setLoading] = useState(true)
  const [weekOffset, setWeekOffset] = useState(0)
  const [newCg, setNewCg] = useState<Partial<Caregiver>>({})
  const [showCgForm, setShowCgForm] = useState(false)
  const [editAppt, setEditAppt] = useState<Partial<CareAppointment> | null>(null)
  const [showApptForm, setShowApptForm] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfResult, setPdfResult] = useState<{ count: number; error?: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'planning' | 'company' | 'caregivers' | 'messages'>('planning')
  const [alertMessages, setAlertMessages] = useState<string[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [calendarToken, setCalendarToken] = useState<string | null>(null)
  const [calendarCopied, setCalendarCopied] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!activeUserId) return
    loadCareData(activeUserId).then(d => { setCare(d); setLoading(false) })
    loadAlertMessages().then(setAlertMessages)
    if (isSupabaseConfigured) {
      getSupabase()!.from('user_profile').select('calendar_token').eq('id', activeUserId).maybeSingle()
        .then(({ data }) => { if (data?.calendar_token) setCalendarToken(data.calendar_token as string) })
    }
  }, [activeUserId])

  const generateCalendarToken = async () => {
    if (!activeUserId || !isSupabaseConfigured) return
    const token = crypto.randomUUID()
    await getSupabase()!.from('user_profile').update({ calendar_token: token }).eq('id', activeUserId)
    setCalendarToken(token)
    setCalendarCopied(false)
  }

  const calendarURL = calendarToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/api/calendar/${calendarToken}`
    : ''
  const webcalURL = calendarURL.replace(/^https?/, 'webcal')

  const save = async (updated: CareData) => {
    setCare(updated)
    if (activeUserId) await saveCareData(updated, activeUserId)
  }

  const weekDates = getWeekDates(weekOffset)
  const today = new Date().toISOString().slice(0, 10)

  const getAppts = (date: string) =>
    (care.appointments || []).filter(a => a.date === date).sort((a, b) => a.time.localeCompare(b.time))

  const addAppointment = () => {
    if (!editAppt?.date || !editAppt?.time) return
    const appt: CareAppointment = {
      id: Date.now().toString(),
      date: editAppt.date,
      time: editAppt.time,
      endTime: editAppt.endTime,
      caregiverId: editAppt.caregiverId,
      caregiverName: editAppt.caregiverName,
      notes: editAppt.notes,
      status: 'planned',
    }
    save({ ...care, appointments: [...(care.appointments || []), appt] })
    setEditAppt(null)
    setShowApptForm(false)
  }

  const updateApptStatus = (id: string, status: CareAppointment['status'], modifiedNote?: string) => {
    const updated = (care.appointments || []).map(a =>
      a.id === id ? { ...a, status, modifiedNote } : a
    )
    save({ ...care, appointments: updated })
  }

  const deleteAppt = (id: string) => {
    save({ ...care, appointments: (care.appointments || []).filter(a => a.id !== id) })
  }

  const addCaregiver = () => {
    if (!newCg.name) return
    const cg: Caregiver = { id: Date.now().toString(), name: newCg.name, role: newCg.role || '', mobile: newCg.mobile, phone: newCg.phone }
    save({ ...care, caregivers: [...care.caregivers, cg] })
    setNewCg({})
    setShowCgForm(false)
  }

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPdfLoading(true)
    setPdfResult(null)
    try {
      const fd = new FormData()
      fd.append('pdf', file)
      const res = await fetch('/api/parse-planning', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.error && !data.appointments?.length) {
        setPdfResult({ count: 0, error: data.error })
      } else {
        const incoming = data.appointments || []
        // Detect the month(s) covered by the PDF
        const importedMonths = new Set(incoming.map((a: { date?: string }) => (a.date || '').slice(0, 7)))

        const newAppts: CareAppointment[] = incoming.map((a: Partial<CareAppointment>) => {
          // Preserve existing annotation if same date+time
          const existing = (care.appointments || []).find(e => e.date === a.date && e.time === a.time)
          return {
            id: existing?.id || (Date.now().toString() + Math.random()),
            date: a.date || today,
            time: a.time || '08:00',
            endTime: a.endTime,
            caregiverName: a.caregiverName,
            notes: a.notes,
            status: existing?.status ?? 'planned',
            modifiedNote: existing?.modifiedNote,
          }
        })

        // Keep appointments from other months untouched
        const otherMonths = (care.appointments || []).filter(a => !importedMonths.has(a.date.slice(0, 7)))
        save({ ...care, appointments: [...otherMonths, ...newAppts] })
        setPdfResult({ count: newAppts.length })
      }
    } catch {
      setPdfResult({ count: 0, error: 'Erreur réseau' })
    } finally {
      setPdfLoading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const input = "w-full border border-gray-200 rounded-xl p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="text-xl text-gray-400">Chargement...</div></div>

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto pb-28">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all text-gray-600 font-bold text-lg">←</button>
        <h1 className="text-2xl font-bold text-gray-800">Mes aidants</h1>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-4 gap-1 mb-6 bg-gray-100 rounded-2xl p-1">
        {([['planning', '📅 Planning'], ['company', '🏢 Société'], ['caregivers', '👩‍⚕️ Intervenants'], ['messages', '💬 Messages']] as const).map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`py-2.5 rounded-xl text-xs font-semibold transition-all ${activeTab === tab ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── PLANNING TAB ── */}
      {activeTab === 'planning' && (
        <div className="space-y-5">

          {/* PDF import */}
          <section className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-5">
            <h2 className="text-base font-bold text-indigo-700 mb-1">📄 Importer un planning PDF</h2>
            <p className="text-sm text-indigo-600 mb-4">Sélectionne le PDF de planning mensuel — les passages seront extraits automatiquement.</p>
            <input ref={fileRef} type="file" accept="application/pdf" onChange={handlePdfUpload} className="hidden" />
            <button onClick={() => fileRef.current?.click()} disabled={pdfLoading}
              className="w-full py-3 rounded-xl bg-indigo-500 text-white font-bold hover:bg-indigo-600 active:scale-95 transition-all disabled:opacity-50">
              {pdfLoading ? '⏳ Analyse en cours...' : '📂 Choisir un fichier PDF'}
            </button>
            {pdfResult && (
              <div className={`mt-3 p-3 rounded-xl text-sm font-medium ${pdfResult.error ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                {pdfResult.error ? `❌ ${pdfResult.error}` : `✅ ${pdfResult.count} passage(s) importé(s)`}
              </div>
            )}
          </section>

          {/* iCal export */}
          <section className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-5">
            <h2 className="text-base font-bold text-gray-700 mb-1">📲 Abonnement calendrier iCal</h2>
            <p className="text-sm text-gray-500 mb-4">Abonnez-vous depuis votre iPhone pour que le planning se synchronise automatiquement.</p>
            {calendarToken ? (
              <div className="space-y-3">
                <div className="bg-white rounded-xl p-3 text-xs text-gray-500 font-mono break-all border border-gray-200">
                  {calendarURL}
                </div>
                <div className="flex gap-2">
                  <a href={webcalURL}
                    className="flex-1 py-3 rounded-xl bg-gray-800 text-white font-bold text-center text-sm active:scale-95 transition-all">
                    📲 Ouvrir sur iPhone
                  </a>
                  <button
                    onClick={() => { navigator.clipboard.writeText(calendarURL); setCalendarCopied(true); setTimeout(() => setCalendarCopied(false), 2000) }}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm active:scale-95 transition-all ${calendarCopied ? 'bg-green-500 text-white' : 'bg-white border-2 border-gray-200 text-gray-600'}`}>
                    {calendarCopied ? '✓ Copié !' : 'Copier le lien'}
                  </button>
                  <button onClick={generateCalendarToken}
                    className="px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-500 text-sm active:scale-95 transition-all"
                    title="Révoquer et régénérer">
                    🔄
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={generateCalendarToken}
                className="w-full py-3 rounded-xl bg-gray-800 text-white font-bold active:scale-95 transition-all">
                Générer le lien d&apos;abonnement
              </button>
            )}
          </section>

          {/* Clear planning */}
          {care.appointments.length > 0 && (() => {
            const months = [...new Set(care.appointments.map(a => a.date.slice(0, 7)))].sort()
            const monthLabel = (m: string) => new Date(m + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
            return (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
                <p className="text-sm font-semibold text-red-600">🗑️ Supprimer des rendez-vous</p>
                <div className="flex gap-2">
                  <select
                    id="clear-month"
                    defaultValue=""
                    className="flex-1 py-2 px-3 rounded-xl border border-red-200 bg-white text-sm text-gray-700 focus:outline-none">
                    <option value="" disabled>Choisir un mois…</option>
                    <option value="all">Tous les mois ({care.appointments.length})</option>
                    {months.map(m => {
                      const count = care.appointments.filter(a => a.date.startsWith(m)).length
                      return <option key={m} value={m}>{monthLabel(m)} ({count})</option>
                    })}
                  </select>
                  <button
                    onClick={async () => {
                      const sel = (document.getElementById('clear-month') as HTMLSelectElement).value
                      if (!sel) return
                      const label = sel === 'all' ? 'tout le planning' : monthLabel(sel)
                      if (!confirm(`Supprimer ${label} ?`)) return
                      const kept = sel === 'all' ? [] : care.appointments.filter(a => !a.date.startsWith(sel))
                      await save({ ...care, appointments: kept })
                    }}
                    className="px-4 py-2 rounded-xl bg-red-500 text-white font-semibold text-sm active:scale-95 transition-all">
                    Supprimer
                  </button>
                </div>
              </div>
            )
          })()}

          {/* Week navigation */}
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-700">Passages</h2>
            <div className="flex gap-2">
              <button onClick={() => setWeekOffset(w => w - 1)} className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 active:scale-95 text-sm">← Préc.</button>
              <button onClick={() => setWeekOffset(0)} className={`px-3 py-1.5 rounded-xl border text-sm font-medium ${weekOffset === 0 ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white border-gray-200 text-gray-600'}`}>Cette sem.</button>
              <button onClick={() => setWeekOffset(w => w + 1)} className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 active:scale-95 text-sm">Suiv. →</button>
            </div>
          </div>

          {/* Week days */}
          <div className="space-y-2">
            {weekDates.map(date => {
              const appts = getAppts(date)
              const d = new Date(date + 'T00:00:00')
              const isToday = date === today
              return (
                <div key={date} className={`bg-white rounded-2xl p-4 border-2 ${isToday ? 'border-indigo-200 bg-indigo-50' : 'border-gray-100'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`font-semibold text-sm ${isToday ? 'text-indigo-600' : 'text-gray-600'}`}>
                      {DAYS_SHORT[d.getDay()]} {d.getDate()}/{d.getMonth()+1}{isToday ? ' — Aujourd\'hui' : ''}
                    </div>
                    <button onClick={() => { setEditAppt({ date, status: 'planned' }); setShowApptForm(true) }}
                      className="text-xs text-indigo-500 hover:text-indigo-700 font-medium">+ Ajouter</button>
                  </div>
                  {appts.length === 0 ? (
                    <div className="text-gray-300 text-sm">Aucun passage</div>
                  ) : (
                    <div className="space-y-2">
                      {appts.map(a => {
                        const cgName = a.caregiverId ? care.caregivers.find(c => c.id === a.caregiverId)?.name : a.caregiverName
                        return (
                          <div key={a.id} className={`flex items-start gap-2 p-2 rounded-xl ${a.status === 'cancelled' ? 'bg-red-50' : a.status === 'modified' ? 'bg-orange-50' : 'bg-gray-50'}`}>
                            <div className="text-sm font-bold text-indigo-500 w-12 shrink-0">{a.time}</div>
                            <div className="flex-1 min-w-0">
                              <div className={`text-sm font-medium ${a.status === 'cancelled' ? 'line-through text-gray-400' : 'text-gray-700'}`}>{cgName || '—'}</div>
                              {a.notes && <div className="text-xs text-gray-400">{a.notes}</div>}
                              {a.status !== 'planned' && (
                                <div className={`text-xs font-medium mt-0.5 ${a.status === 'cancelled' ? 'text-red-500' : 'text-orange-500'}`}>
                                  {a.status === 'cancelled' ? '✕ Annulé' : '⚠️ Modifié'}{a.modifiedNote ? ` — ${a.modifiedNote}` : ''}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-1 shrink-0">
                              {a.status === 'planned' && (
                                <>
                                  <button onClick={() => { const note = prompt('Note de modification (optionnel):') ?? undefined; updateApptStatus(a.id, 'modified', note) }}
                                    className="text-xs px-2 py-1 rounded-lg bg-orange-100 text-orange-600 hover:bg-orange-200">⚠️</button>
                                  <button onClick={() => { if (confirm('Annuler ce passage ?')) updateApptStatus(a.id, 'cancelled') }}
                                    className="text-xs px-2 py-1 rounded-lg bg-red-100 text-red-500 hover:bg-red-200">✕</button>
                                </>
                              )}
                              {a.status !== 'planned' && (
                                <button onClick={() => updateApptStatus(a.id, 'planned', undefined)}
                                  className="text-xs px-2 py-1 rounded-lg bg-green-100 text-green-600 hover:bg-green-200">↩</button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Add appointment modal */}
          {showApptForm && editAppt && (
            <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50 p-4">
              <div className="bg-white rounded-3xl p-6 w-full max-w-lg space-y-3">
                <h3 className="text-lg font-bold text-gray-800">Ajouter un passage</h3>
                <div><label className="block text-sm text-gray-500 mb-1">Date</label>
                  <input type="date" className={input} value={editAppt.date || ''} onChange={e => setEditAppt(p => ({ ...p, date: e.target.value }))} /></div>
                <div className="flex gap-3">
                  <div className="flex-1"><label className="block text-sm text-gray-500 mb-1">Heure début</label>
                    <input type="time" className={input} value={editAppt.time || ''} onChange={e => setEditAppt(p => ({ ...p, time: e.target.value }))} /></div>
                  <div className="flex-1"><label className="block text-sm text-gray-500 mb-1">Heure fin</label>
                    <input type="time" className={input} value={editAppt.endTime || ''} onChange={e => setEditAppt(p => ({ ...p, endTime: e.target.value }))} /></div>
                </div>
                {care.caregivers.length > 0 ? (
                  <div><label className="block text-sm text-gray-500 mb-1">Intervenant</label>
                    <select className={input} value={editAppt.caregiverId || ''} onChange={e => setEditAppt(p => ({ ...p, caregiverId: e.target.value || undefined }))}>
                      <option value="">Non précisé</option>
                      {care.caregivers.map(cg => <option key={cg.id} value={cg.id}>{cg.name} — {cg.role}</option>)}
                    </select></div>
                ) : (
                  <div><label className="block text-sm text-gray-500 mb-1">Nom intervenant</label>
                    <input className={input} placeholder="Sophie, Marc..." value={editAppt.caregiverName || ''} onChange={e => setEditAppt(p => ({ ...p, caregiverName: e.target.value }))} /></div>
                )}
                <div><label className="block text-sm text-gray-500 mb-1">Notes (optionnel)</label>
                  <input className={input} placeholder="Toilette, repas..." value={editAppt.notes || ''} onChange={e => setEditAppt(p => ({ ...p, notes: e.target.value }))} /></div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => { setShowApptForm(false); setEditAppt(null) }} className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-600">Annuler</button>
                  <button onClick={addAppointment} disabled={!editAppt.date || !editAppt.time} className="flex-1 py-3 rounded-xl bg-indigo-500 text-white font-bold disabled:opacity-40">Ajouter</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── COMPANY TAB ── */}
      {activeTab === 'company' && (
        <section className="bg-white rounded-2xl p-6 shadow-sm space-y-3">
          <div><label className="block text-sm text-gray-500 mb-1">Nom de la société</label><input className={input} value={care.company.name} onChange={e => save({ ...care, company: { ...care.company, name: e.target.value } })} placeholder="Nom de la société..." /></div>
          <div><label className="block text-sm text-gray-500 mb-1">Téléphone fixe</label><input className={input} type="tel" value={care.company.phone || ''} onChange={e => save({ ...care, company: { ...care.company, phone: e.target.value } })} /></div>
          <div><label className="block text-sm text-gray-500 mb-1">Mobile</label><input className={input} type="tel" value={care.company.mobile || ''} onChange={e => save({ ...care, company: { ...care.company, mobile: e.target.value } })} /></div>
          <div><label className="block text-sm text-gray-500 mb-1">Adresse</label><input className={input} value={care.company.address || ''} onChange={e => save({ ...care, company: { ...care.company, address: e.target.value } })} /></div>
          <div><label className="block text-sm text-gray-500 mb-1">Ville</label><input className={input} value={care.company.city || ''} onChange={e => save({ ...care, company: { ...care.company, city: e.target.value } })} /></div>
          <div><label className="block text-sm text-gray-500 mb-1">E-mail</label><input className={input} type="email" value={care.company.email || ''} onChange={e => save({ ...care, company: { ...care.company, email: e.target.value } })} placeholder="contact@societe.fr" /></div>
        </section>
      )}

      {/* ── MESSAGES TAB ── */}
      {activeTab === 'messages' && (
        <section className="space-y-4">
          <p className="text-sm text-gray-500">Ces phrases apparaissent quand Quentin appuie sur 🔔 pour signaler une absence. Il peut aussi saisir un message libre.</p>
          <div className="space-y-2">
            {alertMessages.map((msg, i) => (
              <div key={i} className="flex items-start gap-3 bg-white rounded-2xl p-4 border-2 border-gray-100">
                <p className="flex-1 text-gray-700 text-sm">{msg}</p>
                <button onClick={async () => {
                  const next = alertMessages.filter((_, j) => j !== i)
                  setAlertMessages(next)
                  await saveAlertMessages(next)
                }} className="text-red-400 hover:text-red-600 shrink-0 text-lg">✕</button>
              </div>
            ))}
          </div>
          <div className="bg-indigo-50 rounded-2xl p-4 space-y-3">
            <textarea
              className="w-full border border-gray-200 rounded-xl p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white resize-none"
              rows={3}
              placeholder="Nouvelle phrase type..."
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
            />
            <button
              onClick={async () => {
                if (!newMessage.trim()) return
                const next = [...alertMessages, newMessage.trim()]
                setAlertMessages(next)
                await saveAlertMessages(next)
                setNewMessage('')
              }}
              disabled={!newMessage.trim()}
              className="w-full py-3 rounded-xl bg-indigo-500 text-white font-bold disabled:opacity-40">
              + Ajouter ce message
            </button>
          </div>
        </section>
      )}

      {/* ── CAREGIVERS TAB ── */}
      {activeTab === 'caregivers' && (
        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="space-y-2 mb-4">
            {care.caregivers.map(cg => (
              <div key={cg.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50">
                <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-500 text-sm shrink-0">{cg.name.charAt(0)}</div>
                <div className="flex-1">
                  <div className="font-medium text-gray-700">{cg.name}</div>
                  <div className="text-sm text-gray-400">{cg.role}{cg.mobile ? ` · ${cg.mobile}` : ''}</div>
                </div>
                <button onClick={() => save({ ...care, caregivers: care.caregivers.filter(c => c.id !== cg.id) })} className="text-red-400 hover:text-red-600">✕</button>
              </div>
            ))}
          </div>
          {showCgForm ? (
            <div className="bg-indigo-50 rounded-xl p-4 space-y-2">
              <input className={input} placeholder="Prénom Nom *" value={newCg.name || ''} onChange={e => setNewCg(p => ({ ...p, name: e.target.value }))} />
              <input className={input} placeholder="Rôle (ex: Auxiliaire de vie)" value={newCg.role || ''} onChange={e => setNewCg(p => ({ ...p, role: e.target.value }))} />
              <input className={input} type="tel" placeholder="Mobile" value={newCg.mobile || ''} onChange={e => setNewCg(p => ({ ...p, mobile: e.target.value }))} />
              <input className={input} type="tel" placeholder="Fixe" value={newCg.phone || ''} onChange={e => setNewCg(p => ({ ...p, phone: e.target.value }))} />
              <div className="flex gap-2">
                <button onClick={() => { setShowCgForm(false); setNewCg({}) }} className="flex-1 py-2 rounded-xl border border-gray-300 text-gray-600">Annuler</button>
                <button onClick={addCaregiver} disabled={!newCg.name} className="flex-1 py-2 rounded-xl bg-indigo-500 text-white font-semibold disabled:opacity-40">Ajouter</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowCgForm(true)} className="w-full py-3 rounded-xl border-2 border-dashed border-indigo-300 text-indigo-500 hover:bg-indigo-50">+ Ajouter un intervenant</button>
          )}
        </section>
      )}
      <BackBar />
    </main>
  )
}
