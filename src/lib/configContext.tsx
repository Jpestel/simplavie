'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { AppConfig } from '@/types'
import { DEFAULT_CONFIG } from './defaultConfig'

type ConfigContextType = {
  config: AppConfig
  updateConfig: (updates: Partial<AppConfig>) => void
  isLoading: boolean
}

const ConfigContext = createContext<ConfigContextType | null>(null)

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('simplavie_config')
    if (stored) {
      try {
        setConfig(JSON.parse(stored))
      } catch {
        setConfig(DEFAULT_CONFIG)
      }
    }
    setIsLoading(false)
  }, [])

  const updateConfig = (updates: Partial<AppConfig>) => {
    const next = { ...config, ...updates }
    setConfig(next)
    localStorage.setItem('simplavie_config', JSON.stringify(next))
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
