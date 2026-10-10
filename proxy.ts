import { clerkMiddleware } from '@clerk/nextjs/server'

// Clerk reads the session here; each protected page, layout and server action
// checks auth itself (dashboard layout, controller layout, lib/actions).
export default clerkMiddleware({ signInUrl: '/sign-in', signUpUrl: '/sign-up' })

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
