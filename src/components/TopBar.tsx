'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/authContext'
import Logo from '@/components/Logo'

// En-tête léger, en flux normal (plus de barre fixe qui chevauche le contenu).
// Logo tout à gauche ; commandes d'administration à droite si nécessaires.
export default function TopBar() {
  const { isSuperAdmin, isAdmin, hasOwnAccount, adminAssignments, adminTarget, setAdminTarget, user } = useAuth()
  const router = useRouter()

  const isDualRole = isAdmin && hasOwnAccount
  const isViewingOwnAccount = !adminTarget || adminTarget === user?.id

  return (
    <header className="w-full px-6 pt-5 pb-1 flex items-center justify-between gap-3">
      <Logo />

      <div className="flex items-center gap-2">
        {isSuperAdmin && (
          <Link
            href="/superadmin"
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-600 font-semibold active:scale-95 transition-all"
          >
            <span>🛡️</span>
            <span>Super Admin</span>
          </Link>
        )}

        {isDualRole && (
          <div className="relative group">
            <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-semibold active:scale-95 transition-all">
              <span>{isViewingOwnAccount ? '👤' : '🤝'}</span>
              <span className="max-w-[80px] truncate">
                {isViewingOwnAccount ? 'Mon compte' : (adminAssignments.find(a => a.owner_id === adminTarget)?.owner_name ?? 'Aidé')}
              </span>
              <span className="text-indigo-400">▾</span>
            </button>
            <div className="absolute right-0 top-full mt-1 bg-white rounded-2xl shadow-lg border border-gray-100 py-1.5 min-w-[160px] hidden group-focus-within:block group-hover:block z-50">
              <button
                onClick={() => { setAdminTarget(null); router.push('/') }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${isViewingOwnAccount ? 'font-semibold text-indigo-600' : 'text-gray-700'}`}
              >
                <span>👤</span> Mon compte
              </button>
              {adminAssignments.map(a => (
                <button
                  key={a.owner_id}
                  onClick={() => { setAdminTarget(a.owner_id); router.push('/admin') }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${adminTarget === a.owner_id ? 'font-semibold text-indigo-600' : 'text-gray-700'}`}
                >
                  <span>🤝</span> {a.owner_name ?? 'Compte aidé'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
