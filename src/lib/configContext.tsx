'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { AppConfig } from '@/types'
import { DEFAULT_CONFIG, DEFAULT_MODULES } from './defaultConfig'
import { useAuth } from '@/lib/authContext'

type ConfigContextType = {
  config: AppConfig
  updateConfig: (updates: Partial<AppConfig>) => void
  reloadConfig: () => Promise<void>
  isLoading: boolean
}

const ConfigContext = createContext<ConfigContextType | null>(null)

function toBody(c: AppConfig) {
  return {
    userName: c.userName,
    primaryColor: c.primaryColor,
    adminPassword: c.adminPassword,
    modules: c.modules,
  }
}

function mergeModules(saved: AppConfig['modules']): AppConfig['modules'] {
  // Ajoute les nouveaux modules par défaut manquants dans la config sauvegardée
  const savedIds = new Set(saved.map(m => m.id))
  const missing = DEFAULT_MODULES.filter(m => !savedIds.has(m.id))
  return [...saved, ...missing]
}

function fromRow(row: Record<string, unknown>): AppConfig {
  const savedModules = (row.modules as AppConfig['modules']) ?? DEFAULT_CONFIG.modules
  return {
    userName: (row.userName as string) ?? DEFAULT_CONFIG.userName,
    primaryColor: (row.primaryColor as string) ?? DEFAULT_CONFIG.primaryColor,
    backgroundColor: DEFAULT_CONFIG.backgroundColor,
    adminPassword: (row.adminPassword as string) ?? DEFAULT_CONFIG.adminPassword,
    modules: mergeModules(savedModules),
  }
}

export function ConfigProvider({ children }: { children: ReactNode }) {
  const { activeUserId, loading: authLoading } = useAuth()
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!activeUserId) { setConfig(DEFAULT_CONFIG); return }

    setIsLoading(true)
    fetch(`/api/config?userId=${activeUserId}`)
      .then(res => res.ok ? res.json() : null)
      .then(async (data) => {
        const loaded = data ? fromRow(data) : DEFAULT_CONFIG

        // Auto-repair : si le nom est encore le défaut, on récupère le prénom depuis user_profile
        if (loaded.userName === 'Mon proche' || loaded.userName === DEFAULT_CONFIG.userName) {
          const profileRes = await fetch(`/api/auth/profile?userId=${activeUserId}`)
          const profileData = profileRes.ok ? await profileRes.json() : null
          const firstName = (profileData?.displayName as string | null)?.split(' ')[0]
            ?? (profileData?.firstName as string | null)
          if (firstName) {
            const repaired = { ...loaded, userName: firstName }
            setConfig(repaired)
            // Sauvegarder la correction en base
            fetch(`/api/config?userId=${activeUserId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userName: firstName }),
            }).then()
            return
          }
        }

        setConfig(loaded)
      })
      .catch(() => setConfig(DEFAULT_CONFIG))
      .finally(() => setIsLoading(false))
  }, [activeUserId, authLoading])

  const updateConfig = (updates: Partial<AppConfig>) => {
    const next = { ...config, ...updates }
    setConfig(next)
    if (activeUserId) {
      fetch(`/api/config?userId=${activeUserId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toBody(next)),
      }).then()
    }
  }

  const reloadConfig = async () => {
    if (!activeUserId) return
    const res = await fetch(`/api/config?userId=${activeUserId}`)
    if (res.ok) {
      const data = await res.json()
      if (data) setConfig(fromRow(data))
      else setConfig(DEFAULT_CONFIG)
    } else {
      setConfig(DEFAULT_CONFIG)
    }
  }

  return (
    <ConfigContext.Provider value={{ config, updateConfig, reloadConfig, isLoading }}>
      {children}
    </ConfigContext.Provider>
  )
}

export function useConfig() {
  const ctx = useContext(ConfigContext)
  if (!ctx) throw new Error('useConfig must be used within ConfigProvider')
  return ctx
}
