import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'

export const metadata: Metadata = {
  title:
    'Aplicação especializada para pesquisa e documentação de produtos de degradação de fármacos, com integração a IA (OpenRouter) e bases científicas (PubChem, Crossref, PubMed). Inclui cache e persistência via Supabase.',
  description:
    'Aplicação especializada para pesquisa e documentação de produtos de degradação de fármacos, integrada a OpenRouter, PubChem, Crossref e PubMed, com cache e persistência via Supabase.',
  generator: 'DegradScan',
  openGraph: {
    title:
      'Aplicação especializada para pesquisa e documentação de produtos de degradação de fármacos',
    description:
      'Integração a IA (OpenRouter) e bases científicas (PubChem, Crossref, PubMed). Inclui cache e persistência via Supabase.',
    siteName: 'DegradScan',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  )
}
