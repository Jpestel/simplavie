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

type Step = 'template' | 'champs' | 'destinataires' | 'apercu'

export default function MailsPage() {
  const { activeUserId } = useAuth()
  const { profile } = useProfile()
  const [loading, setLoading] = useState(true)

  const [responsables, setResponsables] = useState<Responsable[]>([])
  const [aidants, setAidants] = useState<Aidant[]>([])
  const [equipements, setEquipements] = useState<Equipement[]>([])
  const [templates, setTemplates] = useState<Template[]>([])

  const [step, setStep] = useState<Step>('template')
  const [template, setTemplate] = useState<Template | null>(null)
  const [selectedAidants, setSelectedAidants] = useState<string[]>([])
  const [selectedEquipements, setSelectedEquipements] = useState<string[]>([])
  const [customEquipement, setCustomEquipement] = useState('')
  const [showCustomEquipement, setShowCustomEquipement] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({})
  const [selectedResp, setSelectedResp] = useState<string[]>([])
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!activeUserId) return
    Promise.all([
      fetch(`/api/mail-responsables?userId=${activeUserId}`).then(r => r.json()),
      fetch(`/api/mail-aidants?userId=${activeUserId}`).then(r => r.json()),
      fetch(`/api/mail-equipements?userId=${activeUserId}`).then(r => r.json()),
      fetch(`/api/mail-templates?userId=${activeUserId}`).then(r => r.json()),
    ]).then(([resp, aid, equip, tpl]) => {
      setResponsables(Array.isArray(resp) ? resp : [])
      setAidants(Array.isArray(aid) ? aid : [])
      setEquipements(Array.isArray(equip) ? equip : [])
      setTemplates(Array.isArray(tpl) ? tpl : [])
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
    const today = new Date().toISOString().slice(0, 10)
    const now = new Date().toTimeString().slice(0, 5)
    setValues({ date: today, heure: now })
    const tTokens = extractTokens(t.subject, t.body)
    setStep(tTokens.some(x => x !== 'prenom') ? 'champs' : 'destinataires')
  }

  const toggleAidant = (id: string) => {
    setSelectedAidants(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const toggleEquipement = (id: string) => {
    setSelectedEquipements(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const toggleResp = (id: string) => {
    setSelectedResp(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

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
    setCopied(false)
  }

  const copyText = () => {
    navigator.clipboard.writeText(`Objet : ${finalSubject}\n\n${finalBody}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
              </div>
              {aidants.length === 0 && <p className="text-sm text-gray-400 mt-2">Aucun aidant configuré — ajoute-en un dans les réglages.</p>}
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
          </section>

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
            <p className="font-bold text-gray-800 mb-3">{finalSubject}</p>
            <p className="text-gray-600 whitespace-pre-wrap">{finalBody}</p>
          </section>

          <div className="space-y-3">
            <a
              href={buildMailtoUrl(recipientEmails, finalSubject, finalBody)}
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
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setStep('destinataires')} className="flex-1 py-4 rounded-2xl border-2 border-gray-300 text-gray-600 font-semibold text-lg active:scale-95 transition-all">← Retour</button>
            <button onClick={reset} className="flex-1 py-4 rounded-2xl border-2 border-gray-300 text-gray-600 font-semibold text-lg active:scale-95 transition-all">Nouveau mail</button>
          </div>
        </div>
      )}
    </main>
  )
}
