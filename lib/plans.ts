export const FREE_SCRIPT_LIMIT = 3
export const TRIAL_DAYS = 15

export const PLANS = {
  free: {
    name: 'Free',
    tagline: 'Everything you need for your first takes.',
    monthly: 0,
    yearly: 0,
    features: [
      `Up to ${FREE_SCRIPT_LIMIT} scripts`,
      'Smooth auto-scroll and paragraph framing',
      'Control from your phone, read on any screen',
      'Mirror and rotate for beam-splitter rigs',
      'Keyboard shortcuts',
    ],
  },
  pro: {
    name: 'Pro',
    tagline: 'For people who show up on camera every week.',
    monthly: 9,
    yearly: 79,
    features: [
      'Unlimited scripts',
      'Voice tracking that follows your pace',
      'Everything in Free',
      'Priority email support',
    ],
  },
} as const

export type Interval = 'monthly' | 'yearly'
