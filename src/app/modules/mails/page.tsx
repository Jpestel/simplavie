'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/authContext'
import { useProfile } from '@/lib/profileContext'
import {
  extractTokens, isCaregiverToken, isEquipmentToken, tokenLabel, formatDateFr, formatHeureFr,
  joinNames, fillTemplate, buildMailtoUrl, MAIL_DISCLAIMER,
} from '@/lib/mailTemplateTokens'

type Responsable = { id: string; nom: string; prenom: string | null; email: string }
type Aidant = { id: string; prenom: string }
type Equipement = { id: string; label: string }
type Template = { id: string; label: string; subject: string; body: string }
type Draft = { id: string; label: string; subject: string; body: string; recipients: string[]; cc?: string[]; createdAt: string }

type Step = 'template' | 'champs' | 'destinataires' | 'apercu' | 'brouillons' | 'brouillon-apercu'

export default function MailsPage() {
  const { activeUserId } = useAuth()
  const { profile } = useProfile()
  const [loading, setLoading] = useState(true)

  const [responsables, setResponsables] = useState<Responsable[]>([])
  const [aidants, setAidants] = useState<Aidant[]>([])
  const [equipements, setEquipements] = useState<Equipement[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [drafts, setDrafts] = useState<Draft[]>([])

  const [step, setStep] = useState<Step>('template')
  const [template, setTemplate] = useState<Template | null>(null)
  const [selectedAidants, setSelectedAidants] = useState<string[]>([])
  const [selectedEquipements, setSelectedEquipements] = useState<string[]>([])
  const [customEquipement, setCustomEquipement] = useState('')
  const [showCustomEquipement, setShowCustomEquipement] = useState(false)
  const [showAddAidant, setShowAddAidant] = useState(false)
  const [newAidantName, setNewAidantName] = useState('')
  const [addingAidant, setAddingAidant] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({})
  const [selectedResp, setSelectedResp] = useState<string[]>([])
  const [showAddResp, setShowAddResp] = useState(false)
  const [newRespPrenom, setNewRespPrenom] = useState('')
  const [newRespNom, setNewRespNom] = useState('')
  const [newRespEmail, setNewRespEmail] = useState('')
  const [addingResp, setAddingResp] = useState(false)
  const [addRespError, setAddRespError] = useState('')
  const [selectedCcContacts, setSelectedCcContacts] = useState<string[]>([])
  const [copied, setCopied] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null)
  const [draftCopied, setDraftCopied] = useState(false)

  const loadDrafts = async () => {
    if (!activeUserId) return
    const d = await fetch(`/api/mail-drafts?userId=${activeUserId}`).then(r => r.json())
    setDrafts(Array.isArray(d) ? d : [])
  }

  useEffect(() => {
    if (!activeUserId) return
    Promise.all([
      fetch(`/api/mail-responsables?userId=${activeUserId}`).then(r => r.json()),
      fetch(`/api/mail-aidants?userId=${activeUserId}`).then(r => r.json()),
      fetch(`/api/mail-equipements?userId=${activeUserId}`).then(r => r.json()),
      fetch(`/api/mail-templates?userId=${activeUserId}`).then(r => r.json()),
      fetch(`/api/mail-drafts?userId=${activeUserId}`).then(r => r.json()),
    ]).then(([resp, aid, equip, tpl, dr]) => {
      setResponsables(Array.isArray(resp) ? resp : [])
      setAidants(Array.isArray(aid) ? aid : [])
      setEquipements(Array.isArray(equip) ? equip : [])
      setTemplates(Array.isArray(tpl) ? tpl : [])
      setDrafts(Array.isArray(dr) ? dr : [])
      setLoading(false)
    })
  }, [activeUserId])

  const tokens = useMemo(() => template ? extractTokens(template.subject, template.body) : [], [template])
  const caregiverTokenUsed = tokens.some(isCaregiverToken)
  const equipmentTokenUsed = tokens.some(isEquipmentToken)
  const freeTokens = tokens.filter(t => !isCaregiverToken(t) && !isEquipmentToken(t) && t !== 'prenom')

  const startTemplate = (t: Template) => {
    setTemplate(t)
    setSelectedAidants([])
    setSelectedEquipements([])
    setCustomEquipement('')
    setShowCustomEquipement(false)
    // Pas de toISOString() ici : elle convertit en UTC et peut faire reculer
    // la date d'un jour selon l'heure locale (voir liaisonRatings.ts).
    const nowDate = new Date()
    const today = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, '0')}-${String(nowDate.getDate()).padStart(2, '0')}`
    const now = nowDate.toTimeString().slice(0, 5)
    setValues({ date: today, heure: now })
    setSelectedCcContacts([])
    const tTokens = extractTokens(t.subject, t.body)
    setStep(tTokens.some(x => x !== 'prenom') ? 'champs' : 'destinataires')
  }

  const toggleAidant = (id: string) => {
    setSelectedAidants(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
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
    setSelectedAidants(prev => [...prev, created.id])
    setNewAidantName('')
    setShowAddAidant(false)
    setAddingAidant(false)
  }

  const toggleEquipement = (id: string) => {
    setSelectedEquipements(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
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

  // Contacts (module Contacts) ayant un e-mail, proposés en copie.
  const contactsWithEmail = (profile.contacts || []).filter(c => c.email && c.email.trim())

  // Quentin est toujours mis en copie de ses propres mails (si son e-mail est
  // renseigné dans son profil), en plus des proches qu'il choisit.
  const ccEmails = [
    ...(profile.email && profile.email.trim() ? [profile.email.trim()] : []),
    ...contactsWithEmail.filter(c => selectedCcContacts.includes(c.id)).map(c => c.email!.trim()),
  ]

  const equipementNames = [
    ...equipements.filter(e => selectedEquipements.includes(e.id)).map(e => e.label),
    ...(customEquipement.trim() ? [customEquipement.trim()] : []),
  ]

  const canGoToDestinataires = (!caregiverTokenUsed || selectedAidants.length > 0)
    && (!equipmentTokenUsed || equipementNames.length > 0)

  const finalValues: Record<string, string> = {
    ...values,
    date: formatDateFr(values.date || ''),
    heure: formatHeureFr(values.heure || ''),
    prenom: profile.firstName || '',
    aidant: joinNames(aidants.filter(a => selectedAidants.includes(a.id)).map(a => a.prenom)),
    aidants: joinNames(aidants.filter(a => selectedAidants.includes(a.id)).map(a => a.prenom)),
    equipement: joinNames(equipementNames),
    equipements: joinNames(equipementNames),
  }

  const finalSubject = template ? fillTemplate(template.subject, finalValues) : ''
  const finalBody = template ? `${fillTemplate(template.body, finalValues)}\n\n${MAIL_DISCLAIMER}` : ''
  const recipientEmails = responsables.filter(r => selectedResp.includes(r.id)).map(r => r.email)

  const reset = () => {
    setStep('template')
    setTemplate(null)
    setSelectedAidants([])
    setSelectedEquipements([])
    setCustomEquipement('')
    setShowCustomEquipement(false)
    setValues({})
    setSelectedResp([])
    setSelectedCcContacts([])
    setCopied(false)
  }

  const copyText = () => {
    const ccLine = ccEmails.length > 0 ? `Copie : ${ccEmails.join(', ')}\n` : ''
    navigator.clipboard.writeText(`Objet : ${finalSubject}\n${ccLine}\n${finalBody}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const saveDraftForLater = async () => {
    if (!activeUserId || !template) return
    setSavingDraft(true)
    await fetch('/api/mail-drafts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: activeUserId,
        label: template.label,
        subject: finalSubject,
        body: finalBody,
        recipients: recipientEmails,
        cc: ccEmails,
      }),
    })
    await loadDrafts()
    setSavingDraft(false)
    reset()
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 5000)
  }

  const openDraft = (d: Draft) => {
    setSelectedDraft(d)
    setDraftCopied(false)
    setStep('brouillon-apercu')
  }

  const deleteDraft = async (d: Draft) => {
    if (!confirm(`Supprimer ce mail enregistré ("${d.label}") ?`)) return
    await fetch('/api/mail-drafts?id=' + d.id, { method: 'DELETE' })
    setDrafts(prev => prev.filter(x => x.id !== d.id))
    if (selectedDraft?.id === d.id) {
      setSelectedDraft(null)
      setStep('brouillons')
    }
  }

  const copyDraftText = () => {
    if (!selectedDraft) return
    const cc = selectedDraft.cc || []
    const ccLine = cc.length > 0 ? `Copie : ${cc.join(', ')}\n` : ''
    navigator.clipboard.writeText(`Objet : ${selectedDraft.subject}\n${ccLine}\n${selectedDraft.body}`)
    setDraftCopied(true)
    setTimeout(() => setDraftCopied(false), 2000)
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="text-xl text-gray-400">Chargement...</div></div>

  if (responsables.length === 0) {
    return (
      <main className="min-h-screen p-6 max-w-lg mx-auto flex flex-col items-center justify-center text-center">
        <div className="text-6xl mb-4">✉️</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Aucun responsable configuré</h1>
        <p className="text-gray-500 mb-6">Il faut d&apos;abord ajouter au moins un responsable à qui écrire, dans les réglages.</p>
        <Link href="/modules/mails/reglages" className="w-full py-4 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-lg active:scale-95 transition-all">
          Aller aux réglages →
        </Link>
      </main>
    )
  }

  if (templates.length === 0) {
    return (
      <main className="min-h-screen p-6 max-w-lg mx-auto flex flex-col items-center justify-center text-center">
        <div className="text-6xl mb-4">📝</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Aucun modèle de mail</h1>
        <p className="text-gray-500 mb-6">Ajoute au moins un modèle de mail dans les réglages pour pouvoir en écrire un.</p>
        <Link href="/modules/mails/reglages" className="w-full py-4 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-lg active:scale-95 transition-all">
          Aller aux réglages →
        </Link>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">✉️ Écrire un mail</h1>
      </div>

      {/* ── STEP: TEMPLATE ── */}
      {step === 'template' && (
        <div className="space-y-3">
          {justSaved && (
            <div className="bg-green-50 border-2 border-green-200 text-green-700 rounded-2xl p-4 font-semibold mb-2">
              ✓ Mail enregistré. Tu pourras l&apos;envoyer plus tard depuis « Mails enregistrés ».
            </div>
          )}
          {drafts.length > 0 && (
            <button
              onClick={() => setStep('brouillons')}
              className="w-full flex items-center justify-between bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-4 mb-2 text-indigo-700 font-semibold active:scale-95 transition-all"
            >
              <span>📥 Mails enregistrés</span>
              <span className="bg-indigo-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm">{drafts.length}</span>
            </button>
          )}
          <p className="text-gray-500 mb-2">De quoi veux-tu parler ?</p>
          {templates.map(t => (
            <button
              key={t.id}
              onClick={() => startTemplate(t)}
              className="w-full text-left bg-white rounded-2xl p-5 shadow-sm border-2 border-gray-100 hover:border-indigo-300 hover:bg-indigo-50 active:scale-95 transition-all font-semibold text-gray-700 text-lg"
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* ── STEP: CHAMPS ── */}
      {step === 'champs' && template && (
        <div className="space-y-6">
          <p className="text-gray-500">{template.label}</p>

          {caregiverTokenUsed && (
            <section>
              <h2 className="text-base font-semibold text-gray-700 mb-3">Quel(s) aidant(s) est/sont concerné(s) ?</h2>
              <div className="flex flex-wrap gap-2">
                {aidants.map(a => (
                  <button
                    key={a.id}
                    onClick={() => toggleAidant(a.id)}
                    className={`px-5 py-3 rounded-2xl font-semibold text-lg border-2 active:scale-95 transition-all ${selectedAidants.includes(a.id) ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-200'}`}
                  >
                    {a.prenom}
                  </button>
                ))}
                <button
                  onClick={() => setShowAddAidant(v => !v)}
                  className={`px-5 py-3 rounded-2xl font-semibold text-lg border-2 border-dashed active:scale-95 transition-all ${showAddAidant ? 'bg-indigo-50 border-indigo-400 text-indigo-600' : 'bg-white border-gray-300 text-gray-500 hover:border-indigo-200'}`}
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
                    className="flex-1 border-2 border-gray-200 rounded-2xl p-3 text-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                  <button
                    onClick={addAidantInline}
                    disabled={!newAidantName.trim() || addingAidant}
                    className="px-5 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-semibold active:scale-95 transition-all disabled:opacity-40"
                  >
                    {addingAidant ? '...' : 'Ajouter'}
                  </button>
                </div>
              )}
            </section>
          )}

          {equipmentTokenUsed && (
            <section>
              <h2 className="text-base font-semibold text-gray-700 mb-3">Quel équipement ?</h2>
              <div className="flex flex-wrap gap-2">
                {equipements.map(e => (
                  <button
                    key={e.id}
                    onClick={() => toggleEquipement(e.id)}
                    className={`px-5 py-3 rounded-2xl font-semibold text-lg border-2 active:scale-95 transition-all ${selectedEquipements.includes(e.id) ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-200'}`}
                  >
                    {e.label}
                  </button>
                ))}
                <button
                  onClick={() => setShowCustomEquipement(v => !v)}
                  className={`px-5 py-3 rounded-2xl font-semibold text-lg border-2 border-dashed active:scale-95 transition-all ${showCustomEquipement ? 'bg-indigo-50 border-indigo-400 text-indigo-600' : 'bg-white border-gray-300 text-gray-500 hover:border-indigo-200'}`}
                >
                  + Autre
                </button>
              </div>
              {showCustomEquipement && (
                <input
                  type="text"
                  value={customEquipement}
                  onChange={e => setCustomEquipement(e.target.value)}
                  placeholder="ex: Fauteuil roulant électrique"
                  className="w-full mt-3 border-2 border-gray-200 rounded-2xl p-4 text-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              )}
              {equipements.length === 0 && !showCustomEquipement && (
                <p className="text-sm text-gray-400 mt-2">Aucun équipement configuré — ajoute-en un dans les réglages, ou choisis « + Autre ».</p>
              )}
            </section>
          )}

          {tokens.includes('date') && (
            <section>
              <h2 className="text-base font-semibold text-gray-700 mb-2">Quel jour ?</h2>
              <input
                type="date"
                value={values.date || ''}
                onChange={e => setValues(v => ({ ...v, date: e.target.value }))}
                className="w-full border-2 border-gray-200 rounded-2xl p-4 text-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </section>
          )}

          {tokens.includes('heure') && (
            <section>
              <h2 className="text-base font-semibold text-gray-700 mb-2">À quelle heure ?</h2>
              <input
                type="time"
                value={values.heure || ''}
                onChange={e => setValues(v => ({ ...v, heure: e.target.value }))}
                className="w-full border-2 border-gray-200 rounded-2xl p-4 text-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </section>
          )}

          {freeTokens.filter(t => t !== 'date' && t !== 'heure').map(t => (
            <section key={t}>
              <h2 className="text-base font-semibold text-gray-700 mb-2">{tokenLabel(t)}</h2>
              <input
                type="text"
                value={values[t] || ''}
                onChange={e => setValues(v => ({ ...v, [t]: e.target.value }))}
                className="w-full border-2 border-gray-200 rounded-2xl p-4 text-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </section>
          ))}

          <div className="flex gap-3 pt-2">
            <button onClick={() => setStep('template')} className="flex-1 py-4 rounded-2xl border-2 border-gray-300 text-gray-600 font-semibold text-lg active:scale-95 transition-all">← Retour</button>
            <button
              onClick={() => setStep('destinataires')}
              disabled={!canGoToDestinataires}
              className="flex-1 py-4 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-lg active:scale-95 transition-all disabled:opacity-40"
            >
              Suivant →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP: DESTINATAIRES ── */}
      {step === 'destinataires' && template && (
        <div className="space-y-6">
          <section>
            <h2 className="text-base font-semibold text-gray-700 mb-3">À qui envoyer ce mail ?</h2>
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

          <div className="flex gap-3 pt-2">
            <button onClick={() => setStep(tokens.some(t => t !== 'prenom') ? 'champs' : 'template')} className="flex-1 py-4 rounded-2xl border-2 border-gray-300 text-gray-600 font-semibold text-lg active:scale-95 transition-all">← Retour</button>
            <button
              onClick={() => setStep('apercu')}
              disabled={selectedResp.length === 0}
              className="flex-1 py-4 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-lg active:scale-95 transition-all disabled:opacity-40"
            >
              Suivant →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP: APERÇU ── */}
      {step === 'apercu' && template && (
        <div className="space-y-6">
          <section className="bg-white rounded-2xl p-5 shadow-sm border-2 border-gray-100">
            <p className="text-xs text-gray-400 mb-1">À : {responsables.filter(r => selectedResp.includes(r.id)).map(r => r.email).join(', ')}</p>
            {ccEmails.length > 0 && <p className="text-xs text-gray-400 mb-1">Copie : {ccEmails.join(', ')}</p>}
            <p className="font-bold text-gray-800 mb-3">{finalSubject}</p>
            <p className="text-gray-600 whitespace-pre-wrap">{finalBody}</p>
          </section>

          <div className="space-y-3">
            <a
              href={buildMailtoUrl(recipientEmails, finalSubject, finalBody, ccEmails)}
              className="block w-full text-center py-4 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-lg active:scale-95 transition-all"
            >
              📧 Envoyer par mail
            </a>
            <button
              onClick={copyText}
              className="w-full py-4 rounded-2xl border-2 border-indigo-300 text-indigo-600 font-bold text-lg active:scale-95 transition-all hover:bg-indigo-50"
            >
              {copied ? '✓ Copié !' : '📋 Copier le texte'}
            </button>
            <button
              onClick={saveDraftForLater}
              disabled={savingDraft}
              className="w-full py-4 rounded-2xl border-2 border-gray-300 text-gray-600 font-bold text-lg active:scale-95 transition-all hover:bg-gray-50 disabled:opacity-40"
            >
              {savingDraft ? '...' : '💾 Enregistrer pour plus tard'}
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setStep('destinataires')} className="flex-1 py-4 rounded-2xl border-2 border-gray-300 text-gray-600 font-semibold text-lg active:scale-95 transition-all">← Retour</button>
            <button onClick={reset} className="flex-1 py-4 rounded-2xl border-2 border-gray-300 text-gray-600 font-semibold text-lg active:scale-95 transition-all">Nouveau mail</button>
          </div>
        </div>
      )}

      {/* ── STEP: BROUILLONS (liste) ── */}
      {step === 'brouillons' && (
        <div className="space-y-3">
          <p className="text-gray-500 mb-2">Mails enregistrés, à envoyer quand tu veux :</p>
          {drafts.map(d => (
            <div key={d.id} className="bg-white rounded-2xl p-4 shadow-sm border-2 border-gray-100">
              <div className="mb-3">
                <p className="font-bold text-gray-800">{d.label}</p>
                <p className="text-sm text-gray-500 truncate">{d.subject}</p>
                <p className="text-xs text-gray-400 mt-1">{new Date(d.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openDraft(d)}
                  className="flex-1 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-semibold active:scale-95 transition-all"
                >
                  Ouvrir
                </button>
                <button
                  onClick={() => deleteDraft(d)}
                  className="w-12 py-3 rounded-xl border-2 border-red-200 text-red-500 hover:bg-red-50 font-bold active:scale-95 transition-all"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
          {drafts.length === 0 && <p className="text-center text-gray-400 text-sm py-6">Aucun mail enregistré.</p>}

          <button onClick={() => setStep('template')} className="w-full py-4 rounded-2xl border-2 border-gray-300 text-gray-600 font-semibold text-lg active:scale-95 transition-all">← Retour</button>
        </div>
      )}

      {/* ── STEP: BROUILLON APERÇU ── */}
      {step === 'brouillon-apercu' && selectedDraft && (
        <div className="space-y-6">
          <section className="bg-white rounded-2xl p-5 shadow-sm border-2 border-gray-100">
            <p className="text-xs text-gray-400 mb-1">À : {selectedDraft.recipients.join(', ')}</p>
            {(selectedDraft.cc || []).length > 0 && <p className="text-xs text-gray-400 mb-1">Copie : {(selectedDraft.cc || []).join(', ')}</p>}
            <p className="font-bold text-gray-800 mb-3">{selectedDraft.subject}</p>
            <p className="text-gray-600 whitespace-pre-wrap">{selectedDraft.body}</p>
          </section>

          <div className="space-y-3">
            <a
              href={buildMailtoUrl(selectedDraft.recipients, selectedDraft.subject, selectedDraft.body, selectedDraft.cc || [])}
              className="block w-full text-center py-4 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-lg active:scale-95 transition-all"
            >
              📧 Envoyer par mail
            </a>
            <button
              onClick={copyDraftText}
              className="w-full py-4 rounded-2xl border-2 border-indigo-300 text-indigo-600 font-bold text-lg active:scale-95 transition-all hover:bg-indigo-50"
            >
              {draftCopied ? '✓ Copié !' : '📋 Copier le texte'}
            </button>
            <button
              onClick={() => deleteDraft(selectedDraft)}
              className="w-full py-4 rounded-2xl border-2 border-red-200 text-red-500 hover:bg-red-50 font-bold text-lg active:scale-95 transition-all"
            >
              🗑️ Supprimer ce mail enregistré
            </button>
          </div>

          <button onClick={() => setStep('brouillons')} className="w-full py-4 rounded-2xl border-2 border-gray-300 text-gray-600 font-semibold text-lg active:scale-95 transition-all">← Retour</button>
        </div>
      )}
    </main>
  )
}
