'use client'
import { useEffect } from 'react'
import { useConfig } from '@/lib/configContext'

export default function BackgroundApplier() {
  const { config } = useConfig()
  useEffect(() => {
    document.body.style.backgroundColor = config.backgroundColor ?? '#f9fafb'
  }, [config.backgroundColor])
  return null
}
