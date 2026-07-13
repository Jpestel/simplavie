import { NextRequest, NextResponse } from 'next/server'

// Autocomplétion d'adresses via la Base Adresse Nationale (BAN), l'API
// officielle et gratuite de l'État (api-adresse.data.gouv.fr). Passée par le
// serveur pour ne pas exposer les requêtes de l'utilisateur à un tiers.
type BanFeature = {
  properties?: { label?: string; name?: string; postcode?: string; city?: string; context?: string }
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim()
  if (q.length < 3) return NextResponse.json({ results: [] })

  try {
    const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=6&autocomplete=1`
    const res = await fetch(url, { headers: { 'User-Agent': 'SimplaVie' } })
    if (!res.ok) return NextResponse.json({ results: [] })
    const data = await res.json()
    const results = (data.features ?? []).map((f: BanFeature) => ({
      label: f.properties?.label ?? '',
      address: f.properties?.name ?? '',
      postcode: f.properties?.postcode ?? '',
      city: f.properties?.city ?? '',
      context: f.properties?.context ?? '',
    }))
    return NextResponse.json({ results })
  } catch {
    return NextResponse.json({ results: [] })
  }
}
