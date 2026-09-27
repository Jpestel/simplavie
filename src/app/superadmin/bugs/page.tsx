'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/authContext'
import { useRouter } from 'next/navigation'
import { saFetch } from '@/lib/superadminFetch'
import BackBar from '@/components/BackBar'

type BugReport = {
  id: string
  message: string
  page: string | null
  status: string
  createdAt: string
  user: { email: string; name: string | null }
}

export default function SuperAdminBugsPage() {
  const { isSuperAdmin, loading } = useAuth()
  const router = useRouter()
  const [reports, setReports] = useState<BugReport[]>([])
  const [fetching, setFetching] = useState(true)
  const [showResolved, setShowResolved] = useState(false)

  useEffect(() => {
    if (!loading && !isSuperAdmin) router.replace('/')
  }, [loading, isSuperAdmin, router])

  const load = () => {
    saFetch('/api/bug-reports')
      .then(r => r.json())
      .then(d => { setReports(Array.isArray(d) ? d : []); setFetching(false) })
  }

  useEffect(() => {
    if (!isSuperAdmin) return
    load()
  }, [isSuperAdmin])

  const setStatus = async (id: string, status: string) => {
    await saFetch('/api/bug-reports', { method: 'PATCH', body: JSON.stringify({ id, status }) })
    setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r))
  }

  const remove = async (r: BugReport) => {
    if (!confirm('Supprimer ce signalement ?')) return
    await saFetch('/api/bug-reports?id=' + r.id, { method: 'DELETE' })
    setReports(prev => prev.filter(x => x.id !== r.id))
  }

  if (loading || !isSuperAdmin) return null

  const visible = reports.filter(r => showResolved || r.status !== 'resolved')

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto pb-28">
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800">🐛 Bugs signalés</h1>
          <p className="text-sm text-gray-400">{fetching ? '...' : `${reports.filter(r => r.status !== 'resolved').length} en attente`}</p>
        </div>
        <button
          onClick={() => setShowResolved(v => !v)}
          className="text-xs px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold active:scale-95 transition-all"
        >
          {showResolved ? 'Masquer résolus' : 'Voir résolus'}
        </button>
      </div>

      {fetching ? (
        <div className="text-center text-gray-400 mt-20 text-xl">Chargement...</div>
      ) : visible.length === 0 ? (
        <div className="text-center text-gray-400 mt-20">
          <p className="text-xl">Aucun signalement{showResolved ? '' : ' en attente'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map(r => (
            <div key={r.id} className={`bg-white rounded-2xl p-5 shadow-sm ${r.status === 'resolved' ? 'opacity-60' : ''}`}>
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="font-semibold text-gray-800">{r.user.name || r.user.email}</span>
                <span className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleString('fr-FR')}</span>
                {r.status === 'resolved' && (
                  <span className="text-xs bg-green-100 text-green-600 font-semibold px-2 py-0.5 rounded-full">Résolu</span>
                )}
              </div>
              <p className="text-gray-700 whitespace-pre-wrap mb-2">{r.message}</p>
              {r.page && <p className="text-xs text-gray-400 mb-3">Page : {r.page}</p>}
              <div className="flex gap-2">
                {r.status !== 'resolved' ? (
                  <button
                    onClick={() => setStatus(r.id, 'resolved')}
                    className="flex-1 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold text-sm active:scale-95 transition-all"
                  >
                    ✓ Marquer résolu
                  </button>
                ) : (
                  <button
                    onClick={() => setStatus(r.id, 'open')}
                    className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold text-sm active:scale-95 transition-all"
                  >
                    Rouvrir
                  </button>
                )}
                <button
                  onClick={() => remove(r)}
                  className="px-4 py-2.5 rounded-xl border-2 border-red-200 text-red-500 hover:bg-red-50 font-semibold text-sm active:scale-95 transition-all"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <BackBar label="Super Admin" href="/superadmin" />
    </main>
  )
}
