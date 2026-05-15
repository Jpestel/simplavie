import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ConfigProvider } from '@/lib/configContext'
import { ProfileProvider } from '@/lib/profileContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SimplaVie',
  description: 'Simplifier la vie au quotidien',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        <ConfigProvider>
          <ProfileProvider>
            {children}
          </ProfileProvider>
        </ConfigProvider>
      </body>
    </html>
  )
}
