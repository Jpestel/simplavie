'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/authContext'
import { useProfile } from '@/lib/profileContext'
import { RATINGS, RATING_COLORS, RatingKey, weekDates, isoDate, formatDayFr, formatShortFr } from '@/lib/liaisonRatings'
import { joinNames, buildMailtoUrl, MAIL_DISCLAIMER } from '@/lib/mailTemplateTokens'

type Entry = { id: string; date: string; rating: RatingKey; aidants: string[]; comment: string | null }
type Aidant = { id: string; prenom: string }
type Responsable = { id: string; nom: string; prenom: string | null; email: string }

const TODAY = isoDate(new Date())

export default function LiaisonPage() {
  const { activeUserId } = useAuth()
  const { profile } = useProfile()
  const [loading, setLoading] = useState(true)

  const [entries, setEntries] = useState<Entry[]>([])
  const [aidants, setAidants] = useState<Aidant[]>([])
  const [responsables, setResponsables] = useState<Responsable[]>([])

  const [view, setView] = useState<'journal' | 'bilan'>('journal')

  // ── Formulaire du jour ──
  const [entryDate, setEntryDate] = useState(TODAY)
  const [formRating, setFormRating] = useState<RatingKey | null>(null)
  const [formAidants, setFormAidants] = useState<string[]>([])
  const [formComment, setFormComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

  // ── Bilan hebdomadaire ──
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedResp, setSelectedResp] = useState<string[]>([])
  const [selectedCcContacts, setSelectedCcContacts] = useState<string[]>([])
  const [copied, setCopied] = useState(false)

  const load = async () => {
    if (!activeUserId) return
    const [ent, aid, resp] = await Promise.all([
      fetch(`/api/liaison-entries?userId=${activeUserId}`).then(r => r.json()),
      fetch(`/api/mail-aidants?userId=${activeUserId}`).then(r => r.json()),
      fetch(`/api/mail-responsables?userId=${activeUserId}`).then(r => r.json()),
    ])
    setEntries(Array.isArray(ent) ? ent : [])
    setAidants(Array.isArray(aid) ? aid : [])
    setResponsables(Array.isArray(resp) ? resp : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [activeUserId])

  useEffect(() => {
    const e = entries.find(x => x.date === entryDate)
    setFormRating((e?.rating as RatingKey) ?? null)
    setFormAidants(e?.aidants ?? [])
    setFormComment(e?.comment ?? '')
  }, [entryDate, entries])

  const toggleFormAidant = (prenom: string) => {
    setFormAidants(prev => prev.includes(prenom) ? prev.filter(x => x !== prenom) : [...prev, prenom])
  }

  const saveEntry = async () => {
    if (!activeUserId || !formRating) return
    setSaving(true)
    const res = await fetch('/api/liaison-entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: activeUserId, date: entryDate, rating: formRating, aidants: formAidants, comment: formComment.trim() || null }),
    })
    const saved = await res.json()
    setEntries(prev => [...prev.filter(x => x.date !== entryDate), saved].sort((a, b) => b.date.localeCompare(a.date)))
    setSaving(false)
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 2500)
  }

  const deleteEntry = async (e: Entry) => {
    if (!confirm(`Supprimer l'évaluation du ${formatShortFr(e.date)} ?`)) return
    await fetch('/api/liaison-entries?id=' + e.id, { method: 'DELETE' })
    setEntries(prev => prev.filter(x => x.id !== e.id))
    if (e.date === entryDate) {
      setFormRating(null)
      setFormAidants([])
      setFormComment('')
    }
  }

  const toggleResp = (id: string) => {
    setSelectedResp(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
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
  const weekEntries = useMemo(
    () => entries.filter(e => days.includes(e.date)).sort((a, b) => a.date.localeCompare(b.date)),
    [entries, days],
  )
  const counts = RATINGS.map(r => ({ ...r, count: weekEntries.filter(e => e.rating === r.key).length }))

  const recipientEmails = responsables.filter(r => selectedResp.includes(r.id)).map(r => r.email)

  const bilanSubject = `Bilan de la semaine du ${formatShortFr(days[0])} au ${formatShortFr(days[6])}`
  const bilanBody = useMemo(() => {
    const intro = `Bonjour,\n\nVoici mon bilan de satisfaction pour la semaine du ${formatShortFr(days[0])} au ${formatShortFr(days[6])} :\n`
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
    return `${intro}\n${countLines}${detailLines}${signature}\n\n${MAIL_DISCLAIMER}`
  }, [days, counts, weekEntries, profile.firstName])

  const copyBilan = () => {
    const ccLine = ccEmails.length > 0 ? `Copie : ${ccEmails.join(', ')}\n` : ''
    navigator.clipboard.writeText(`Objet : ${bilanSubject}\n${ccLine}\n${bilanBody}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="text-xl text-gray-400">Chargement...</div></div>

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">📔 Cahier de liaison</h1>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-1 mb-6 bg-gray-100 rounded-2xl p-1">
        {([['journal', '📝 Mon journal'], ['bilan', '📊 Bilan de la semaine']] as const).map(([tab, label]) => (
          <button key={tab} onClick={() => setView(tab)}
            className={`py-2.5 rounded-xl text-xs font-semibold transition-all ${view === tab ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── JOURNAL ── */}
      {view === 'journal' && (
        <div className="space-y-6">
          <section className="bg-white rounded-2xl p-5 shadow-sm border-2 border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-700">
                {entryDate === TODAY ? "Aujourd'hui" : formatDayFr(entryDate)}
              </h2>
              {entryDate !== TODAY && (
                <button onClick={() => setEntryDate(TODAY)} className="text-xs px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold">
                  Revenir à aujourd&apos;hui
                </button>
              )}
            </div>

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

            {aidants.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-2">Avec quel(s) aidant(s) ? (optionnel)</p>
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
                </div>
              </div>
            )}

            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-2">Une précision ? (optionnel)</p>
              <textarea
                value={formComment}
                onChange={e => setFormComment(e.target.value)}
                placeholder="ex: Sarah m'a bien aidé à me lever"
                className="w-full min-h-[80px] border-2 border-gray-200 rounded-2xl p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>

            <button
              onClick={saveEntry}
              disabled={!formRating || saving}
              className="w-full py-4 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-lg active:scale-95 transition-all disabled:opacity-40"
            >
              {saving ? '...' : savedFlash ? '✓ Enregistré !' : 'Enregistrer'}
            </button>
            {aidants.length === 0 && (
              <p className="text-xs text-gray-400 mt-3 text-center">
                Astuce : ajoute tes aidants dans <Link href="/modules/mails/reglages" className="underline">les réglages du module Mails</Link> pour pouvoir les sélectionner ici.
              </p>
            )}
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-700 mb-3">Historique</h2>
            {entries.length === 0 && <p className="text-center text-gray-400 text-sm py-6">Aucune évaluation pour l&apos;instant.</p>}
            <div className="space-y-2">
              {entries.map(e => {
                const info = RATINGS.find(r => r.key === e.rating)!
                return (
                  <div key={e.id} className={`bg-white rounded-2xl p-4 shadow-sm border-2 ${e.date === entryDate ? 'border-indigo-300' : 'border-gray-100'}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{info.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-700">{formatDayFr(e.date)}</div>
                        <div className="text-sm text-gray-500 truncate">
                          {info.label}{e.aidants.length > 0 ? ` — ${joinNames(e.aidants)}` : ''}
                        </div>
                        {e.comment && <div className="text-xs text-gray-400 truncate mt-0.5">{e.comment}</div>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => setEntryDate(e.date)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-indigo-100 text-gray-500 hover:text-indigo-600 active:scale-95 transition-all text-sm">✏️</button>
                        <button onClick={() => deleteEntry(e)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-500 active:scale-95 transition-all text-sm">🗑️</button>
                      </div>
                    </div>
                  </div>
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

          {responsables.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
              <p className="text-4xl mb-3">✉️</p>
              <p className="text-gray-600 font-medium mb-2">Aucun responsable configuré</p>
              <p className="text-sm text-gray-400 mb-5">Ajoute au moins un responsable pour pouvoir envoyer ton bilan.</p>
              <Link href="/modules/mails/reglages" className="inline-block px-6 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-semibold active:scale-95 transition-all">
                Aller aux réglages →
              </Link>
            </div>
          ) : (
            <>
              <section>
                <h2 className="text-base font-semibold text-gray-700 mb-3">À qui envoyer ce bilan ?</h2>
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

              {weekEntries.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-4">Aucune évaluation notée cette semaine — rien à envoyer pour l&apos;instant.</p>
              ) : selectedResp.length > 0 && (
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
