'use client'
import { useEffect } from 'react'
import { useConfig } from '@/lib/configContext'
import { useAuth } from '@/lib/authContext'

const LS_KEY = (userId: string) => `simplavie_bg_${userId}`

export default function BackgroundApplier() {
  const { config, updateConfig } = useConfig()
  const { activeUserId } = useAuth()

  // Au montage : charger la couleur depuis localStorage si disponible
  useEffect(() => {
    if (!activeUserId) return
    const saved = localStorage.getItem(LS_KEY(activeUserId))
    if (saved && saved !== config.backgroundColor) {
      updateConfig({ backgroundColor: saved })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUserId])

  // À chaque changement : appliquer au body ET sauvegarder en localStorage
  useEffect(() => {
    const color = config.backgroundColor ?? '#f9fafb'
    document.body.style.backgroundColor = color
    if (activeUserId) {
      localStorage.setItem(LS_KEY(activeUserId), color)
    }
  }, [config.backgroundColor, activeUserId])

  return null
}
