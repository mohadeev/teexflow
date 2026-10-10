'use client'

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  const missingKey = error.message.includes('SUPABASE_SECRET_KEY')
  return (
    <main className="mx-auto flex max-w-[480px] flex-col items-center px-5 py-32 text-center">
      <h1 className="text-[24px] font-semibold tracking-[-0.02em]">Something went wrong</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
        {missingKey
          ? 'The server can’t reach the database yet. Add SUPABASE_SECRET_KEY to your environment and restart.'
          : 'We couldn’t load this page. Please try again in a moment.'}
      </p>
      <button onClick={reset} className="btn btn-secondary mt-8">Try again</button>
    </main>
  )
}
