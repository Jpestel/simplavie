'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/authContext'

type Responsable = { id: string; nom: string; prenom: string | null; email: string; order: number }
type Aidant = { id: string; prenom: string; order: number }
type Equipement = { id: string; label: string; order: number }
type Template = { id: string; label: string; subject: string; body: string; order: number }

const DEFAULT_TEMPLATES: { label: string; subject: string; body: string }[] = [
  {
    label: 'Absence non prévenue',
    subject: 'Absence non prévenue de {{aidant}}',
    body: "Bonjour,\n\n{{aidant}} n'est pas venu(e) le {{date}} à {{heure}}, sans m'avoir prévenu(e).\n\nMerci de votre retour.\n\n{{prenom}}",
  },
  {
    label: 'Retard',
    subject: 'Retard de {{aidant}} le {{date}}',
    body: "Bonjour,\n\n{{aidant}} est arrivé(e) en retard le {{date}}, vers {{heure}}.\n\nMerci de votre retour.\n\n{{prenom}}",
  },
  {
    label: 'Tâche non effectuée',
    subject: 'Tâche non effectuée par {{aidant}}',
    body: "Bonjour,\n\nLors de son passage du {{date}}, {{aidant}} n'a pas fait : {{tache}}.\n\nMerci de votre retour.\n\n{{prenom}}",
  },
  {
    label: 'Difficulté avec un équipement',
    subject: 'Difficulté de {{aidant}} avec un équipement',
    body: "Bonjour,\n\n{{aidant}} n'est pas à l'aise pour utiliser {{equipement}}. Serait-il possible de prévoir une formation ou un point avec {{aidant}} ?\n\nMerci de votre retour.\n\n{{prenom}}",
  },
  {
    label: 'Retour positif',
    subject: 'Un retour positif sur {{aidant}}',
    body: "Bonjour,\n\nJe tenais à signaler que {{aidant}} fait un très bon travail. {{commentaire}}\n\nMerci de le transmettre.\n\n{{prenom}}",
  },
  {
    label: 'Message libre',
    subject: 'Un message de {{prenom}}',
    body: 'Bonjour,\n\n{{message}}\n\nMerci de votre retour.\n\n{{prenom}}',
  },
]

const input = 'w-full border-2 border-gray-200 rounded-xl p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white'

