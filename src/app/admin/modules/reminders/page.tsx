'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/authContext'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import BackBar from '@/components/BackBar'

type Recurrence = 'daily' | 'weekly' | 'monthly' | 'once' | 'period'

type Reminder = {
  id: string
  label: string
  time_of_day: string
  recurrence: Recurrence
  week_days: number[] | null
  month_day: number | null
  specific_date: string | null
  date_start: string | null
  date_end: string | null
  emails: string[]
  active: boolean
}

function localISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

const DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
const RECURRENCE_LABELS: Record<Recurrence, string> = {
  daily: 'Chaque jour',
  weekly: 'Certains jours',
  monthly: 'Chaque mois',
  once: 'Une seule fois',
  period: 'Sur une période',
}

const EMPTY: Omit<Reminder, 'id'> = {
  label: '',
  time_of_day: '08:00',
  recurrence: 'daily',
  week_days: null,
  month_day: null,
  specific_date: null,
  date_start: localISO(new Date()),
  date_end: localISO(new Date()),
  emails: [],
  active: true,
}

export default function RemindersAdminPage() {
  const router = useRouter()
  const { activeUserId } = useAuth()
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<Omit<Reminder, 'id'>>(EMPTY)
  const [emailInput, setEmailInput] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!activeUserId || !isSupabaseConfigured) { setLoading(false); return }
    getSupabase()!.from('reminders').select('*').eq('user_id', activeUserId).order('time_of_day')
      .then(({ data }) => { setReminders((data ?? []) as Reminder[]); setLoading(false) })
  }, [activeUserId])

  const resetForm = () => { setForm(EMPTY); setEmailInput(''); setEditId(null); setShowForm(false) }

  const openEdit = (r: Reminder) => {
    setForm({ label: r.label, time_of_day: r.time_of_day, recurrence: r.recurrence, week_days: r.week_days, month_day: r.month_day, specific_date: r.specific_date, date_start: r.date_start, date_end: r.date_end, emails: r.emails, active: r.active })
    setEmailInput('')
    setEditId(r.id)
    setShowForm(true)
  }

  const addEmail = () => {
    const e = emailInput.trim()
    if (!e || form.emails.includes(e)) return
    setForm(f => ({ ...f, emails: [...f.emails, e] }))
    setEmailInput('')
  }

  const save = async () => {
    if (!form.label || !activeUserId || !isSupabaseConfigured) return
    setSaving(true)
    const sb = getSupabase()!
    const row = { ...form, user_id: activeUserId }
    if (editId) {
      await sb.from('reminders').update(row).eq('id', editId)
      setReminders(prev => prev.map(r => r.id === editId ? { ...row, id: editId } : r))
    } else {
      const { data } = await sb.from('reminders').insert(row).select().single()
      if (data) setReminders(prev => [...prev, data as Reminder])
    }
    setSaving(false)
    resetForm()
  }

  const deleteReminder = async (id: string) => {
    if (!confirm('Supprimer ce rappel ?') || !isSupabaseConfigured) return
    await getSupabase()!.from('reminders').delete().eq('id', id)
    setReminders(prev => prev.filter(r => r.id !== id))
  }

  const toggleActive = async (r: Reminder) => {
    if (!isSupabaseConfigured) return
    await getSupabase()!.from('reminders').update({ active: !r.active }).eq('id', r.id)
    setReminders(prev => prev.map(x => x.id === r.id ? { ...x, active: !x.active } : x))
  }

  const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  const recurrenceDetail = (r: Reminder) => {
    if (r.recurrence === 'weekly' && r.week_days?.length) return r.week_days.map(d => DAYS[d]).join(', ')
    if (r.recurrence === 'monthly' && r.month_day) return `Le ${r.month_day} du mois`
    if (r.recurrence === 'once' && r.specific_date) return fmtDate(r.specific_date)
    if (r.recurrence === 'period' && r.date_start && r.date_end) return `Du ${fmtDate(r.date_start)} au ${fmtDate(r.date_end)}`
    return RECURRENCE_LABELS[r.recurrence]
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><p className="text-gray-400 text-xl">Chargement...</p></div>

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto pb-28">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all text-gray-600 font-bold text-lg">←</button>
        <h1 className="text-2xl font-bold text-gray-800">Rappels</h1>
      </div>

      {/* Liste */}
      <div className="space-y-3 mb-6">
        {reminders.length === 0 && !showForm && (
          <div className="text-center py-12 text-gray-400">
            <div className="text-5xl mb-3">🔔</div>
            <p>Aucun rappel configuré.</p>
          </div>
        )}
        {reminders.map(r => (
          <div key={r.id} className={`bg-white rounded-2xl p-4 shadow-sm border-2 transition-all ${r.active ? 'border-gray-100' : 'border-gray-100 opacity-50'}`}>
            <div className="flex items-center gap-3">
              <div className="text-3xl w-12 h-12 flex items-center justify-center bg-indigo-50 rounded-xl shrink-0">🔔</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-gray-800">{r.label}</div>
                <div className="text-sm text-gray-500">{r.time_of_day.slice(0, 5)} · {recurrenceDetail(r)}</div>
                {r.emails.length > 0 && <div className="text-xs text-indigo-500 mt-0.5">✉️ {r.emails.join(', ')}</div>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => toggleActive(r)}
                  className={`w-10 h-6 rounded-full transition-all ${r.active ? 'bg-indigo-500' : 'bg-gray-300'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full mx-auto transition-all transform ${r.active ? 'translate-x-2' : '-translate-x-2'}`} />
                </button>
                <button onClick={() => openEdit(r)} className="p-2 text-gray-400 hover:text-gray-600">✏️</button>
                <button onClick={() => deleteReminder(r.id)} className="p-2 text-red-400 hover:text-red-600">✕</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border-2 border-indigo-200 mb-6 space-y-4">
          <h2 className="font-bold text-gray-800 text-lg">{editId ? 'Modifier' : 'Nouveau rappel'}</h2>

          <div>
            <label className="text-sm font-medium text-gray-600 block mb-1">Libellé *</label>
            <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              placeholder="Ex : Prendre le traitement"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 focus:outline-none focus:border-indigo-400" />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600 block mb-1">Heure</label>
            <input type="time" value={form.time_of_day} onChange={e => setForm(f => ({ ...f, time_of_day: e.target.value }))}
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 focus:outline-none focus:border-indigo-400" />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600 block mb-1">Récurrence</label>
            <div className="grid grid-cols-2 gap-2">
              {(['daily', 'weekly', 'monthly', 'once', 'period'] as Recurrence[]).map(rec => (
                <button key={rec} onClick={() => setForm(f => ({ ...f, recurrence: rec }))}
                  className={`py-2 rounded-xl text-sm font-semibold transition-all ${form.recurrence === rec ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {RECURRENCE_LABELS[rec]}
                </button>
              ))}
            </div>
          </div>

          {form.recurrence === 'weekly' && (
            <div>
              <label className="text-sm font-medium text-gray-600 block mb-1">Jours</label>
              <div className="flex gap-1 flex-wrap">
                {DAYS.map((d, i) => {
                  const selected = (form.week_days ?? []).includes(i)
                  return (
                    <button key={i} onClick={() => setForm(f => ({ ...f, week_days: selected ? (f.week_days ?? []).filter(x => x !== i) : [...(f.week_days ?? []), i] }))}
                      className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition-all ${selected ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                      {d}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {form.recurrence === 'monthly' && (
            <div>
              <label className="text-sm font-medium text-gray-600 block mb-1">Jour du mois</label>
              <input type="number" min={1} max={31} value={form.month_day ?? ''} onChange={e => setForm(f => ({ ...f, month_day: Number(e.target.value) }))}
                className="w-24 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 focus:outline-none focus:border-indigo-400" />
            </div>
          )}

          {form.recurrence === 'once' && (
            <div>
              <label className="text-sm font-medium text-gray-600 block mb-1">Date</label>
              <input type="date" value={form.specific_date ?? ''} onChange={e => setForm(f => ({ ...f, specific_date: e.target.value }))}
                className="border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 focus:outline-none focus:border-indigo-400" />
            </div>
          )}

          {form.recurrence === 'period' && (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-600 block mb-1">Du (date de début)</label>
                <input type="date" value={form.date_start ?? ''} onChange={e => setForm(f => ({ ...f, date_start: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 focus:outline-none focus:border-indigo-400" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 block mb-1">Au (date de fin)</label>
                <input type="date" value={form.date_end ?? ''} min={form.date_start ?? ''} onChange={e => setForm(f => ({ ...f, date_end: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 focus:outline-none focus:border-indigo-400" />
              </div>
              {form.date_start && form.date_end && form.date_start <= form.date_end && (
                <p className="text-xs text-indigo-500 font-semibold">
                  📅 {Math.round((new Date(form.date_end).getTime() - new Date(form.date_start).getTime()) / 86400000) + 1} jour(s)
                </p>
              )}
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-600 block mb-1">Envoyer par email à</label>
            <div className="flex gap-2">
              <input value={emailInput} onChange={e => setEmailInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addEmail()}
                placeholder="prenom@exemple.fr"
                type="email"
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 focus:outline-none focus:border-indigo-400" />
              <button onClick={addEmail} className="px-4 py-2.5 bg-indigo-100 text-indigo-700 rounded-xl font-semibold text-sm">+</button>
            </div>
            {form.emails.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {form.emails.map(e => (
                  <span key={e} className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm">
                    {e}
                    <button onClick={() => setForm(f => ({ ...f, emails: f.emails.filter(x => x !== e) }))} className="text-indigo-400 hover:text-indigo-600">✕</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={resetForm} className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold">Annuler</button>
            <button onClick={save} disabled={!form.label || saving}
              className="flex-1 py-3 rounded-xl bg-indigo-500 text-white font-bold disabled:opacity-40 active:scale-95 transition-all">
              {saving ? 'Enregistrement...' : editId ? 'Modifier' : 'Ajouter'}
            </button>
          </div>
        </div>
      )}

      {!showForm && (
        <button onClick={() => setShowForm(true)}
          className="w-full py-4 rounded-2xl border-2 border-dashed border-indigo-300 text-indigo-500 font-semibold text-lg hover:bg-indigo-50 active:scale-95 transition-all">
          + Ajouter un rappel
        </button>
      )}

      <BackBar />
    </main>
  )
}
