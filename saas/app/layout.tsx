import type { Metadata, Viewport } from 'next'
import { Archivo, Archivo_Black, Space_Mono } from 'next/font/google'
import './globals.css'

export const metadata: Metadata = {
  title: 'Vitalcar SaaS | Gestão Completa para Estética Automotiva',
  description: 'Sistema completo para oficinas de estética automotiva: agendamentos, clientes, financeiro, relatórios e muito mais.',
  keywords: ['estética automotiva', 'gestão oficina', 'agendamento', 'CRM', 'SaaS', 'detailing'],
  authors: [{ name: 'Vitalcar' }],
  creator: 'Vitalcar',
  publisher: 'Vitalcar',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: 'https://vitalcar.app',
    siteName: 'Vitalcar SaaS',
    title: 'Vitalcar SaaS | Gestão Completa para Estética Automotiva',
    description: 'Sistema completo para oficinas de estética automotiva.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Vitalcar SaaS Dashboard',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vitalcar SaaS',
    description: 'Gestão completa para estética automotiva.',
    images: ['/og-image.png'],
  },
  verification: {
    google: 'google-site-verification-code',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0d0b0a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

const arquivo = Archivo({
  subsets: ['latin'],
  variable: '--font-archivo',
  weight: ['400', '500', '600', '700', '900'],
  display: 'swap',
})

const arquivoBlack = Archivo_Black({
  subsets: ['latin'],
  variable: '--font-archivo-black',
  weight: ['400'],
  display: 'swap',
})

const spaceMono = Space_Mono({
  subsets: ['latin'],
  variable: '--font-space-mono',
  weight: ['400', '700'],
  display: 'swap',
})

import { SWRegister } from "@/components/ui/sw-register";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className={`${arquivo.variable} ${arquivoBlack.variable} ${spaceMono.variable} dark`}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#ff1a1a" />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <SWRegister />
        {children}
      </body>
    </html>
  )
}