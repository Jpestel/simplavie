# SimplaVie

Application web d'accompagnement du quotidien pour une personne en situation de dépendance et son entourage aidant.

En production : **https://simplavie.pastech.fr**

## Modules

`src/app/modules/` — routine, rappels, agenda, contacts, aidants, finances, services.

Trois rôles : `user`, `admin` (`src/app/admin/`), `superadmin` (`src/app/superadmin/`).

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · TailwindCSS 4 · Prisma (MySQL, client généré dans `src/generated/prisma`) · NextAuth v4 · Resend (emails) · SDK Anthropic (route `api/parse-planning`).

## Développement

```bash
npm install
npx prisma generate
npm run dev
```

Ouvrir http://localhost:3000.

Variables d'environnement dans `.env.local` : `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_NAME`, `RESEND_API_KEY`, `CRON_SECRET`.

⚠️ Le `DATABASE_URL` local pointe aujourd'hui vers la base **de production**. Vérifier avant de lancer `npm run dev`.

## Base de données

Le schéma fait foi : `prisma/schema.prisma`. Pas de dossier `migrations` — les changements de schéma se propagent avec `npx prisma db push`.

## Déploiement

VPS + pm2 + nginx (pas Vercel). Sur le serveur, dans `/var/www/simplavie` en tant qu'utilisateur `toxic` :

```bash
git pull origin main
npm install          # si package.json a changé
npx prisma generate  # si le schéma a changé
npm run build
pm2 restart simplavie
```

`.next/` et `src/generated/prisma/` sont gitignorés : le build se fait donc sur le serveur.
