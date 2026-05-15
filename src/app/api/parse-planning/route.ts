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
            text: `Ce document est un planning mensuel d'interventions d'une société d'aide à domicile française.

Le format du planning est un tableau avec les jours de la semaine en colonnes (lun. mar. mer. jeu. ven. sam. dim.) et les semaines en lignes. Chaque cellule contient le numéro du jour du mois et une liste d'interventions au format : "HH:MM - HH:MM PRENOM N." (prénom complet + initiale du nom).

Extrait TOUTES les interventions du document avec :
- date : format YYYY-MM-DD. Déduis l'année et le mois depuis le titre du document (ex: "Septembre 2025" → 2025-09). Le numéro dans chaque cellule est le jour du mois.
- time : heure de début au format HH:MM
- endTime : heure de fin au format HH:MM
- caregiverName : prénom de l'intervenant tel qu'écrit (ex: "CHEIMAA", "MATHIAS", "AMANDINE"). Si la cellule indique "En cours de recherche", mettre null. Si c'est "Visite à domicile", mettre "Visite à domicile".
- notes : "Visite à domicile" si applicable, sinon null

Ignore les lignes "Total : XXhXXm".

Réponds UNIQUEMENT avec un JSON valide, sans texte autour :
{"appointments": [{"date": "2025-09-01", "time": "09:30", "endTime": "12:30", "caregiverName": "CHEIMAA", "notes": null}, ...]}

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
    const msg = err instanceof Error ? err.message : String(err)
    console.error('PDF parse error:', msg)
    return NextResponse.json({ appointments: [], error: `Erreur : ${msg}` }, { status: 500 })
  }
}
