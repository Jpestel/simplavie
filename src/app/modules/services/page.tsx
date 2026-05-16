'use client'
import Link from 'next/link'

type Service = {
  name: string
  description: string
  url: string
  icon: string
}

type Category = {
  label: string
  color: string
  bgColor: string
  borderColor: string
  services: Service[]
}

const CATEGORIES: Category[] = [
  {
    label: 'Santé',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    services: [
      {
        name: 'Ameli (CPAM)',
        description: 'Remboursements, droits, carte Vitale, indemnités',
        url: 'https://www.ameli.fr',
        icon: '🏥',
      },
      {
        name: 'Mon Espace Santé',
        description: 'Dossier médical partagé, ordonnances, documents',
        url: 'https://www.monespacesante.fr',
        icon: '📋',
      },
      {
        name: 'Doctolib',
        description: 'Prendre rendez-vous chez un médecin ou spécialiste',
        url: 'https://www.doctolib.fr',
        icon: '📅',
      },
    ],
  },
  {
    label: 'Aides & Allocations',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    services: [
      {
        name: 'CAF',
        description: 'Allocations familiales, aides au logement, RSA',
        url: 'https://www.caf.fr',
        icon: '💶',
      },
      {
        name: 'MDPH',
        description: 'Maison Dép. des Personnes Handicapées — AAH, PCH, carte mobilité',
        url: 'https://www.mdph.fr',
        icon: '♿',
      },
      {
        name: 'Info Retraite',
        description: 'Droits retraite, simulation, relevé de carrière',
        url: 'https://www.info-retraite.fr',
        icon: '🏖️',
      },
      {
        name: 'Pôle Emploi (France Travail)',
        description: 'Allocations chômage, offres d\'emploi, formation',
        url: 'https://www.francetravail.fr',
        icon: '💼',
      },
    ],
  },
  {
    label: 'Impôts & Finances',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    services: [
      {
        name: 'Impôts',
        description: 'Déclaration de revenus, paiement, documents fiscaux',
        url: 'https://www.impots.gouv.fr',
        icon: '🧾',
      },
      {
        name: 'Mes Aides',
        description: 'Simuler toutes les aides sociales auxquelles vous avez droit',
        url: 'https://www.mes-aides.gouv.fr',
        icon: '🔍',
      },
    ],
  },
  {
    label: 'Démarches administratives',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    services: [
      {
        name: 'Service-Public.fr',
        description: 'Toutes les démarches administratives en ligne',
        url: 'https://www.service-public.fr',
        icon: '🏛️',
      },
      {
        name: 'France Connect',
        description: 'Connexion sécurisée à tous les services publics',
        url: 'https://franceconnect.gouv.fr',
        icon: '🔐',
      },
      {
        name: 'Carte Grise (ANTS)',
        description: 'Immatriculation, permis de conduire, documents véhicule',
        url: 'https://www.ants.gouv.fr',
        icon: '🚗',
      },
      {
        name: 'Ameli — Procuration',
        description: 'Désigner un mandataire pour gérer sa santé',
        url: 'https://www.ameli.fr/assure/droits-demarches/principes/vos-droits-sur-le-site-ameli',
        icon: '📝',
      },
    ],
  },
  {
    label: 'Logement',
    color: 'text-teal-700',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
    services: [
      {
        name: 'Visale (Action Logement)',
        description: 'Garantie loyer, aide au logement pour locataires',
        url: 'https://www.visale.fr',
        icon: '🏠',
      },
      {
        name: 'ANAH',
        description: 'Aides pour travaux d\'adaptation du logement au handicap',
        url: 'https://www.anah.gouv.fr',
        icon: '🔧',
      },
    ],
  },
  {
    label: 'Transports & Mobilité',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    services: [
      {
        name: 'SNCF Connect',
        description: 'Billets de train, tarifs réduits, carte invalidité',
        url: 'https://www.sncf-connect.com',
        icon: '🚆',
      },
      {
        name: 'Carte Mobilité Inclusion',
        description: 'Demande et renouvellement de la CMI (MDPH)',
        url: 'https://www.service-public.fr/particuliers/vosdroits/F15066',
        icon: '🪪',
      },
    ],
  },
]

export default function ServicesPage() {
  const handleOpen = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto pb-28">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/"
          className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all text-gray-600 font-bold text-lg"
        >
          ←
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Services utiles</h1>
          <p className="text-sm text-gray-400">Accès rapide aux sites officiels</p>
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-6">
        {CATEGORIES.map(category => (
          <section key={category.label}>
            <h2 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${category.color}`}>
              {category.label}
            </h2>
            <div className="space-y-3">
              {category.services.map(service => (
                <button
                  key={service.url}
                  onClick={() => handleOpen(service.url)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 ${category.bgColor} ${category.borderColor} hover:shadow-md active:scale-95 transition-all text-left`}
                >
                  <span className="text-3xl flex-shrink-0">{service.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold text-base ${category.color}`}>{service.name}</div>
                    <div className="text-sm text-gray-500 mt-0.5 leading-snug">{service.description}</div>
                  </div>
                  <span className="text-gray-300 text-lg flex-shrink-0">↗</span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Footer note */}
      <p className="text-center text-xs text-gray-300 mt-10">
        Ces liens ouvrent les sites officiels dans un nouvel onglet
      </p>
    </main>
  )
}
