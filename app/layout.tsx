import { AuthGuard } from '@/components/auth-guard'
import { AuthProvider } from '@/components/auth-provider'
import { Analytics } from '@vercel/analytics/next'
import type { Metadata } from 'next'
import type React from 'react'
import { Toaster } from 'sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'ControleC',
  description: 'Aplicação de controle financeiro pessoal',
  generator: 'Anbu Tech',
  icons: '/controleclogo.png',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`font-sans antialiased min-h-screen bg-background`}>
        <AuthProvider>
          <AuthGuard>{children}</AuthGuard>
        </AuthProvider>
        <Toaster position="top-center" richColors />
        <Analytics />
      </body>
    </html>
  )
}
