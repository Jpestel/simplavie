'use client'
import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/authContext'
import { useProfile } from '@/lib/profileContext'
import {
  RATINGS, RATING_COLORS, RatingKey, weekDates, isoDate, formatDayFr, formatShortFr, averageScore,
  overallRating, formatAverageFr, DAY_LABELS, DAY_COLORS, MOMENTS, MomentKey, momentInfo, momentFromTime,
  isBadRating, DEFAULT_MOTIFS, aidantStats, buildIncidentMail,
} from '@/lib/liaisonRatings'
import { joinNames, buildMailtoUrl, MAIL_DISCLAIMER } from '@/lib/mailTemplateTokens'
import type { CareData } from '@/types'

type Entry = {
  id: string
  date: string
  rating: RatingKey
  aidants: string[]
  moment: MomentKey | null
  motifs: string[]
  comment: string | null
}
type RawEntry = Omit<Entry, 'aidants' | 'motifs' | 'moment'> & { aidants?: unknown; motifs?: unknown; moment?: string | null }
type Aidant = { id: string; prenom: string }
type Responsable = { id: string; nom: string; prenom: string | null; email: string }
type Equipement = { id: string; label: string }
type Motif = { id: string; label: string; kind: 'negatif' | 'positif' }

const TODAY = isoDate(new Date())
const JSON_HEADERS = { 'Content-Type': 'application/json' }

// Comparaison de prénoms sans accents ni casse (« Hélène » = « helene »).
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

function normalizeEntry(raw: RawEntry): Entry {
  return {
    id: raw.id,
    date: raw.date,
    rating: raw.rating,
    aidants: Array.isArray(raw.aidants) ? (raw.aidants as string[]) : [],
    moment: (raw.moment as MomentKey | null | undefined) ?? null,
    motifs: Array.isArray(raw.motifs) ? (raw.motifs as string[]) : [],
    comment: raw.comment ?? null,
  }
}

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url)
    return r.ok ? ((await r.json()) as T) : null
  } catch {
    return null
  }
}

