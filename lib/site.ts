// Business details shown on the legal pages and in the footer.
// Replace these with your registered company details before launch.
export const SITE = {
  name: 'TeexFlow',
  // The public address, for canonical links, share images and the sitemap.
  url: (process.env.NEXT_PUBLIC_SITE_URL || 'https://teexflow.com').replace(/\/$/, ''),
  legalName: process.env.NEXT_PUBLIC_LEGAL_NAME || 'TeexFlow',
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'support@teexflow.com',
  address: process.env.NEXT_PUBLIC_LEGAL_ADDRESS || '',
  governingLaw: process.env.NEXT_PUBLIC_GOVERNING_LAW || 'France',
  legalUpdated: 'October 9, 2026',
  description:
    'The teleprompter that follows your voice. Write on your laptop, read from any screen, control it from your phone.',
}
