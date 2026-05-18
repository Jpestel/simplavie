export type Module = {
  id: string
  name: string
  label: string
  description: string
  icon: string
  enabled: boolean
  order: number
  locked?: boolean
}

export type RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'once'

export type RoutineStep = {
  id: string
  label: string
  icon: string
  time?: string
  order: number
  done: boolean
  recurrence: RecurrenceType
  weekDays?: number[]    // 0=Dim…6=Sam, pour 'weekly'
  monthDay?: number      // 1-31, pour 'monthly'
  yearDate?: string      // "MM-DD", pour 'yearly'
  specificDate?: string  // "YYYY-MM-DD", pour 'once'
}

export type AppConfig = {
  userName: string        // prénom de l'utilisateur (ex: "Lucas")
  primaryColor: string   // hex color for theme
  backgroundColor: string // hex color for page background
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

export type Caregiver = {
  id: string
  name: string
  role: string
  mobile?: string
  phone?: string
}

export type CareAppointment = {
  id: string
  date: string        // "YYYY-MM-DD"
  time: string        // "08:00"
  endTime?: string    // "09:00"
  caregiverId?: string
  caregiverName?: string  // raw name from PDF if not matched to a caregiver
  notes?: string
  status: 'planned' | 'modified' | 'cancelled'
  modifiedNote?: string   // e.g. "Sophie malade, remplacée par Marc"
}

export type AgendaCategory = 'medical' | 'admin' | 'family' | 'other'

export type AgendaEvent = {
  id: string
  date: string    // YYYY-MM-DD
  time?: string   // HH:MM
  title: string
  notes?: string
  category?: AgendaCategory
}

export type CareData = {
  company: {
    name: string
    phone?: string
    mobile?: string
    email?: string
    address?: string
    city?: string
  }
  caregivers: Caregiver[]
  appointments: CareAppointment[]
}

export type IncomeSource = {
  id: string
  label: string      // ex: "Salaire", "AAH"
  amount: number
  dayOfMonth: number // 1-31
  active: boolean
}

export type FinanceFixedExpense = {
  id: string
  label: string      // ex: "Loyer", "EDF"
  amount: number
  dayOfMonth: number
  active: boolean
}

export type FinancePlannedExpense = {
  id: string
  label: string
  amount: number
  date: string       // YYYY-MM-DD
  paid: boolean
}

export type FinanceTransaction = {
  id: string
  label: string
  amount: number
  date: string       // YYYY-MM-DD
}

export type FinanceData = {
  balance: number
  balanceDate: string  // YYYY-MM-DD
  incomeSources: IncomeSource[]
  fixedExpenses: FinanceFixedExpense[]
  plannedExpenses: FinancePlannedExpense[]
  transactions: FinanceTransaction[]
}
