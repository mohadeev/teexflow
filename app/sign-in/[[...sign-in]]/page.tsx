import type { Metadata } from 'next'
import { SignIn } from '@clerk/nextjs'
import { AuthShell } from '@/components/auth/AuthShell'

export const metadata: Metadata = { title: 'Sign in', robots: { index: false } }

export default function SignInPage() {
  return (
    <AuthShell>
      {/* Without a redirect_url, ask which device this is (controller or display). */}
      <SignIn fallbackRedirectUrl="/start" signUpFallbackRedirectUrl="/start" />
    </AuthShell>
  )
}
