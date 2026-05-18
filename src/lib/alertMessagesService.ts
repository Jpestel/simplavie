export const DEFAULT_MESSAGES = [
  "L'intervenant(e) n'est pas arrivé(e) à l'heure prévue.",
  "L'intervenant(e) n'est pas venu(e) du tout.",
  "Je souhaite signaler un problème concernant cette intervention.",
  "Je souhaite modifier ou annuler cette intervention.",
]

export async function loadAlertMessages(): Promise<string[]> {
  try {
    const res = await fetch('/api/alert-messages')
    if (!res.ok) return DEFAULT_MESSAGES
    return await res.json()
  } catch {
    return DEFAULT_MESSAGES
  }
}

export async function saveAlertMessages(messages: string[]) {
  await fetch('/api/alert-messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  })
}
