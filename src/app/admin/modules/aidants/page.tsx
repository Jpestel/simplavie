import { redirect } from 'next/navigation'

// Les réglages d'un module vivent désormais dans le module lui-même.
export default function Page() {
  redirect('/modules/aidants/reglages')
}
