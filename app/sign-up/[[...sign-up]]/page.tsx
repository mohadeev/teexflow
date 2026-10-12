import type { Metadata } from 'next'
import Link from 'next/link'
import { SignUp } from '@clerk/nextjs'
import { AuthShell } from '@/components/auth/AuthShell'

export const metadata: Metadata = { title: 'Create your account', robots: { index: false } }

export default function SignUpPage() {
  return (
    <AuthShell
      footer={
        <>
          By creating an account, you agree to the{' '}
          <Link href="/terms" className="link">Terms of Service</Link> and acknowledge the{' '}
          <Link href="/privacy" className="link">Privacy Policy</Link>.
        </>
      }
    >
      <SignUp fallbackRedirectUrl="/start" signInFallbackRedirectUrl="/start" />
    </AuthShell>
  )
}
