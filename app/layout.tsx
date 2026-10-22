import type { Metadata, Viewport } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { SITE } from '@/lib/site'
import { Analytics } from '@/components/Analytics'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — The teleprompter that follows your voice`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  openGraph: {
    title: SITE.name,
    description: SITE.description,
    siteName: SITE.name,
    type: 'website',
    locale: 'en_US',
  },
  twitter: { card: 'summary_large_image', title: SITE.name, description: SITE.description },
}

export const viewport: Viewport = {
  themeColor: '#000000',
  colorScheme: 'dark',
}

const clerkAppearance = {
  variables: {
    colorPrimary: '#0a84ff',
    colorBackground: '#161618',
    colorForeground: '#f5f5f7',
    colorMutedForeground: '#a1a1a6',
    colorInput: '#1f1f22',
    colorInputForeground: '#f5f5f7',
    colorNeutral: '#ffffff',
    colorBorder: 'rgba(255,255,255,0.1)',
    colorDanger: '#ff453a',
    colorSuccess: '#30d158',
    colorModalBackdrop: 'rgba(0,0,0,0.7)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, "Segoe UI", sans-serif',
    borderRadius: '0.75rem',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={clerkAppearance}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
      afterSignOutUrl="/"
    >
      <html lang="en">
        <body className="min-h-dvh">
          {children}
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  )
}
