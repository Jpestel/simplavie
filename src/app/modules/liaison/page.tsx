'use client'
import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/authContext'
import { useProfile } from '@/lib/profileContext'
import { RATINGS, RATING_COLORS, RatingKey, weekDates, isoDate, formatDayFr, formatShortFr, averageScore, overallRating, formatAverageFr, DAY_LABELS, DAY_COLORS } from '@/lib/liaisonRatings'
import { joinNames, buildMailtoUrl, MAIL_DISCLAIMER } from '@/lib/mailTemplateTokens'

type Entry = { id: string; date: string; rating: RatingKey; aidants: string[]; comment: string | null }
type Aidant = { id: string; prenom: string }
type Responsable = { id: string; nom: string; prenom: string | null; email: string }
type Equipement = { id: string; label: string }

const TODAY = isoDate(new Date())

export default function LiaisonPage() {
  const { activeUserId } = useAuth()
  const { profile } = useProfile()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)

  const [entries, setEntries] = useState<Entry[]>([])
  const [aidants, setAidants] = useState<Aidant[]>([])
  const [responsables, setResponsables] = useState<Responsable[]>([])
  const [equipements, setEquipements] = useState<Equipement[]>([])

  const [view, setView] = useState<'journal' | 'bilan'>(searchParams.get('tab') === 'bilan' ? 'bilan' : 'journal')

  // ── Journal du jour ──
  const [entryDate, setEntryDate] = useState(TODAY)
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [formRating, setFormRating] = useState<RatingKey | null>(null)
  const [formAidants, setFormAidants] = useState<string[]>([])
  const [formComment, setFormComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [showAddAidant, setShowAddAidant] = useState(false)
  const [newAidantName, setNewAidantName] = useState('')
  const [addingAidant, setAddingAidant] = useState(false)

  // ── Bilan hebdomadaire ──
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedResp, setSelectedResp] = useState<string[]>([])
  const [selectedCcContacts, setSelectedCcContacts] = useState<string[]>([])
  const [copied, setCopied] = useState(false)
  const [weekSent, setWeekSent] = useState(false)
  const [showAddResp, setShowAddResp] = useState(false)
  const [newRespPrenom, setNewRespPrenom] = useState('')
  const [newRespNom, setNewRespNom] = useState('')
  const [newRespEmail, setNewRespEmail] = useState('')
  const [addingResp, setAddingResp] = useState(false)
  const [addRespError, setAddRespError] = useState('')

  const load = async () => {
    if (!activeUserId) return
    const [ent, aid, resp, equip] = await Promise.all([
      fetch(`/api/liaison-entries?userId=${activeUserId}`).then(r => r.json()),
      fetch(`/api/mail-aidants?userId=${activeUserId}`).then(r => r.json()),
      fetch(`/api/mail-responsables?userId=${activeUserId}`).then(r => r.json()),
      fetch(`/api/mail-equipements?userId=${activeUserId}`).then(r => r.json()),
    ])
    setEntries(Array.isArray(ent) ? ent : [])
    setAidants(Array.isArray(aid) ? aid : [])
    setResponsables(Array.isArray(resp) ? resp : [])
    setEquipements(Array.isArray(equip) ? equip : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [activeUserId])

  const dayEntries = entries.filter(e => e.date === entryDate)

  const startAdd = () => {
    setEditingId('new')
    setFormRating(null)
    setFormAidants([])
    setFormComment('')
  }

  const startEdit = (e: Entry) => {
    setEditingId(e.id)
    setFormRating(e.rating)
    setFormAidants(e.aidants)
    setFormComment(e.comment ?? '')
  }

  const cancelForm = () => setEditingId(null)

  const changeEntryDate = (d: string) => {
    setEntryDate(d)
    setEditingId(null)
  }

  const resetToToday = () => {
    setWeekOffset(0)
    changeEntryDate(TODAY)
  }

  const toggleFormAidant = (prenom: string) => {
    setFormAidants(prev => prev.includes(prenom) ? prev.filter(x => x !== prenom) : [...prev, prenom])
  }

  const addAidantInline = async () => {
    if (!activeUserId || !newAidantName.trim()) return
    setAddingAidant(true)
    const created = await fetch('/api/mail-aidants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: activeUserId, prenom: newAidantName.trim(), order: aidants.length }),
    }).then(r => r.json())
    setAidants(prev => [...prev, created])
    setFormAidants(prev => [...prev, created.prenom])
    setNewAidantName('')
    setShowAddAidant(false)
    setAddingAidant(false)
  }

  // Ajoute le nom d'un équipement (réglages > équipements) dans "Une précision ?",
  // sans écraser ce qui est déjà écrit.
  const insertEquipement = (label: string) => {
    setFormComment(prev => {
      const trimmed = prev.trimEnd()
      if (!trimmed) return label
      if (trimmed.toLowerCase().includes(label.toLowerCase())) return prev
      return /[.,;!?]$/.test(trimmed) ? `${trimmed} ${label}` : `${trimmed}, ${label}`
    })
  }

  const saveForm = async () => {
    if (!activeUserId || !formRating || formAidants.length === 0) return
    setSaving(true)
    const payload = { rating: formRating, aidants: formAidants, comment: formComment.trim() || null }
    let saved: Entry
    if (editingId === 'new') {
      saved = await fetch('/api/liaison-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: activeUserId, date: entryDate, ...payload }),
      }).then(r => r.json())
      setEntries(prev => [...prev, saved])
    } else {
      saved = await fetch('/api/liaison-entries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, ...payload }),
      }).then(r => r.json())
      setEntries(prev => prev.map(x => x.id === editingId ? saved : x))
    }
    setSaving(false)
    setEditingId(null)
  }

  const deleteEntry = async (e: Entry) => {
    if (!confirm(`Supprimer cette évaluation du ${formatShortFr(e.date)} ?`)) return
    await fetch('/api/liaison-entries?id=' + e.id, { method: 'DELETE' })
    setEntries(prev => prev.filter(x => x.id !== e.id))
    if (editingId === e.id) setEditingId(null)
  }

  const toggleResp = (id: string) => {
    setSelectedResp(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const addRespInline = async () => {
    if (!activeUserId) return
    const nom = newRespNom.trim()
    const email = newRespEmail.trim()
    if (!nom) { setAddRespError('Indique au moins un nom.'); return }
    if (!email) { setAddRespError("L'e-mail est obligatoire pour pouvoir lui écrire."); return }
    setAddRespError('')
    setAddingResp(true)
    const created = await fetch('/api/mail-responsables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: activeUserId, nom, prenom: newRespPrenom.trim() || null, email, order: responsables.length }),
    }).then(r => r.json())
    setResponsables(prev => [...prev, created])
    setSelectedResp(prev => [...prev, created.id])
    setNewRespPrenom('')
    setNewRespNom('')
    setNewRespEmail('')
    setShowAddResp(false)
    setAddingResp(false)
  }

  const toggleCcContact = (id: string) => {
    setSelectedCcContacts(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const contactsWithEmail = (profile.contacts || []).filter(c => c.email && c.email.trim())
  const ccEmails = [
    ...(profile.email && profile.email.trim() ? [profile.email.trim()] : []),
    ...contactsWithEmail.filter(c => selectedCcContacts.includes(c.id)).map(c => c.email!.trim()),
  ]

  const days = useMemo(() => weekDates(weekOffset), [weekOffset])

  useEffect(() => {
    if (!activeUserId) return
    setWeekSent(false)
    fetch(`/api/liaison-week-sent?userId=${activeUserId}&weekStart=${days[0]}`)
      .then(r => r.json())
      .then(d => setWeekSent(!!d.sent))
  }, [activeUserId, days])

  const markWeekSent = () => {
    if (!activeUserId) return
    setWeekSent(true)
    fetch('/api/liaison-week-sent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: activeUserId, weekStart: days[0] }),
    })
  }

  const weekEntries = useMemo(
    () => entries.filter(e => days.includes(e.date)).sort((a, b) => a.date.localeCompare(b.date)),
    [entries, days],
  )
  const daysWithEntry = new Set(weekEntries.map(e => e.date))
  const missingDays = days.filter(d => !daysWithEntry.has(d))
  const weekComplete = missingDays.length === 0
  const counts = RATINGS.map(r => ({ ...r, count: weekEntries.filter(e => e.rating === r.key).length }))
  const avgScore = averageScore(weekEntries.map(e => e.rating))
  const overall = avgScore !== null ? RATINGS.find(r => r.key === overallRating(avgScore))! : null

  const recipientEmails = responsables.filter(r => selectedResp.includes(r.id)).map(r => r.email)

  const bilanSubject = `Bilan de la semaine du ${formatShortFr(days[0])} au ${formatShortFr(days[6])}`
  const bilanBody = useMemo(() => {
    const intro = `Bonjour,\n\nVoici mon bilan de satisfaction pour la semaine du ${formatShortFr(days[0])} au ${formatShortFr(days[6])} :\n`
    const globalLine = overall ? `Satisfaction globale de la semaine : ${overall.emoji} ${overall.label} (moyenne ${formatAverageFr(avgScore!)}/4)\n\n` : ''
    const countLines = counts.map(c => `${c.emoji} ${c.label} : ${c.count} jour(s)`).join('\n')
    const detailLines = weekEntries.length > 0
      ? '\n\nDétail :\n' + weekEntries.map(e => {
          const info = RATINGS.find(r => r.key === e.rating)!
          const who = e.aidants.length > 0 ? ` (${joinNames(e.aidants)})` : ''
          const note = e.comment ? ` — ${e.comment}` : ''
          return `- ${formatDayFr(e.date)} : ${info.emoji} ${info.label}${who}${note}`
        }).join('\n')
      : ''
    const signature = profile.firstName ? `\n\n${profile.firstName}` : ''
    return `${intro}\n${globalLine}${countLines}${detailLines}${signature}\n\n${MAIL_DISCLAIMER}`
  }, [days, counts, weekEntries, profile.firstName, overall, avgScore])

  const copyBilan = () => {
    const ccLine = ccEmails.length > 0 ? `Copie : ${ccEmails.join(', ')}\n` : ''
    navigator.clipboard.writeText(`Objet : ${bilanSubject}\n${ccLine}\n${bilanBody}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    markWeekSent()
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="text-xl text-gray-400">Chargement...</div></div>

  const ratingForm = (
    <div className="bg-white rounded-2xl p-5 shadow-sm mb-3 border-2 border-indigo-100">
      <p className="text-sm text-gray-500 mb-3">Comment ça s&apos;est passé ?</p>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {RATINGS.map(r => (
          <button
            key={r.key}
            onClick={() => setFormRating(r.key)}
            className={`py-4 rounded-2xl font-semibold text-lg border-2 active:scale-95 transition-all ${formRating === r.key ? RATING_COLORS[r.key] : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-200'}`}
          >
            <span className="text-2xl block mb-1">{r.emoji}</span>
            {r.label}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-500 mb-2">Avec quel(s) aidant(s) ?</p>
        <div className="flex flex-wrap gap-2">
          {aidants.map(a => (
            <button
              key={a.id}
              onClick={() => toggleFormAidant(a.prenom)}
              className={`px-4 py-2 rounded-xl font-semibold text-sm border-2 active:scale-95 transition-all ${formAidants.includes(a.prenom) ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-200'}`}
            >
              {a.prenom}
            </button>
          ))}
          <button
            onClick={() => setShowAddAidant(v => !v)}
            className={`px-4 py-2 rounded-xl font-semibold text-sm border-2 border-dashed active:scale-95 transition-all ${showAddAidant ? 'bg-indigo-50 border-indigo-400 text-indigo-600' : 'bg-white border-gray-300 text-gray-500 hover:border-indigo-200'}`}
          >
            + Ajouter un aidant
          </button>
        </div>
        {showAddAidant && (
          <div className="flex gap-2 mt-3">
            <input
              type="text"
              value={newAidantName}
              onChange={e => setNewAidantName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addAidantInline() }}
              placeholder="ex: Sarah"
              autoFocus
              className="flex-1 border-2 border-gray-200 rounded-xl p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <button
              onClick={addAidantInline}
              disabled={!newAidantName.trim() || addingAidant}
              className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-semibold active:scale-95 transition-all disabled:opacity-40"
            >
              {addingAidant ? '...' : 'Ajouter'}
            </button>
          </div>
        )}
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-500 mb-2">Une précision ? (optionnel)</p>
        <textarea
          value={formComment}
          onChange={e => setFormComment(e.target.value)}
          placeholder="ex: Sarah m'a bien aidé à me lever"
          className="w-full min-h-[80px] border-2 border-gray-200 rounded-2xl p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
        {equipements.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {equipements.map(eq => (
              <button
                key={eq.id}
                type="button"
                onClick={() => insertEquipement(eq.label)}
                className="px-3 py-1 rounded-lg text-xs font-semibold border-2 border-dashed border-gray-300 text-gray-500 active:scale-95 transition-all hover:border-indigo-300 hover:text-indigo-600"
              >
                🛠️ {eq.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button onClick={cancelForm} className="flex-1 py-3 rounded-xl border-2 border-gray-300 text-gray-600 font-semibold active:scale-95 transition-all">Annuler</button>
        <button
          onClick={saveForm}
          disabled={!formRating || formAidants.length === 0 || saving}
          className="flex-1 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-semibold active:scale-95 transition-all disabled:opacity-40"
        >
          {saving ? '...' : 'Enregistrer'}
        </button>
      </div>
    </div>
  )

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">📔 Cahier de liaison</h1>
      </div>

      {/* Sélecteur de la semaine : les 7 jours + Bilan, sur deux lignes de 4 */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        {days.map((d, i) => {
          const hasEntry = entries.some(e => e.date === d)
          const isSelected = view === 'journal' && entryDate === d
          const isToday = d === TODAY
          return (
            <button
              key={d}
              onClick={() => { setView('journal'); changeEntryDate(d) }}
              className={`rounded-2xl py-3 px-1 flex flex-col items-center justify-center gap-0.5 text-white font-bold active:scale-95 transition-all ${DAY_COLORS[i]} ${isSelected ? 'ring-4 ring-gray-700' : ''} ${isToday && !isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-300' : ''}`}
            >
              <span className="text-[10px] leading-tight text-center opacity-90">{DAY_LABELS[i]}</span>
              <span className="text-lg leading-none">{new Date(d + 'T00:00:00').getDate()}</span>
              <span className="text-[10px] leading-none">{hasEntry ? '●' : ''}</span>
            </button>
          )
        })}
        <button
          onClick={() => setView('bilan')}
          className={`rounded-2xl py-3 px-1 flex flex-col items-center justify-center gap-0.5 text-white font-bold bg-indigo-600 active:scale-95 transition-all ${view === 'bilan' ? 'ring-4 ring-gray-700' : ''}`}
        >
          <span className="text-lg leading-none">📊</span>
          <span className="text-[10px] leading-tight">Bilan</span>
          <span className="text-[10px] leading-none">{weekComplete ? '✓' : ''}</span>
        </button>
      </div>

      {/* ── JOURNAL ── */}
      {view === 'journal' && (
        <div className="space-y-6">
          <section>
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="text-base font-semibold text-gray-700">
                {entryDate === TODAY ? "Aujourd'hui" : formatDayFr(entryDate)}
              </h2>
              {(entryDate !== TODAY || weekOffset !== 0) && (
                <button onClick={resetToToday} className="text-xs px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold">
                  Revenir à aujourd&apos;hui
                </button>
              )}
            </div>

            {dayEntries.map(e => (
              editingId === e.id ? <div key={e.id}>{ratingForm}</div> : (
                <div key={e.id} className="bg-white rounded-2xl p-4 shadow-sm border-2 border-gray-100 mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{RATINGS.find(r => r.key === e.rating)!.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-700">{RATINGS.find(r => r.key === e.rating)!.label}</div>
                      {e.aidants.length > 0 && <div className="text-sm text-gray-500 truncate">{joinNames(e.aidants)}</div>}
                      {e.comment && <div className="text-xs text-gray-400 truncate mt-0.5">{e.comment}</div>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => startEdit(e)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-indigo-100 text-gray-500 hover:text-indigo-600 active:scale-95 transition-all text-sm">✏️</button>
                      <button onClick={() => deleteEntry(e)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-500 active:scale-95 transition-all text-sm">🗑️</button>
                    </div>
                  </div>
                </div>
              )
            ))}

            {editingId === 'new' ? ratingForm : (
              <button
                onClick={startAdd}
                className="w-full py-4 rounded-2xl border-2 border-dashed border-indigo-300 text-indigo-600 font-bold active:scale-95 transition-all hover:bg-indigo-50"
              >
                + Ajouter une évaluation{dayEntries.length > 0 ? ' (un autre aidant ?)' : ''}
              </button>
            )}
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-700 mb-3">Historique</h2>
            {entries.length === 0 && <p className="text-center text-gray-400 text-sm py-6">Aucune évaluation pour l&apos;instant.</p>}
            <div className="space-y-2">
              {[...new Set(entries.map(e => e.date))].filter(d => d !== entryDate).sort((a, b) => b.localeCompare(a)).map(date => {
                const dayList = entries.filter(e => e.date === date)
                return (
                  <button
                    key={date}
                    onClick={() => changeEntryDate(date)}
                    className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border-2 border-gray-100 hover:border-indigo-200 active:scale-95 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-700">{formatDayFr(date)}</span>
                      <span className="flex gap-1">
                        {dayList.map(e => <span key={e.id}>{RATINGS.find(r => r.key === e.rating)!.emoji}</span>)}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        </div>
      )}

      {/* ── BILAN DE LA SEMAINE ── */}
      {view === 'bilan' && (
        <div className="space-y-6">
          <section className="bg-white rounded-2xl p-5 shadow-sm border-2 border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setWeekOffset(o => o - 1)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold">←</button>
              <div className="text-center">
                <div className="font-semibold text-gray-700">Semaine du {formatShortFr(days[0])} au {formatShortFr(days[6])}</div>
                {weekOffset === 0 && <div className="text-xs text-indigo-500">Cette semaine</div>}
              </div>
              <button onClick={() => setWeekOffset(o => Math.min(0, o + 1))} disabled={weekOffset === 0} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold disabled:opacity-30">→</button>
            </div>

            {weekSent && (
              <div className="bg-green-50 border-2 border-green-200 text-green-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-center mb-4">
                ✓ Bilan déjà envoyé cette semaine
              </div>
            )}

            {overall && (
              <div className="rounded-2xl bg-indigo-50 border-2 border-indigo-100 p-4 text-center mb-4">
                <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wide mb-1">Satisfaction globale de la semaine</p>
                <div className="text-3xl mb-1">{overall.emoji}</div>
                <div className="text-lg font-bold text-gray-800">{overall.label}</div>
                <div className="text-xs text-gray-400 mt-1">Moyenne {formatAverageFr(avgScore!)}/4</div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {counts.map(c => (
                <div key={c.key} className="rounded-xl bg-gray-50 p-3 text-center">
                  <div className="text-2xl">{c.emoji}</div>
                  <div className="text-xs text-gray-500">{c.label}</div>
                  <div className="text-lg font-bold text-gray-800">{c.count}</div>
                </div>
              ))}
            </div>
          </section>

          {!weekComplete ? (
            <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-5">
              <p className="font-semibold text-orange-700 mb-2">Il manque une évaluation pour :</p>
              <ul className="text-orange-700 text-sm space-y-1 mb-3">
                {missingDays.map(d => <li key={d}>• {formatDayFr(d)}</li>)}
              </ul>
              <p className="text-sm text-orange-600">Le bilan ne peut être envoyé que lorsque chaque jour de la semaine a au moins une évaluation.</p>
            </div>
          ) : (
            <>
              <section>
                <h2 className="text-base font-semibold text-gray-700 mb-3">À qui envoyer ce bilan ?</h2>
                {responsables.length === 0 && (
                  <p className="text-sm text-gray-400 mb-3">Aucun responsable pour l&apos;instant — ajoute-en un ci-dessous.</p>
                )}
                <div className="space-y-2">
                  {responsables.map(r => (
                    <button
                      key={r.id}
                      onClick={() => toggleResp(r.id)}
                      className={`w-full text-left flex items-center gap-3 p-4 rounded-2xl border-2 active:scale-95 transition-all ${selectedResp.includes(r.id) ? 'bg-indigo-50 border-indigo-400' : 'bg-white border-gray-200 hover:border-indigo-200'}`}
                    >
                      <span className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 ${selectedResp.includes(r.id) ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-gray-300'}`}>
                        {selectedResp.includes(r.id) ? '✓' : ''}
                      </span>
                      <span>
                        <span className="block font-semibold text-gray-700">{r.prenom ? `${r.prenom} ` : ''}{r.nom}</span>
                        <span className="block text-xs text-gray-400">{r.email}</span>
                      </span>
                    </button>
                  ))}
                </div>

                {showAddResp ? (
                  <div className="bg-white rounded-2xl p-4 shadow-sm border-2 border-indigo-100 mt-3 space-y-2">
                    <input
                      type="text"
                      value={newRespPrenom}
                      onChange={e => setNewRespPrenom(e.target.value)}
                      placeholder="Prénom"
                      className="w-full border-2 border-gray-200 rounded-xl p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                    <input
                      type="text"
                      value={newRespNom}
                      onChange={e => setNewRespNom(e.target.value)}
                      placeholder="Nom *"
                      className="w-full border-2 border-gray-200 rounded-xl p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                    <input
                      type="email"
                      value={newRespEmail}
                      onChange={e => setNewRespEmail(e.target.value)}
                      placeholder="E-mail * (obligatoire)"
                      className="w-full border-2 border-gray-200 rounded-xl p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                    {addRespError && <p className="text-red-500 text-sm font-medium">{addRespError}</p>}
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => { setShowAddResp(false); setAddRespError('') }} className="flex-1 py-2.5 rounded-xl border-2 border-gray-300 text-gray-600 font-semibold active:scale-95 transition-all">Annuler</button>
                      <button onClick={addRespInline} disabled={addingResp} className="flex-1 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-semibold active:scale-95 transition-all disabled:opacity-40">
                        {addingResp ? '...' : 'Ajouter'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddResp(true)}
                    className="w-full mt-3 py-3 rounded-2xl border-2 border-dashed border-indigo-300 text-indigo-600 font-semibold active:scale-95 transition-all hover:bg-indigo-50"
                  >
                    + Ajouter un responsable
                  </button>
                )}
              </section>

              {contactsWithEmail.length > 0 && (
                <section>
                  <h2 className="text-base font-semibold text-gray-700 mb-1">Mettre quelqu&apos;un en copie ?</h2>
                  <p className="text-sm text-gray-400 mb-3">Optionnel — ex : papa, maman.</p>
                  <div className="flex flex-wrap gap-2">
                    {contactsWithEmail.map(c => (
                      <button
                        key={c.id}
                        onClick={() => toggleCcContact(c.id)}
                        className={`px-5 py-3 rounded-2xl font-semibold text-lg border-2 active:scale-95 transition-all ${selectedCcContacts.includes(c.id) ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-200'}`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {selectedResp.length > 0 && (
                <>
                  <section className="bg-white rounded-2xl p-5 shadow-sm border-2 border-gray-100">
                    <p className="text-xs text-gray-400 mb-1">À : {recipientEmails.join(', ')}</p>
                    {ccEmails.length > 0 && <p className="text-xs text-gray-400 mb-1">Copie : {ccEmails.join(', ')}</p>}
                    <p className="font-bold text-gray-800 mb-3">{bilanSubject}</p>
                    <p className="text-gray-600 whitespace-pre-wrap">{bilanBody}</p>
                  </section>

                  <div className="space-y-3">
                    <a
                      href={buildMailtoUrl(recipientEmails, bilanSubject, bilanBody, ccEmails)}
                      onClick={markWeekSent}
                      className="block w-full text-center py-4 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-lg active:scale-95 transition-all"
                    >
                      📧 Envoyer le bilan par mail
                    </a>
                    <button
                      onClick={copyBilan}
                      className="w-full py-4 rounded-2xl border-2 border-indigo-300 text-indigo-600 font-bold text-lg active:scale-95 transition-all hover:bg-indigo-50"
                    >
                      {copied ? '✓ Copié !' : '📋 Copier le texte'}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </main>
  )
}