export default function MailsReglagesPage() {
  const { activeUserId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'agence' | 'aidants' | 'equipements' | 'modeles'>('agence')

  const [agencyName, setAgencyName] = useState('')
  const [savingAgency, setSavingAgency] = useState(false)

  const [responsables, setResponsables] = useState<Responsable[]>([])
  const [respForm, setRespForm] = useState<Partial<Responsable> | null>(null)
  const [respEditingId, setRespEditingId] = useState<string | null>(null)
  const [respError, setRespError] = useState('')

  const [aidants, setAidants] = useState<Aidant[]>([])
  const [aidantForm, setAidantForm] = useState('')

  const [equipements, setEquipements] = useState<Equipement[]>([])
  const [equipementForm, setEquipementForm] = useState('')

  const [templates, setTemplates] = useState<Template[]>([])
  const [tplForm, setTplForm] = useState<Partial<Template> | null>(null)
  const [tplEditingId, setTplEditingId] = useState<string | null>(null)
  const [seedingTpl, setSeedingTpl] = useState(false)

  const load = async () => {
    if (!activeUserId) return
    const [settings, resp, aid, equip, tpl] = await Promise.all([
      fetch(`/api/mail-settings?userId=${activeUserId}`).then(r => r.json()),
      fetch(`/api/mail-responsables?userId=${activeUserId}`).then(r => r.json()),
      fetch(`/api/mail-aidants?userId=${activeUserId}`).then(r => r.json()),
      fetch(`/api/mail-equipements?userId=${activeUserId}`).then(r => r.json()),
      fetch(`/api/mail-templates?userId=${activeUserId}`).then(r => r.json()),
    ])
    setAgencyName(settings?.agencyName ?? '')
    setResponsables(Array.isArray(resp) ? resp : [])
    setAidants(Array.isArray(aid) ? aid : [])
    setEquipements(Array.isArray(equip) ? equip : [])
    setTemplates(Array.isArray(tpl) ? tpl : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [activeUserId])

  const saveAgencyName = async () => {
    if (!activeUserId) return
    setSavingAgency(true)
    await fetch('/api/mail-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: activeUserId, agencyName }),
    })
    setSavingAgency(false)
  }

  // ── Responsables ──
  const startRespAdd = () => { setRespForm({ nom: '', prenom: '', email: '' }); setRespEditingId('new'); setRespError('') }
  const startRespEdit = (r: Responsable) => { setRespForm({ ...r }); setRespEditingId(r.id); setRespError('') }
  const cancelResp = () => { setRespForm(null); setRespEditingId(null); setRespError('') }

  const saveResp = async () => {
    if (!activeUserId || !respForm) return
    const nom = (respForm.nom || '').trim()
    const email = (respForm.email || '').trim()
    if (!nom) { setRespError('Indiquez au moins un nom.'); return }
    if (!email) { setRespError("L'e-mail est obligatoire pour pouvoir écrire à ce responsable."); return }
    if (respEditingId === 'new') {
      await fetch('/api/mail-responsables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: activeUserId, nom, prenom: respForm.prenom || null, email, order: responsables.length }),
      })
    } else {
      await fetch('/api/mail-responsables', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: respEditingId, nom, prenom: respForm.prenom || null, email }),
      })
    }
    cancelResp()
    await load()
  }

  const deleteResp = async (r: Responsable) => {
    if (!confirm(`Supprimer ${r.prenom ? r.prenom + ' ' : ''}${r.nom} ?`)) return
    await fetch('/api/mail-responsables?id=' + r.id, { method: 'DELETE' })
    setResponsables(prev => prev.filter(x => x.id !== r.id))
  }

  // ── Aidants ──
  const addAidant = async () => {
    if (!activeUserId || !aidantForm.trim()) return
    await fetch('/api/mail-aidants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: activeUserId, prenom: aidantForm.trim(), order: aidants.length }),
    })
    setAidantForm('')
    await load()
  }

  const deleteAidant = async (a: Aidant) => {
    if (!confirm(`Supprimer ${a.prenom} ?`)) return
    await fetch('/api/mail-aidants?id=' + a.id, { method: 'DELETE' })
    setAidants(prev => prev.filter(x => x.id !== a.id))
  }

  // ── Équipements ──
  const addEquipement = async () => {
    if (!activeUserId || !equipementForm.trim()) return
    await fetch('/api/mail-equipements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: activeUserId, label: equipementForm.trim(), order: equipements.length }),
    })
    setEquipementForm('')
    await load()
  }

  const deleteEquipement = async (e: Equipement) => {
    if (!confirm(`Supprimer ${e.label} ?`)) return
    await fetch('/api/mail-equipements?id=' + e.id, { method: 'DELETE' })
    setEquipements(prev => prev.filter(x => x.id !== e.id))
  }

  // ── Modèles ──
  const seedDefaults = async () => {
    if (!activeUserId) return
    setSeedingTpl(true)
    await Promise.all(DEFAULT_TEMPLATES.map((t, i) =>
      fetch('/api/mail-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...t, userId: activeUserId, order: templates.length + i }),
      })
    ))
    await load()
    setSeedingTpl(false)
  }

  const startTplAdd = () => { setTplForm({ label: '', subject: '', body: '' }); setTplEditingId('new') }
  const startTplEdit = (t: Template) => { setTplForm({ ...t }); setTplEditingId(t.id) }
  const cancelTpl = () => { setTplForm(null); setTplEditingId(null) }

  const saveTpl = async () => {
    if (!activeUserId || !tplForm) return
    const label = (tplForm.label || '').trim()
    const body = (tplForm.body || '').trim()
    if (!label || !body) return
    if (tplEditingId === 'new') {
      await fetch('/api/mail-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: activeUserId, label, subject: tplForm.subject || '', body, order: templates.length }),
      })
    } else {
      await fetch('/api/mail-templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: tplEditingId, label, subject: tplForm.subject || '', body }),
      })
    }
    cancelTpl()
    await load()
  }

  const deleteTpl = async (t: Template) => {
    if (!confirm(`Supprimer le modèle "${t.label}" ?`)) return
    await fetch('/api/mail-templates?id=' + t.id, { method: 'DELETE' })
    setTemplates(prev => prev.filter(x => x.id !== t.id))
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="text-xl text-gray-400">Chargement...</div></div>

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">✉️ Réglages des mails</h1>
        <p className="text-sm text-gray-400">Agence, responsables, aidants, équipements et modèles de mails</p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-4 gap-1 mb-6 bg-gray-100 rounded-2xl p-1">
        {([['agence', '🏢 Agence'], ['aidants', '🤝 Aidants'], ['equipements', '🛠️ Équipements'], ['modeles', '📝 Modèles']] as const).map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`py-2.5 rounded-xl text-xs font-semibold transition-all ${activeTab === tab ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── AGENCE TAB ── */}
      {activeTab === 'agence' && (
        <div className="space-y-6">
          <section className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="text-base font-semibold text-gray-700 mb-3">Nom de l&apos;agence</h2>
            <div className="flex gap-3">
              <input
                type="text"
                value={agencyName}
                onChange={e => setAgencyName(e.target.value)}
                placeholder="ex: ADMR, Vitalliance…"
                className={input}
              />
              <button
                onClick={saveAgencyName}
                disabled={savingAgency}
                className="px-5 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-semibold active:scale-95 transition-all disabled:opacity-40"
              >
                {savingAgency ? '...' : 'Enregistrer'}
              </button>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-700">Responsables à qui écrire</h2>
              {respEditingId === null && (
                <button
                  onClick={startRespAdd}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-green-500 hover:bg-green-600 active:scale-95 transition-all text-white font-semibold text-sm"
                >
                  <span>＋</span><span>Ajouter</span>
                </button>
              )}
            </div>

            {respEditingId === 'new' && (
              <RespForm form={respForm!} setForm={setRespForm} error={respError} onSave={saveResp} onCancel={cancelResp} title="Nouveau responsable" />
            )}

            <div className="space-y-2">
              {responsables.map(r => (
                r.id === respEditingId ? (
                  <div key={r.id}>
                    <RespForm form={respForm!} setForm={setRespForm} error={respError} onSave={saveResp} onCancel={cancelResp} title="Modifier le responsable" />
                  </div>
                ) : (
                  <div key={r.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 shrink-0 rounded-full bg-indigo-100 flex items-center justify-center text-lg font-bold text-indigo-500">
                      {r.nom.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-700 truncate">{r.prenom ? `${r.prenom} ` : ''}{r.nom}</div>
                      <div className="text-xs text-indigo-400 truncate">{r.email}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => startRespEdit(r)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-indigo-100 text-gray-500 hover:text-indigo-600 active:scale-95 transition-all text-sm">✏️</button>
                      <button onClick={() => deleteResp(r)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-500 active:scale-95 transition-all text-sm">🗑️</button>
                    </div>
                  </div>
                )
              ))}
              {responsables.length === 0 && respEditingId === null && (
                <p className="text-center text-gray-400 text-sm py-6">Aucun responsable pour l&apos;instant.</p>
              )}
            </div>
          </section>
        </div>
      )}

      {/* ── AIDANTS TAB ── */}
      {activeTab === 'aidants' && (
        <section>
          <h2 className="text-base font-semibold text-gray-700 mb-3">Prénoms des intervenants</h2>
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              value={aidantForm}
              onChange={e => setAidantForm(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addAidant() }}
              placeholder="ex: Sarah"
              className={input}
            />
            <button
              onClick={addAidant}
              disabled={!aidantForm.trim()}
              className="px-5 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold active:scale-95 transition-all disabled:opacity-40"
            >
              Ajouter
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {aidants.map(a => (
              <div key={a.id} className="flex items-center gap-2 bg-white rounded-2xl pl-4 pr-2 py-2 shadow-sm">
                <span className="font-semibold text-gray-700">{a.prenom}</span>
                <button onClick={() => deleteAidant(a)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 text-sm">✕</button>
              </div>
            ))}
          </div>
          {aidants.length === 0 && <p className="text-center text-gray-400 text-sm py-6">Aucun aidant pour l&apos;instant.</p>}
        </section>
      )}

      {/* ── ÉQUIPEMENTS TAB ── */}
      {activeTab === 'equipements' && (
        <section>
          <h2 className="text-base font-semibold text-gray-700 mb-3">Équipements à la maison</h2>
          <p className="text-sm text-gray-400 mb-4">Ex : lève-malade, fauteuil, verticalisateur… proposés au choix quand un modèle utilise <code className="bg-gray-100 px-1 rounded">{'{{equipement}}'}</code>.</p>
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              value={equipementForm}
              onChange={e => setEquipementForm(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addEquipement() }}
              placeholder="ex: Lève-malade"
              className={input}
            />
            <button
              onClick={addEquipement}
              disabled={!equipementForm.trim()}
              className="px-5 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold active:scale-95 transition-all disabled:opacity-40"
            >
              Ajouter
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {equipements.map(e => (
              <div key={e.id} className="flex items-center gap-2 bg-white rounded-2xl pl-4 pr-2 py-2 shadow-sm">
                <span className="font-semibold text-gray-700">{e.label}</span>
                <button onClick={() => deleteEquipement(e)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 text-sm">✕</button>
              </div>
            ))}
          </div>
          {equipements.length === 0 && <p className="text-center text-gray-400 text-sm py-6">Aucun équipement pour l&apos;instant.</p>}
        </section>
      )}

      {/* ── MODÈLES TAB ── */}
      {activeTab === 'modeles' && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-700">Sujets de mails</h2>
            {tplEditingId === null && (
              <button
                onClick={startTplAdd}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-green-500 hover:bg-green-600 active:scale-95 transition-all text-white font-semibold text-sm"
              >
                <span>＋</span><span>Ajouter</span>
              </button>
            )}
          </div>

          {templates.length === 0 && tplEditingId === null && (
            <div className="bg-white rounded-2xl p-6 shadow-sm text-center mb-4">
              <p className="text-4xl mb-3">📝</p>
              <p className="text-gray-600 font-medium mb-2">Aucun modèle configuré</p>
              <p className="text-sm text-gray-400 mb-5">Charge les modèles de base, tu pourras les modifier ou en ajouter</p>
              <button
                onClick={seedDefaults}
                disabled={seedingTpl}
                className="px-6 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-semibold active:scale-95 transition-all disabled:opacity-40"
              >
                {seedingTpl ? 'Chargement...' : '📥 Charger les modèles de base'}
              </button>
            </div>
          )}

          {tplEditingId === 'new' && (
            <TplForm form={tplForm!} setForm={setTplForm} onSave={saveTpl} onCancel={cancelTpl} title="Nouveau modèle" />
          )}

          <div className="space-y-2">
            {templates.map(t => (
              t.id === tplEditingId ? (
                <div key={t.id}>
                  <TplForm form={tplForm!} setForm={setTplForm} onSave={saveTpl} onCancel={cancelTpl} title="Modifier le modèle" />
                </div>
              ) : (
                <div key={t.id} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-700 truncate">{t.label}</div>
                      <div className="text-xs text-gray-400 truncate">{t.subject}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => startTplEdit(t)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-indigo-100 text-gray-500 hover:text-indigo-600 active:scale-95 transition-all text-sm">✏️</button>
                      <button onClick={() => deleteTpl(t)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-500 active:scale-95 transition-all text-sm">🗑️</button>
                    </div>
                  </div>
                </div>
              )
            ))}
          </div>

          {templates.length > 0 && (
            <p className="text-xs text-gray-400 mt-4">
              Astuce : dans le sujet ou le texte, utilise <code className="bg-gray-100 px-1 rounded">{'{{aidant}}'}</code>, <code className="bg-gray-100 px-1 rounded">{'{{date}}'}</code>, <code className="bg-gray-100 px-1 rounded">{'{{heure}}'}</code> — ils seront proposés automatiquement lors de la rédaction. Tout autre mot entre accolades (ex. <code className="bg-gray-100 px-1 rounded">{'{{tache}}'}</code>) devient une simple question posée avant l&apos;envoi.
            </p>
          )}
        </section>
      )}
    </main>
  )
}

function RespForm({ form, setForm, error, onSave, onCancel, title }: {
  form: Partial<Responsable>
  setForm: (f: Partial<Responsable>) => void
  error: string
  onSave: () => void
  onCancel: () => void
  title: string
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm mb-3 border-2 border-indigo-100">
      <h3 className="text-sm font-semibold text-gray-600 mb-3">{title}</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Prénom</label>
          <input type="text" value={form.prenom || ''} onChange={e => setForm({ ...form, prenom: e.target.value })} className={input} placeholder="Jean" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Nom *</label>
          <input type="text" value={form.nom || ''} onChange={e => setForm({ ...form, nom: e.target.value })} className={input} placeholder="Dupont" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">E-mail * (obligatoire)</label>
          <input type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} className={input} placeholder="jean.dupont@agence.fr" />
        </div>
        {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
      </div>
      <div className="flex gap-3 mt-4">
        <button onClick={onCancel} className="flex-1 py-3 rounded-xl border-2 border-gray-300 text-gray-600 font-semibold active:scale-95 transition-all">Annuler</button>
        <button onClick={onSave} className="flex-1 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-semibold active:scale-95 transition-all">Enregistrer</button>
      </div>
    </div>
  )
}

function TplForm({ form, setForm, onSave, onCancel, title }: {
  form: Partial<Template>
  setForm: (f: Partial<Template>) => void
  onSave: () => void
  onCancel: () => void
  title: string
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm mb-3 border-2 border-indigo-100">
      <h3 className="text-sm font-semibold text-gray-600 mb-3">{title}</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Nom du modèle *</label>
          <input type="text" value={form.label || ''} onChange={e => setForm({ ...form, label: e.target.value })} className={input} placeholder="ex: Poubelle non sortie" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Objet du mail</label>
          <input type="text" value={form.subject || ''} onChange={e => setForm({ ...form, subject: e.target.value })} className={input} placeholder="ex: {{aidant}} n'a pas sorti la poubelle" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Texte du mail *</label>
          <textarea value={form.body || ''} onChange={e => setForm({ ...form, body: e.target.value })} className={input + ' min-h-[140px]'} placeholder={"Bonjour,\n\n{{aidant}} n'a pas sorti la poubelle lors de son passage du {{date}}.\n\n{{prenom}}"} />
        </div>
      </div>
      <div className="flex gap-3 mt-4">
        <button onClick={onCancel} className="flex-1 py-3 rounded-xl border-2 border-gray-300 text-gray-600 font-semibold active:scale-95 transition-all">Annuler</button>
        <button onClick={onSave} className="flex-1 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-semibold active:scale-95 transition-all">Enregistrer</button>
      </div>
    </div>
  )
}
