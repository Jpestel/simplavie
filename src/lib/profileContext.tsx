'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { UserProfile } from '@/types'
import { useAuth } from '@/lib/authContext'

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

function toBody(p: UserProfile) {
  return {
    firstName: p.firstName,
    lastName: p.lastName,
    birthDate: p.birthDate ?? null,
    address: p.address ?? null,
    city: p.city ?? null,
    postalCode: p.postalCode ?? null,
    phone: p.phone ?? null,
    mobile: p.mobile ?? null,
    email: p.email ?? null,
    socialSecurityNumber: p.socialSecurityNumber ?? null,
    mutuelle: p.mutuelle ?? null,
    mutuelleNumber: p.mutuelleNumber ?? null,
    cafNumber: p.cafNumber ?? null,
    mdphNumber: p.mdphNumber ?? null,
    aahRecipient: p.aahRecipient ?? false,
    doctorName: p.doctorName ?? null,
    doctorPhone: p.doctorPhone ?? null,
    pharmacyName: p.pharmacyName ?? null,
    pharmacyPhone: p.pharmacyPhone ?? null,
    bloodType: p.bloodType ?? null,
    allergies: p.allergies ?? null,
    treatments: p.treatments ?? null,
    healthPros: p.healthPros ?? [],
    contacts: p.contacts,
    profileCompleted: p.profileCompleted,
  }
}

function fromRow(row: Record<string, unknown>): UserProfile {
  return {
    firstName: (row.firstName as string) ?? '',
    lastName: (row.lastName as string) ?? '',
    birthDate: (row.birthDate as string) ?? undefined,
    address: (row.address as string) ?? undefined,
    city: (row.city as string) ?? undefined,
    postalCode: (row.postalCode as string) ?? undefined,
    phone: (row.phone as string) ?? undefined,
    mobile: (row.mobile as string) ?? undefined,
    email: (row.email as string) ?? undefined,
    socialSecurityNumber: (row.socialSecurityNumber as string) ?? undefined,
    mutuelle: (row.mutuelle as string) ?? undefined,
    mutuelleNumber: (row.mutuelleNumber as string) ?? undefined,
    cafNumber: (row.cafNumber as string) ?? undefined,
    mdphNumber: (row.mdphNumber as string) ?? undefined,
    aahRecipient: (row.aahRecipient as boolean) ?? false,
    doctorName: (row.doctorName as string) ?? undefined,
    doctorPhone: (row.doctorPhone as string) ?? undefined,
    pharmacyName: (row.pharmacyName as string) ?? undefined,
    pharmacyPhone: (row.pharmacyPhone as string) ?? undefined,
    bloodType: (row.bloodType as string) ?? undefined,
    allergies: (row.allergies as string) ?? undefined,
    treatments: (row.treatments as string) ?? undefined,
    healthPros: (row.healthPros as UserProfile['healthPros']) ?? [],
    contacts: (row.contacts as UserProfile['contacts']) ?? [],
    profileCompleted: (row.profileCompleted as boolean) ?? false,
    createdAt: (row.createdAt as string) ?? new Date().toISOString(),
  }
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { activeUserId, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!activeUserId) {
      setProfile(EMPTY_PROFILE)
      setIsLoading(false)
      return
    }
    setProfile(EMPTY_PROFILE)
    setIsLoading(true)
    fetch(`/api/auth/profile?userId=${activeUserId}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) setProfile(fromRow(data))
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [activeUserId, authLoading])

  const updateProfile = (updates: Partial<UserProfile>) => {
    const next = { ...profile, ...updates }
    setProfile(next)
    if (activeUserId) {
      fetch(`/api/auth/profile?userId=${activeUserId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toBody(next)),
      }).then()
      // Sync firstName → config.userName
      if (updates.firstName !== undefined) {
        fetch(`/api/config?userId=${activeUserId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userName: updates.firstName }),
        }).then()
      }
    }
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
