export type Module = {
  id: string
  name: string
  label: string
  description: string
  icon: string
  enabled: boolean
  order: number
}

export type RoutineStep = {
  id: string
  label: string
  icon: string
  time?: string // optional time like "08:00"
  order: number
  done: boolean
  created_at?: string
}

export type AppConfig = {
  userName: string        // prénom de l'utilisateur (ex: "Lucas")
  primaryColor: string   // hex color for theme
  adminPassword: string  // simple 4-digit PIN
  modules: Module[]
}

export type DayRoutine = {
  id: string
  date: string // YYYY-MM-DD
  steps: RoutineStep[]
}

export type Contact = {
  id: string
  name: string
  relation: string
  phone?: string
  mobile?: string
  email?: string
  address?: string
  city?: string
}

export type UserProfile = {
  // Identité
  firstName: string
  lastName: string
  birthDate?: string
  address?: string
  city?: string
  postalCode?: string
  // Coordonnées
  phone?: string
  mobile?: string
  email?: string
  // Administratif
  socialSecurityNumber?: string
  mutuelle?: string
  mutuelleNumber?: string
  cafNumber?: string
  mdphNumber?: string
  aahRecipient?: boolean
  // Médical
  doctorName?: string
  doctorPhone?: string
  pharmacyName?: string
  pharmacyPhone?: string
  bloodType?: string
  allergies?: string
  treatments?: string
  // Contacts proches
  contacts: Contact[]
  // Meta
  profileCompleted: boolean
  createdAt: string
}
