import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import { Providers } from './providers'
import { Sidebar } from '@/components/layout/Sidebar'
import { CommandPalette } from '@/components/command-palette'
import { Toaster } from '@/components/ui/toaster'

export const metadata: Metadata = {
  title: 'Clear AI - Waste Management',
  description: 'AI-powered waste management operations assistant',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}>
        <Providers>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 ml-56 transition-all duration-300">
              {children}
            </main>
          </div>
          <CommandPalette />
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}

