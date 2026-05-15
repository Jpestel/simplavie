import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('pdf') as File
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')

    const today = new Date().toISOString().slice(0, 10)

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: base64,
            },
          },
          {
            type: 'text',
            text: `Ce document est un planning hebdomadaire d'une société d'aide à domicile française (Vitalliance).
Extrait tous les passages/interventions avec :
- date (format YYYY-MM-DD, année courante si non précisée, aujourd'hui = ${today})
- time (format HH:MM, heure de début)
- endTime (format HH:MM, heure de fin, optionnel)
- caregiverName (prénom ou nom de l'intervenant si mentionné, sinon null)
- notes (type d'intervention si mentionné : toilette, repas, etc., sinon null)

Réponds UNIQUEMENT avec un JSON valide, sans texte autour, sous cette forme exacte :
{"appointments": [{"date": "2025-05-19", "time": "08:00", "endTime": "09:00", "caregiverName": "Sophie", "notes": "Toilette"}, ...]}

Si le document ne contient pas de planning lisible, réponds : {"appointments": [], "error": "Planning non reconnu"}`
          }
        ]
      }]
    })

    const raw = (message.content[0] as { type: string; text: string }).text.trim()

    // Extract JSON even if there's surrounding text
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ appointments: [], error: 'Format non reconnu' })

    const parsed = JSON.parse(match[0])
    return NextResponse.json(parsed)
  } catch (err) {
    console.error('PDF parse error:', err)
    return NextResponse.json({ appointments: [], error: 'Erreur lors de l\'analyse' }, { status: 500 })
  }
}
