import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

// Index chargé une seule fois puis gardé en mémoire (serveur long-running).
let labels: string[] | null = null
let normalized: string[] | null = null
let loading: Promise<void> | null = null

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
}

async function ensureLoaded(): Promise<void> {
  if (labels) return
  if (!loading) {
    loading = (async () => {
      const raw = await fs.readFile(path.join(process.cwd(), 'src/data/medications.json'), 'utf8')
      labels = JSON.parse(raw) as string[]
      normalized = labels.map(normalize)
    })()
  }
  await loading
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim()
  if (q.length < 2) return NextResponse.json({ results: [] })

  await ensureLoaded()
  const nq = normalize(q)
  const LIMIT = 15

  const prefix: string[] = []
  const contains: string[] = []
  for (let i = 0; i < normalized!.length; i++) {
    const n = normalized![i]
    if (n.startsWith(nq)) {
      prefix.push(labels![i])
      if (prefix.length >= LIMIT) break // assez de correspondances par préfixe
    } else if (contains.length < LIMIT && n.includes(nq)) {
      contains.push(labels![i])
    }
  }

  return NextResponse.json({ results: [...prefix, ...contains].slice(0, LIMIT) })
}
