'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CareData, Caregiver, CareVisit } from '@/types'
import { loadCareData, saveCareData, EMPTY_CARE_DATA } from '@/lib/careService'

const DAYS_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

export default function AidantsAdminPage() {
  const router = useRouter()
  const [care, setCare] = useState<CareData>(EMPTY_CARE_DATA)
  const [loading, setLoading] = useState(true)
  const [newCg, setNewCg] = useState<Partial<Caregiver>>({})
  const [showCgForm, setShowCgForm] = useState(false)
  const [newVisit, setNewVisit] = useState<Partial<CareVisit> & { days: number[] }>({ days: [], time: '08:00' })
  const [showVisitForm, setShowVisitForm] = useState(false)

  useEffect(() => { loadCareData().then(d => { setCare(d); setLoading(false) }) }, [])

  const save = async (updated: CareData) => {
    setCare(updated)
    await saveCareData(updated)
  }

  const setCompany = (field: string, value: string) => {
    save({ ...care, company: { ...care.company, [field]: value } })
  }

  const addCaregiver = () => {
    if (!newCg.name) return
    const cg: Caregiver = { id: Date.now().toString(), name: newCg.name, role: newCg.role || '', mobile: newCg.mobile, phone: newCg.phone }
    save({ ...care, caregivers: [...care.caregivers, cg] })
    setNewCg({})
    setShowCgForm(false)
  }

  const removeCaregiver = (id: string) => save({ ...care, caregivers: care.caregivers.filter(c => c.id !== id) })

  const addVisit = () => {
    if (newVisit.days.length === 0 || !newVisit.time) return
    const v: CareVisit = { id: Date.now().toString(), caregiverId: newVisit.caregiverId, days: newVisit.days, time: newVisit.time, notes: newVisit.notes }
    save({ ...care, visits: [...care.visits, v] })
    setNewVisit({ days: [], time: '08:00' })
    setShowVisitForm(false)
  }

  const removeVisit = (id: string) => save({ ...care, visits: care.visits.filter(v => v.id !== id) })

  const toggleDay = (day: number) => {
    setNewVisit(prev => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter(d => d !== day) : [...prev.days, day]
    }))
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="text-xl text-gray-400">Chargement...</div></div>

  const input = "w-full border border-gray-200 rounded-xl p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-xl">←</button>
        <h1 className="text-2xl font-bold text-gray-800">Mes aidants</h1>
      </div>

      {/* Company */}
      <section className="bg-white rounded-2xl p-6 shadow-sm mb-5 space-y-3">
        <h2 className="text-lg font-semibold text-gray-700">🏢 Société</h2>
        <div><label className="block text-sm text-gray-500 mb-1">Nom de la société</label><input className={input} value={care.company.name} onChange={e => setCompany('name', e.target.value)} placeholder="SSIAD du Havre..." /></div>
        <div><label className="block text-sm text-gray-500 mb-1">Téléphone fixe</label><input className={input} type="tel" value={care.company.phone || ''} onChange={e => setCompany('phone', e.target.value)} /></div>
        <div><label className="block text-sm text-gray-500 mb-1">Mobile</label><input className={input} type="tel" value={care.company.mobile || ''} onChange={e => setCompany('mobile', e.target.value)} /></div>
        <div><label className="block text-sm text-gray-500 mb-1">Adresse</label><input className={input} value={care.company.address || ''} onChange={e => setCompany('address', e.target.value)} /></div>
        <div><label className="block text-sm text-gray-500 mb-1">Ville</label><input className={input} value={care.company.city || ''} onChange={e => setCompany('city', e.target.value)} /></div>
      </section>

      {/* Caregivers */}
      <section className="bg-white rounded-2xl p-6 shadow-sm mb-5">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">👩‍⚕️ Intervenants</h2>
        <div className="space-y-2 mb-4">
          {care.caregivers.map(cg => (
            <div key={cg.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50">
              <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-500 text-sm shrink-0">{cg.name.charAt(0)}</div>
              <div className="flex-1">
                <div className="font-medium text-gray-700">{cg.name}</div>
                <div className="text-sm text-gray-400">{cg.role}{cg.mobile ? ` · ${cg.mobile}` : ''}</div>
              </div>
              <button onClick={() => removeCaregiver(cg.id)} className="text-red-400 hover:text-red-600">✕</button>
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

      {/* Visits / Schedule */}
      <section className="bg-white rounded-2xl p-6 shadow-sm mb-8">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">📅 Planning des passages</h2>
        <div className="space-y-2 mb-4">
          {care.visits.map(v => {
            const cg = care.caregivers.find(c => c.id === v.caregiverId)
            return (
              <div key={v.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50">
                <div className="text-sm font-bold text-indigo-500 w-12">{v.time}</div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-700">
                    {v.days.sort().map(d => DAYS_LABELS[d]).join(', ')}
                  </div>
                  {cg && <div className="text-sm text-gray-400">{cg.name}</div>}
                  {v.notes && <div className="text-xs text-gray-400">{v.notes}</div>}
                </div>
                <button onClick={() => removeVisit(v.id)} className="text-red-400 hover:text-red-600">✕</button>
              </div>
            )
          })}
        </div>
        {showVisitForm ? (
          <div className="bg-indigo-50 rounded-xl p-4 space-y-3">
            <div>
              <div className="text-sm text-gray-600 mb-2">Jours de passage *</div>
              <div className="flex gap-2 flex-wrap">
                {[1,2,3,4,5,6,0].map(d => (
                  <button key={d} onClick={() => toggleDay(d)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${newVisit.days.includes(d) ? 'bg-indigo-500 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
                    {DAYS_LABELS[d]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Heure *</div>
              <input type="time" className={input} value={newVisit.time} onChange={e => setNewVisit(p => ({ ...p, time: e.target.value }))} />
            </div>
            {care.caregivers.length > 0 && (
              <div>
                <div className="text-sm text-gray-600 mb-1">Intervenant</div>
                <select className={input} value={newVisit.caregiverId || ''} onChange={e => setNewVisit(p => ({ ...p, caregiverId: e.target.value || undefined }))}>
                  <option value="">Non précisé</option>
                  {care.caregivers.map(cg => <option key={cg.id} value={cg.id}>{cg.name} — {cg.role}</option>)}
                </select>
              </div>
            )}
            <div>
              <div className="text-sm text-gray-600 mb-1">Notes (optionnel)</div>
              <input className={input} placeholder="ex: toilette, repas..." value={newVisit.notes || ''} onChange={e => setNewVisit(p => ({ ...p, notes: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setShowVisitForm(false); setNewVisit({ days: [], time: '08:00' }) }} className="flex-1 py-2 rounded-xl border border-gray-300 text-gray-600">Annuler</button>
              <button onClick={addVisit} disabled={newVisit.days.length === 0} className="flex-1 py-2 rounded-xl bg-indigo-500 text-white font-semibold disabled:opacity-40">Ajouter</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowVisitForm(true)} className="w-full py-3 rounded-xl border-2 border-dashed border-indigo-300 text-indigo-500 hover:bg-indigo-50">+ Ajouter un passage</button>
        )}
      </section>
    </main>
  )
}
