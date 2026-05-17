'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { UserProfile } from '@/types'
import { supabase, isSupabaseConfigured } from './supabase'
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

function toRow(p: UserProfile, userId: string) {
  return {
    id: userId,
    user_id: userId,
    first_name: p.firstName,
    last_name: p.lastName,
    birth_date: p.birthDate ?? null,
    address: p.address ?? null,
    city: p.city ?? null,
    postal_code: p.postalCode ?? null,
    phone: p.phone ?? null,
    mobile: p.mobile ?? null,
    email: p.email ?? null,
    social_security_number: p.socialSecurityNumber ?? null,
    mutuelle: p.mutuelle ?? null,
    mutuelle_number: p.mutuelleNumber ?? null,
    caf_number: p.cafNumber ?? null,
    mdph_number: p.mdphNumber ?? null,
    aah_recipient: p.aahRecipient ?? false,
    doctor_name: p.doctorName ?? null,
    doctor_phone: p.doctorPhone ?? null,
    pharmacy_name: p.pharmacyName ?? null,
    pharmacy_phone: p.pharmacyPhone ?? null,
    blood_type: p.bloodType ?? null,
    allergies: p.allergies ?? null,
    treatments: p.treatments ?? null,
    contacts: p.contacts,
    profile_completed: p.profileCompleted,
    updated_at: new Date().toISOString(),
  }
}

function fromRow(row: Record<string, unknown>): UserProfile {
  return {
    firstName: (row.first_name as string) ?? '',
    lastName: (row.last_name as string) ?? '',
    birthDate: (row.birth_date as string) ?? undefined,
    address: (row.address as string) ?? undefined,
    city: (row.city as string) ?? undefined,
    postalCode: (row.postal_code as string) ?? undefined,
    phone: (row.phone as string) ?? undefined,
    mobile: (row.mobile as string) ?? undefined,
    email: (row.email as string) ?? undefined,
    socialSecurityNumber: (row.social_security_number as string) ?? undefined,
    mutuelle: (row.mutuelle as string) ?? undefined,
    mutuelleNumber: (row.mutuelle_number as string) ?? undefined,
    cafNumber: (row.caf_number as string) ?? undefined,
    mdphNumber: (row.mdph_number as string) ?? undefined,
    aahRecipient: (row.aah_recipient as boolean) ?? false,
    doctorName: (row.doctor_name as string) ?? undefined,
    doctorPhone: (row.doctor_phone as string) ?? undefined,
    pharmacyName: (row.pharmacy_name as string) ?? undefined,
    pharmacyPhone: (row.pharmacy_phone as string) ?? undefined,
    bloodType: (row.blood_type as string) ?? undefined,
    allergies: (row.allergies as string) ?? undefined,
    treatments: (row.treatments as string) ?? undefined,
    contacts: (row.contacts as UserProfile['contacts']) ?? [],
    profileCompleted: (row.profile_completed as boolean) ?? false,
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
  }
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { activeUserId, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!activeUserId || !isSupabaseConfigured) {
      setProfile(EMPTY_PROFILE)
      setIsLoading(false)
      return
    }
    setProfile(EMPTY_PROFILE)
    setIsLoading(true)
    supabase.from('user_profile').select('*').eq('user_id', activeUserId).maybeSingle().then(({ data }) => {
      if (data) setProfile(fromRow(data))
      setIsLoading(false)
    })
  }, [activeUserId, authLoading])

  const updateProfile = (updates: Partial<UserProfile>) => {
    const next = { ...profile, ...updates }
    setProfile(next)
    if (isSupabaseConfigured && activeUserId) {
      supabase.from('user_profile').upsert(toRow(next, activeUserId)).then()
      if (updates.firstName !== undefined) {
        supabase.from('app_config').update({ user_name: updates.firstName }).eq('user_id', activeUserId).then()
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
