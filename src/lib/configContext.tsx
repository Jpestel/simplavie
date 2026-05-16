'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { AppConfig } from '@/types'
import { DEFAULT_CONFIG, DEFAULT_MODULES } from './defaultConfig'
import { supabase, isSupabaseConfigured } from './supabase'
import { useAuth } from '@/lib/authContext'

const STORAGE_KEY = 'simplavie_config'

type ConfigContextType = {
  config: AppConfig
  updateConfig: (updates: Partial<AppConfig>) => void
  isLoading: boolean
}

const ConfigContext = createContext<ConfigContextType | null>(null)

function toRow(c: AppConfig, userId: string) {
  return {
    id: userId,
    user_id: userId,
    user_name: c.userName,
    primary_color: c.primaryColor,
    admin_password: c.adminPassword,
    modules: c.modules,
    updated_at: new Date().toISOString(),
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
    userName: (row.user_name as string) ?? DEFAULT_CONFIG.userName,
    primaryColor: (row.primary_color as string) ?? DEFAULT_CONFIG.primaryColor,
    adminPassword: (row.admin_password as string) ?? DEFAULT_CONFIG.adminPassword,
    modules: mergeModules(savedModules),
  }
}

export function ConfigProvider({ children }: { children: ReactNode }) {
  const { activeUserId, loading: authLoading } = useAuth()
  const [config, setConfig] = useState<AppConfig>(() => {
    if (typeof window === 'undefined') return DEFAULT_CONFIG
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : DEFAULT_CONFIG
    } catch { return DEFAULT_CONFIG }
  })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (authLoading || !activeUserId || !isSupabaseConfigured) return
    supabase.from('app_config').select('*').eq('user_id', activeUserId).maybeSingle().then(({ data }) => {
      if (data) {
        const c = fromRow(data)
        setConfig(c)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(c))
      }
    })
  }, [activeUserId, authLoading])

  const updateConfig = (updates: Partial<AppConfig>) => {
    const next = { ...config, ...updates }
    setConfig(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    if (isSupabaseConfigured && activeUserId) {
      supabase.from('app_config').upsert(toRow(next, activeUserId)).then()
    }
  }

  return (
    <ConfigContext.Provider value={{ config, updateConfig, isLoading }}>
      {children}
    </ConfigContext.Provider>
  )
}

export function useConfig() {
  const ctx = useContext(ConfigContext)
  if (!ctx) throw new Error('useConfig must be used within ConfigProvider')
  return ctx
}
