'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { AppConfig } from '@/types'
import { DEFAULT_CONFIG } from './defaultConfig'
import { supabase, isSupabaseConfigured } from './supabase'

const STORAGE_KEY = 'simplavie_config'

type ConfigContextType = {
  config: AppConfig
  updateConfig: (updates: Partial<AppConfig>) => void
  isLoading: boolean
}

const ConfigContext = createContext<ConfigContextType | null>(null)

function toRow(c: AppConfig) {
  return {
    id: 'default',
    user_name: c.userName,
    primary_color: c.primaryColor,
    admin_password: c.adminPassword,
    modules: c.modules,
    updated_at: new Date().toISOString(),
  }
}

function fromRow(row: Record<string, unknown>): AppConfig {
  return {
    userName: (row.user_name as string) ?? DEFAULT_CONFIG.userName,
    primaryColor: (row.primary_color as string) ?? DEFAULT_CONFIG.primaryColor,
    adminPassword: (row.admin_password as string) ?? DEFAULT_CONFIG.adminPassword,
    modules: (row.modules as AppConfig['modules']) ?? DEFAULT_CONFIG.modules,
  }
}

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Affichage immédiat depuis localStorage
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try { setConfig(JSON.parse(stored)) } catch { /* keep default */ }
    }
    setIsLoading(false)

    // Sync Supabase en arrière-plan
    if (isSupabaseConfigured) {
      supabase.from('app_config').select('*').eq('id', 'default').maybeSingle().then(({ data }) => {
        if (data) {
          const c = fromRow(data)
          setConfig(c)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(c))
        }
      })
    }
  }, [])

  const updateConfig = (updates: Partial<AppConfig>) => {
    const next = { ...config, ...updates }
    setConfig(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    if (isSupabaseConfigured) {
      supabase.from('app_config').upsert(toRow(next)).then()
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
