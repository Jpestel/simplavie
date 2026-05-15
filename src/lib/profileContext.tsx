'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { UserProfile } from '@/types'

const STORAGE_KEY = 'simplavie_profile'

const EMPTY_PROFILE: UserProfile = {
  firstName: '',
  lastName: '',
  contacts: [],
  profileCompleted: false,
  createdAt: new Date().toISOString(),
}

type ProfileContextType = {
  profile: UserProfile
  updateProfile: (updates: Partial<UserProfile>) => void
  isLoading: boolean
}

const ProfileContext = createContext<ProfileContextType | null>(null)

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try { setProfile(JSON.parse(stored)) } catch { setProfile(EMPTY_PROFILE) }
    }
    setIsLoading(false)
  }, [])

  const updateProfile = (updates: Partial<UserProfile>) => {
    const next = { ...profile, ...updates }
    setProfile(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  return (
    <ProfileContext.Provider value={{ profile, updateProfile, isLoading }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider')
  return ctx
}