export default function LiaisonPage() {
  const { activeUserId } = useAuth()
  const { profile } = useProfile()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')

  const [entries, setEntries] = useState<Entry[]>([])
  const [aidants, setAidants] = useState<Aidant[]>([])
  const [responsables, setResponsables] = useState<Responsable[]>([])
  const [equipements, setEquipements] = useState<Equipement[]>([])
  const [motifs, setMotifs] = useState<Motif[]>([])
  const [noVisitDays, setNoVisitDays] = useState<string[]>([])
  const [care, setCare] = useState<CareData | null>(null)

  const [view, setView] = useState<'journal' | 'bilan'>(searchParams.get('tab') === 'bilan' ? 'bilan' : 'journal')

  // ── Journal du jour ──
  const [entryDate, setEntryDate] = useState(TODAY)
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [formRating, setFormRating] = useState<RatingKey | null>(null)
  const [formAidants, setFormAidants] = useState<string[]>([])
  const [formMoment, setFormMoment] = useState<MomentKey | null>(null)
  const [formMotifs, setFormMotifs] = useState<string[]>([])
  const [formComment, setFormComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [showAddAidant, setShowAddAidant] = useState(false)
  const [newAidantName, setNewAidantName] = useState('')
  const [addingAidant, setAddingAidant] = useState(false)
  const [showAddMotif, setShowAddMotif] = useState(false)
  const [newMotifLabel, setNewMotifLabel] = useState('')
  const [addingMotif, setAddingMotif] = useState(false)
  const [loadingMotifs, setLoadingMotifs] = useState(false)
  const [quickSaving, setQuickSaving] = useState<string | null>(null)
  // Évaluation « Mal / Très mal » qui vient d'être enregistrée : on propose de prévenir l'agence tout de suite.
  const [alertEntry, setAlertEntry] = useState<Entry | null>(null)

  // ── Bilan hebdomadaire ──
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedResp, setSelectedResp] = useState<string[]>([])
  const [selectedCcContacts, setSelectedCcContacts] = useState<string[]>([])
  const [copied, setCopied] = useState(false)
  const [weekSent, setWeekSent] = useState(false)
  const [statsPeriod, setStatsPeriod] = useState<'semaine' | 'quatre'>('semaine')
  const [includeAidantSummary, setIncludeAidantSummary] = useState(true)
  const [showAddResp, setShowAddResp] = useState(false)
  const [newRespPrenom, setNewRespPrenom] = useState('')
  const [newRespNom, setNewRespNom] = useState('')
  const [newRespEmail, setNewRespEmail] = useState('')
  const [addingResp, setAddingResp] = useState(false)
  const [addRespError, setAddRespError] = useState('')

  const load = async () => {
    if (!activeUserId) return
    const [ent, aid, resp, equip, mot, nov, careData] = await Promise.all([
      fetch(`/api/liaison-entries?userId=${activeUserId}`).then(r => r.json()),
      fetch(`/api/mail-aidants?userId=${activeUserId}`).then(r => r.json()),
      fetch(`/api/mail-responsables?userId=${activeUserId}`).then(r => r.json()),
      fetch(`/api/mail-equipements?userId=${activeUserId}`).then(r => r.json()),
      getJson<Motif[]>(`/api/liaison-motifs?userId=${activeUserId}`),
      getJson<string[]>(`/api/liaison-no-visit?userId=${activeUserId}`),
      getJson<CareData>(`/api/care?userId=${activeUserId}`),
    ])
    setEntries(Array.isArray(ent) ? (ent as RawEntry[]).map(normalizeEntry) : [])
    setAidants(Array.isArray(aid) ? aid : [])
    setResponsables(Array.isArray(resp) ? resp : [])
    setEquipements(Array.isArray(equip) ? equip : [])
    setMotifs(Array.isArray(mot) ? mot : [])
    setNoVisitDays(Array.isArray(nov) ? nov : [])
    setCare(careData && Array.isArray(careData.appointments) ? careData : null)
    setLoading(false)
  }

  useEffect(() => { load() }, [activeUserId])

  const dayEntries = entries.filter(e => e.date === entryDate)

  // ── Planning du jour (module Aidants) : les passages prévus, évaluables en un geste ──
  const plannedVisits = useMemo(() => {
    const appts = (care?.appointments ?? [])
      .filter(a => a.date === entryDate && a.status !== 'cancelled')
      .sort((a, b) => a.time.localeCompare(b.time))
    return appts
      .map(a => {
        const cg = a.caregiverId ? care?.caregivers?.find(c => c.id === a.caregiverId) : undefined
        const fullName = (cg?.name || a.caregiverName || '').trim()
        const first = fullName.split(/\s+/)[0] ?? ''
        const match =
          aidants.find(x => norm(x.prenom) === norm(first)) ??
          aidants.find(x => norm(fullName).startsWith(norm(x.prenom)))
        return { id: a.id, time: a.time, prenom: match?.prenom ?? first, moment: momentFromTime(a.time) }
      })
      .filter(v => v.prenom)
  }, [care, entryDate, aidants])

  // Un passage est « fait » s'il existe une évaluation de cet aidant pour le même moment
  // (ou, s'il n'a qu'un seul passage ce jour-là, n'importe laquelle).
  const doneEntryFor = (v: { prenom: string; moment: MomentKey | null }): Entry | undefined => {
    const mine = dayEntries.filter(e => e.aidants.some(n => norm(n) === norm(v.prenom)))
    if (mine.length === 0) return undefined
    const sameMoment = mine.find(e => e.moment && e.moment === v.moment)
    if (sameMoment) return sameMoment
    const visitsOfAidant = plannedVisits.filter(x => norm(x.prenom) === norm(v.prenom)).length
    return visitsOfAidant === 1 ? mine[0] : undefined
  }

  const emptyForm = () => {
    setFormRating(null)
    setFormAidants([])
    setFormMoment(null)
    setFormMotifs([])
    setFormComment('')
    setShowAddMotif(false)
    setNewMotifLabel('')
  }

  const startAdd = () => {
    emptyForm()
    setEditingId('new')
  }

  const startEdit = (e: Entry) => {
    setEditingId(e.id)
    setFormRating(e.rating)
    setFormAidants(e.aidants)
    setFormMoment(e.moment)
    setFormMotifs(e.motifs)
    setFormComment(e.comment ?? '')
    setShowAddMotif(false)
    setNewMotifLabel('')
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

  const selectRating = (r: RatingKey) => {
    // Les motifs proposés dépendent du type d'évaluation : on repart de zéro si on change de camp.
    if (formRating && isBadRating(formRating) !== isBadRating(r)) setFormMotifs([])
    setFormRating(r)
  }

  const toggleFormAidant = (prenom: string) => {
    setFormAidants(prev => prev.includes(prenom) ? prev.filter(x => x !== prenom) : [...prev, prenom])
  }

  const toggleFormMotif = (label: string) => {
    setFormMotifs(prev => prev.includes(label) ? prev.filter(x => x !== label) : [...prev, label])
  }

  const addAidantInline = async () => {
    if (!activeUserId || !newAidantName.trim()) return
    setAddingAidant(true)
    const created = await fetch('/api/mail-aidants', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ userId: activeUserId, prenom: newAidantName.trim(), order: aidants.length }),
    }).then(r => r.json())
    setAidants(prev => [...prev, created])
    setFormAidants(prev => [...prev, created.prenom])
    setNewAidantName('')
    setShowAddAidant(false)
    setAddingAidant(false)
  }

  // Ajoute un motif rapide à la liste (du bon camp selon l'évaluation en cours) et le coche.
  const addMotifInline = async () => {
    if (!activeUserId || !formRating || !newMotifLabel.trim()) return
    setAddingMotif(true)
    const res = await fetch('/api/liaison-motifs', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({
        userId: activeUserId,
        label: newMotifLabel.trim(),
        kind: isBadRating(formRating) ? 'negatif' : 'positif',
        order: motifs.length,
      }),
    })
    if (res.ok) {
      const created: Motif = await res.json()
      setMotifs(prev => prev.some(m => m.id === created.id) ? prev : [...prev, created])
      setFormMotifs(prev => prev.includes(created.label) ? prev : [...prev, created.label])
      setNewMotifLabel('')
      setShowAddMotif(false)
    }
    setAddingMotif(false)
  }

  const loadDefaultMotifs = async () => {
    if (!activeUserId) return
    setLoadingMotifs(true)
    const created = await Promise.all(
      DEFAULT_MOTIFS.map((m, i) =>
        fetch('/api/liaison-motifs', {
          method: 'POST',
          headers: JSON_HEADERS,
          body: JSON.stringify({ userId: activeUserId, label: m.label, kind: m.kind, order: i }),
        }).then(r => (r.ok ? (r.json() as Promise<Motif>) : null)),
      ),
    )
    setMotifs(created.filter((m): m is Motif => !!m))
    setLoadingMotifs(false)
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

  const postEntry = async (payload: {
    rating: RatingKey
    aidants: string[]
    moment: MomentKey | null
    motifs: string[]
    comment: string | null
  }): Promise<Entry | null> => {
    const res = await fetch('/api/liaison-entries', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ userId: activeUserId, date: entryDate, ...payload }),
    })
    if (!res.ok) {
      setErrorMsg("Impossible d'enregistrer pour l'instant, réessaie dans un instant.")
      return null
    }
    setErrorMsg('')
    const saved = normalizeEntry(await res.json())
    setEntries(prev => [...prev, saved])
    // Un jour qui reçoit une évaluation n'est plus « sans visite » (le serveur fait pareil).
    setNoVisitDays(prev => prev.filter(d => d !== entryDate))
    return saved
  }

  const saveForm = async () => {
    if (!activeUserId || !formRating || formAidants.length === 0) return
    setSaving(true)
    const payload = {
      rating: formRating,
      aidants: formAidants,
      moment: formMoment,
      motifs: formMotifs,
      comment: formComment.trim() || null,
    }
    let saved: Entry | null = null
    const wasNew = editingId === 'new'
    if (wasNew) {
      saved = await postEntry(payload)
    } else {
      const res = await fetch('/api/liaison-entries', {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ id: editingId, ...payload }),
      })
      if (res.ok) {
        setErrorMsg('')
        saved = normalizeEntry(await res.json())
        const updated = saved
        setEntries(prev => prev.map(x => x.id === updated.id ? updated : x))
      } else {
        setErrorMsg("Impossible d'enregistrer pour l'instant, réessaie dans un instant.")
      }
    }
    setSaving(false)
    if (!saved) return
    setEditingId(null)
    // On propose de prévenir l'agence pour une nouvelle évaluation négative, ou si on complète
    // (motifs, précision…) celle qui venait de déclencher la proposition.
    if (isBadRating(saved.rating) && (wasNew || alertEntry?.id === saved.id)) setAlertEntry(saved)
    else if (alertEntry?.id === saved.id) setAlertEntry(null)
  }

  const deleteEntry = async (e: Entry) => {
    if (!confirm(`Supprimer cette évaluation du ${formatShortFr(e.date)} ?`)) return
    await fetch('/api/liaison-entries?id=' + e.id, { method: 'DELETE' })
    setEntries(prev => prev.filter(x => x.id !== e.id))
    if (editingId === e.id) setEditingId(null)
    if (alertEntry?.id === e.id) setAlertEntry(null)
  }

  // Aidant du planning absent de la liste : on l'ajoute (même mécanisme que « + Ajouter un aidant »).
  const ensureAidant = async (prenom: string): Promise<string> => {
    const found = aidants.find(a => norm(a.prenom) === norm(prenom))
    if (found) return found.prenom
    const res = await fetch('/api/mail-aidants', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ userId: activeUserId, prenom, order: aidants.length }),
    })
    if (!res.ok) return prenom
    const created: Aidant = await res.json()
    setAidants(prev => [...prev, created])
    return created.prenom
  }

  // Un seul appui sur un passage prévu : l'évaluation est enregistrée avec l'aidant et le moment.
  // Si elle est négative, on ouvre aussitôt le formulaire (motifs, précision) et on propose de prévenir l'agence.
  const quickRate = async (v: { id: string; prenom: string; moment: MomentKey | null }, rating: RatingKey) => {
    if (!activeUserId) return
    setQuickSaving(v.id)
    const prenom = await ensureAidant(v.prenom)
    const saved = await postEntry({ rating, aidants: [prenom], moment: v.moment, motifs: [], comment: null })
    setQuickSaving(null)
    if (saved && isBadRating(rating)) {
      setAlertEntry(saved)
      startEdit(saved)
    }
  }

  // Prévenir l'agence tout de suite : on dépose un mail déjà rédigé pour le module Mails.
  const warnAgency = (e: Entry) => {
    const mail = buildIncidentMail(e, profile.firstName || '')
    try {
      sessionStorage.setItem('simplavie_mail_prefill', JSON.stringify(mail))
      router.push('/modules/mails?prefill=1')
    } catch {
      router.push('/modules/mails')
    }
  }

  const markNoVisit = async () => {
    if (!activeUserId) return
    const res = await fetch('/api/liaison-no-visit', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ userId: activeUserId, date: entryDate }),
    })
    if (res.ok) {
      setErrorMsg('')
      setNoVisitDays(prev => prev.includes(entryDate) ? prev : [...prev, entryDate])
    } else {
      setErrorMsg("Impossible de marquer ce jour pour l'instant, réessaie dans un instant.")
    }
  }

  const unmarkNoVisit = async () => {
    if (!activeUserId) return
    await fetch(`/api/liaison-no-visit?userId=${activeUserId}&date=${entryDate}`, { method: 'DELETE' })
    setNoVisitDays(prev => prev.filter(d => d !== entryDate))
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
      headers: JSON_HEADERS,
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
      headers: JSON_HEADERS,
      body: JSON.stringify({ userId: activeUserId, weekStart: days[0] }),
    })
  }

  const weekEntries = useMemo(
    () => entries.filter(e => days.includes(e.date)).sort((a, b) => a.date.localeCompare(b.date)),
    [entries, days],
  )
  // Un jour est « fait » s'il a une évaluation OU s'il est marqué « sans visite ».
  const noVisitInWeek = days.filter(d => noVisitDays.includes(d))
  const daysDone = new Set([...weekEntries.map(e => e.date), ...noVisitInWeek])
  const missingDays = days.filter(d => !daysDone.has(d))
  const weekComplete = missingDays.length === 0
  const counts = RATINGS.map(r => ({ ...r, count: weekEntries.filter(e => e.rating === r.key).length }))
  const avgScore = averageScore(weekEntries.map(e => e.rating))
  const overall = avgScore !== null ? RATINGS.find(r => r.key === overallRating(avgScore))! : null

  // Résumé par aidant : la semaine affichée, et les 4 dernières semaines (qui se terminent à la semaine affichée).
  const weekStats = useMemo(() => aidantStats(weekEntries), [weekEntries])
  const fourWeeksStart = useMemo(() => weekDates(weekOffset - 3)[0], [weekOffset])
  const fourWeeksStats = useMemo(
    () => aidantStats(entries.filter(e => e.date >= fourWeeksStart && e.date <= days[6])),
    [entries, fourWeeksStart, days],
  )
  const shownStats = statsPeriod === 'semaine' ? weekStats : fourWeeksStats

  const recipientEmails = responsables.filter(r => selectedResp.includes(r.id)).map(r => r.email)

  const bilanSubject = `Bilan de la semaine du ${formatShortFr(days[0])} au ${formatShortFr(days[6])}`
  const bilanBody = useMemo(() => {
    const intro = `Bonjour,\n\nVoici mon bilan de satisfaction pour la semaine du ${formatShortFr(days[0])} au ${formatShortFr(days[6])} :\n`
    const globalLine = overall ? `Satisfaction globale de la semaine : ${overall.emoji} ${overall.label} (moyenne ${formatAverageFr(avgScore!)}/4)\n\n` : ''
    const countLines = counts.map(c => `${c.emoji} ${c.label} : ${c.count} intervention(s)`).join('\n')
    const noVisitLine = noVisitInWeek.length > 0 ? `\nJour(s) sans intervention : ${noVisitInWeek.length}` : ''

    const lines: string[] = []
    for (const d of days) {
      const es = weekEntries.filter(e => e.date === d)
      if (es.length === 0) {
        if (noVisitInWeek.includes(d)) lines.push(`- ${formatDayFr(d)} : pas d'intervention`)
        continue
      }
      for (const e of es) {
        const info = RATINGS.find(r => r.key === e.rating)!
        const mo = momentInfo(e.moment)
        const when = mo ? ` (${mo.label.toLowerCase()})` : ''
        const who = e.aidants.length > 0 ? ` (${joinNames(e.aidants)})` : ''
        const why = e.motifs.length > 0 ? ` [${e.motifs.join(', ')}]` : ''
        const note = e.comment ? ` — ${e.comment}` : ''
        lines.push(`- ${formatDayFr(d)}${when} : ${info.emoji} ${info.label}${who}${why}${note}`)
      }
    }
    const detailLines = lines.length > 0 ? '\n\nDétail :\n' + lines.join('\n') : ''

    let aidantLines = ''
    if (includeAidantSummary && weekStats.length > 0) {
      const monthByName = new Map(fourWeeksStats.map(s => [s.name, s]))
      aidantLines = '\n\nPar aidant :\n' + weekStats.map(s => {
        const lvl = RATINGS.find(r => r.key === overallRating(s.avg))!
        const motifsTxt = s.topMotifs.length > 0
          ? ` (motifs : ${s.topMotifs.map(m => (m.count > 1 ? `${m.label} ×${m.count}` : m.label)).join(', ')})`
          : ''
        const badTxt = s.bad > 0 ? ` — ${s.bad} « Mal / Très mal »${motifsTxt}` : ''
        const m4 = monthByName.get(s.name)
        const trend = m4 && m4.count > s.count ? ` (4 dernières semaines : ${formatAverageFr(m4.avg)}/4)` : ''
        return `- ${s.name} : ${lvl.emoji} ${formatAverageFr(s.avg)}/4 sur ${s.count} intervention(s) cette semaine${badTxt}${trend}`
      }).join('\n')
    }

    const signature = profile.firstName ? `\n\n${profile.firstName}` : ''
    return `${intro}\n${globalLine}${countLines}${noVisitLine}${aidantLines}${detailLines}${signature}\n\n${MAIL_DISCLAIMER}`
  }, [days, counts, weekEntries, noVisitInWeek, profile.firstName, overall, avgScore, includeAidantSummary, weekStats, fourWeeksStats])

  const copyBilan = () => {
    const ccLine = ccEmails.length > 0 ? `Copie : ${ccEmails.join(', ')}\n` : ''
    navigator.clipboard.writeText(`Objet : ${bilanSubject}\n${ccLine}\n${bilanBody}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    markWeekSent()
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="text-xl text-gray-400">Chargement...</div></div>

  // Motifs proposés selon le type d'évaluation en cours (négatif pour Mal / Très mal, positif sinon),
  // plus ceux déjà cochés qui ne seraient plus dans la liste (ex. supprimés depuis).
  const formIsBad = formRating ? isBadRating(formRating) : false
  const kindMotifs = formRating ? motifs.filter(m => m.kind === (formIsBad ? 'negatif' : 'positif')) : []
  const shownMotifLabels = [
    ...kindMotifs.map(m => m.label),
    ...formMotifs.filter(l => !kindMotifs.some(m => m.label === l)),
  ]

  const chipClass = (active: boolean) =>
    `px-4 py-2 rounded-xl font-semibold text-sm border-2 active:scale-95 transition-all ${active ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-200'}`
  const dashedChipClass = (active: boolean) =>
    `px-4 py-2 rounded-xl font-semibold text-sm border-2 border-dashed active:scale-95 transition-all ${active ? 'bg-indigo-50 border-indigo-400 text-indigo-600' : 'bg-white border-gray-300 text-gray-500 hover:border-indigo-200'}`

  const ratingForm = (
    <div className="bg-white rounded-2xl p-5 shadow-sm mb-3 border-2 border-indigo-100">
      <p className="text-sm text-gray-500 mb-3">Comment ça s&apos;est passé ?</p>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {RATINGS.map(r => (
          <button
            key={r.key}
            onClick={() => selectRating(r.key)}
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
            <button key={a.id} onClick={() => toggleFormAidant(a.prenom)} className={chipClass(formAidants.includes(a.prenom))}>
              {a.prenom}
            </button>
          ))}
          <button onClick={() => setShowAddAidant(v => !v)} className={dashedChipClass(showAddAidant)}>
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
        <p className="text-sm text-gray-500 mb-2">À quel moment ? (optionnel)</p>
        <div className="flex flex-wrap gap-2">
          {MOMENTS.map(m => (
            <button
              key={m.key}
              onClick={() => setFormMoment(formMoment === m.key ? null : m.key)}
              className={chipClass(formMoment === m.key)}
            >
              {m.emoji} {m.label}
            </button>
          ))}
        </div>
      </div>

      {formRating && (
        <div className="mb-4">
          <p className="text-sm text-gray-500 mb-2">
            {formIsBad ? "Qu'est-ce qui n'a pas été ? (optionnel)" : "Qu'est-ce qui s'est bien passé ? (optionnel)"}
          </p>
          <div className="flex flex-wrap gap-2">
            {shownMotifLabels.map(label => (
              <button key={label} onClick={() => toggleFormMotif(label)} className={chipClass(formMotifs.includes(label))}>
                {label}
              </button>
            ))}
            <button onClick={() => setShowAddMotif(v => !v)} className={dashedChipClass(showAddMotif)}>
              + Ajouter un motif
            </button>
          </div>
          {showAddMotif && (
            <div className="flex gap-2 mt-3">
              <input
                type="text"
                value={newMotifLabel}
                onChange={e => setNewMotifLabel(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addMotifInline() }}
                placeholder={formIsBad ? 'ex: Parle trop fort' : 'ex: Très souriante'}
                autoFocus
                className="flex-1 border-2 border-gray-200 rounded-xl p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <button
                onClick={addMotifInline}
                disabled={!newMotifLabel.trim() || addingMotif}
                className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-semibold active:scale-95 transition-all disabled:opacity-40"
              >
                {addingMotif ? '...' : 'Ajouter'}
              </button>
            </div>
          )}
          {motifs.length === 0 && (
            <button
              onClick={loadDefaultMotifs}
              disabled={loadingMotifs}
              className="mt-3 text-sm px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold active:scale-95 transition-all disabled:opacity-40"
            >
              {loadingMotifs ? 'Chargement...' : '📥 Charger les motifs de base'}
            </button>
          )}
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
          const isNoVisit = !hasEntry && noVisitDays.includes(d)
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
              <span className="text-[10px] leading-none" title={isNoVisit ? "Pas d'intervention" : undefined}>{hasEntry ? '●' : isNoVisit ? '–' : ''}</span>
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

      {errorMsg && (
        <div className="bg-red-50 border-2 border-red-200 text-red-700 rounded-2xl p-3 text-sm font-semibold mb-4">{errorMsg}</div>
      )}

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

            {alertEntry && (
              <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 mb-3">
                <p className="font-semibold text-red-700 mb-3">
                  {RATINGS.find(r => r.key === alertEntry.rating)!.emoji} Prévenir l&apos;agence maintenant ?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => warnAgency(alertEntry)}
                    className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold active:scale-95 transition-all"
                  >
                    📧 Écrire à l&apos;agence
                  </button>
                  <button
                    onClick={() => setAlertEntry(null)}
                    className="px-4 py-3 rounded-xl border-2 border-gray-300 text-gray-600 font-semibold active:scale-95 transition-all"
                  >
                    Plus tard
                  </button>
                </div>
              </div>
            )}

            {plannedVisits.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-semibold text-gray-600 mb-2">📅 Prévu ce jour-là</p>
                {plannedVisits.map(v => {
                  const done = doneEntryFor(v)
                  const mo = momentInfo(v.moment)
                  return (
                    <div key={v.id} className="bg-white rounded-2xl p-3 shadow-sm border-2 border-gray-100 mb-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-semibold text-gray-700">{v.prenom}</span>
                          <span className="text-sm text-gray-400"> · {v.time}{mo ? ` · ${mo.emoji} ${mo.label}` : ''}</span>
                        </div>
                        {done && (
                          <span className="text-sm text-green-600 font-semibold shrink-0">
                            ✓ {RATINGS.find(r => r.key === done.rating)!.emoji}
                          </span>
                        )}
                      </div>
                      {!done && (
                        <div className="grid grid-cols-4 gap-2 mt-2">
                          {RATINGS.map(r => (
                            <button
                              key={r.key}
                              onClick={() => quickRate(v, r.key)}
                              disabled={quickSaving === v.id}
                              aria-label={`${v.prenom} : ${r.label}`}
                              title={r.label}
                              className="py-3 rounded-xl border-2 border-gray-200 text-2xl active:scale-95 hover:border-indigo-300 transition-all disabled:opacity-40"
                            >
                              {r.emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {dayEntries.map(e => {
              if (editingId === e.id) return <div key={e.id}>{ratingForm}</div>
              const info = RATINGS.find(r => r.key === e.rating)!
              const mo = momentInfo(e.moment)
              return (
                <div key={e.id} className="bg-white rounded-2xl p-4 shadow-sm border-2 border-gray-100 mb-2">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{info.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-700">
                        {info.label}{mo ? <span className="font-normal text-gray-400"> · {mo.emoji} {mo.label}</span> : null}
                      </div>
                      {e.aidants.length > 0 && <div className="text-sm text-gray-500 break-words">{joinNames(e.aidants)}</div>}
                      {e.motifs.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {e.motifs.map(m => (
                            <span key={m} className="text-xs bg-gray-100 text-gray-600 rounded-full px-2.5 py-1 break-words">{m}</span>
                          ))}
                        </div>
                      )}
                      {e.comment && <div className="text-sm text-gray-600 whitespace-pre-wrap break-words mt-1.5">{e.comment}</div>}
                      {isBadRating(e.rating) && (
                        <button
                          onClick={() => warnAgency(e)}
                          className="mt-2 text-xs px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-semibold active:scale-95 transition-all"
                        >
                          📧 Prévenir l&apos;agence
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => startEdit(e)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-indigo-100 text-gray-500 hover:text-indigo-600 active:scale-95 transition-all text-sm">✏️</button>
                      <button onClick={() => deleteEntry(e)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-500 active:scale-95 transition-all text-sm">🗑️</button>
                    </div>
                  </div>
                </div>
              )
            })}

            {editingId === 'new' ? ratingForm : (
              <button
                onClick={startAdd}
                className="w-full py-4 rounded-2xl border-2 border-dashed border-indigo-300 text-indigo-600 font-bold active:scale-95 transition-all hover:bg-indigo-50"
              >
                + Ajouter une évaluation{dayEntries.length > 0 ? ' (un autre aidant ?)' : ''}
              </button>
            )}

            {dayEntries.length === 0 && (
              noVisitDays.includes(entryDate) ? (
                <div className="mt-3 bg-gray-50 border-2 border-gray-200 rounded-2xl p-3 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-gray-600">🚫 Personne n&apos;est passé ce jour-là</span>
                  <button onClick={unmarkNoVisit} className="text-xs px-3 py-1.5 rounded-lg bg-white border-2 border-gray-200 text-gray-600 font-semibold active:scale-95 transition-all">
                    Annuler
                  </button>
                </div>
              ) : (
                <button
                  onClick={markNoVisit}
                  className="mt-3 w-full py-3 rounded-2xl border-2 border-dashed border-gray-300 text-gray-500 font-semibold active:scale-95 transition-all hover:bg-gray-50"
                >
                  🚫 Personne n&apos;est passé ce jour-là
                </button>
              )
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

          <section className="bg-white rounded-2xl p-5 shadow-sm border-2 border-gray-100">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="text-base font-semibold text-gray-700">👥 Par aidant</h2>
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                {([['semaine', 'Cette semaine'], ['quatre', '4 semaines']] as const).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setStatsPeriod(key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${statsPeriod === key ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {shownStats.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-3">Aucune évaluation sur cette période.</p>
            ) : (
              <div className="space-y-2">
                {shownStats.map(s => {
                  const lvl = RATINGS.find(r => r.key === overallRating(s.avg))!
                  return (
                    <div key={s.name} className="rounded-xl bg-gray-50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-gray-700 break-words">{s.name}</span>
                        <span className="text-sm text-gray-600 shrink-0">{lvl.emoji} {formatAverageFr(s.avg)}/4</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {s.count} intervention(s){s.bad > 0 ? ` · ${s.bad} « Mal / Très mal »` : ''}
                      </div>
                      {s.topMotifs.length > 0 && (
                        <div className="text-xs text-gray-500 mt-1 break-words">
                          Motifs : {s.topMotifs.map(m => (m.count > 1 ? `${m.label} ×${m.count}` : m.label)).join(', ')}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {!weekComplete ? (
            <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-5">
              <p className="font-semibold text-orange-700 mb-2">Il manque une évaluation pour :</p>
              <ul className="text-orange-700 text-sm space-y-1 mb-3">
                {missingDays.map(d => <li key={d}>• {formatDayFr(d)}</li>)}
              </ul>
              <p className="text-sm text-orange-600">
                Le bilan ne peut être envoyé que lorsque chaque jour de la semaine a au moins une évaluation,
                ou est marqué « personne n&apos;est passé ce jour-là ».
              </p>
            </div>
          ) : (
            <>
              {weekStats.length > 0 && (
                <label className="flex items-start gap-3 bg-white rounded-2xl p-4 shadow-sm border-2 border-gray-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeAidantSummary}
                    onChange={e => setIncludeAidantSummary(e.target.checked)}
                    className="mt-1 w-5 h-5 accent-indigo-500"
                  />
                  <span>
                    <span className="block font-semibold text-gray-700">Ajouter le résumé par aidant au mail</span>
                    <span className="block text-xs text-gray-400">Moyenne et motifs de chaque aidant cette semaine. Décoche si tu préfères ne garder que le détail jour par jour.</span>
                  </span>
                </label>
              )}

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
                    <p className="text-gray-600 whitespace-pre-wrap break-words">{bilanBody}</p>
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
