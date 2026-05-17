'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/authContext'
import { useEffect, useState } from 'react'

export default function TopBar() {
  const { isSuperAdmin, isAdmin, hasOwnAccount, adminAssignments, adminTarget, setAdminTarget, user } = useAuth()
  const router = useRouter()
  const [visible, setVisible] = useState(true)
  const [lastY, setLastY] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      setVisible(y < lastY || y < 10)
      setLastY(y)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [lastY])

  const isDualRole = isAdmin && hasOwnAccount
  const isViewingOwnAccount = !adminTarget || adminTarget === user?.id

  return (
    <div className={`fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 transition-transform duration-300 ${visible ? 'translate-y-0' : '-translate-y-full'}`}>
      <div className="max-w-2xl mx-auto px-4 h-12 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="28" height="28" rx="8" fill="url(#logo-gradient)" />
            <path d="M14 7C14 7 8 10.5 8 15C8 18.3 10.7 21 14 21C17.3 21 20 18.3 20 15C20 10.5 14 7 14 7Z" fill="white" fillOpacity="0.95" />
            <path d="M14 11C14 11 11 13 11 15.5C11 17.2 12.3 18.5 14 18.5C15.7 18.5 17 17.2 17 15.5C17 13 14 11 14 11Z" fill="url(#logo-gradient)" fillOpacity="0.6" />
            <defs>
              <linearGradient id="logo-gradient" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6366f1" />
                <stop offset="1" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </svg>
          <span className="font-bold text-base tracking-tight">
            <span className="text-indigo-600">Simpla</span><span className="text-gray-400">vie</span>
          </span>
        </Link>

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
      </div>
    </div>
  )
}
