import { emailLayout } from './layout'

export function magicLinkEmail(url: string) {
  return {
    subject: 'Your ChuckFest sign-in link',
    html: emailLayout({
      heading: 'Sign in to ChuckFest',
      body: '<p>Tap the button to sign in. The link works once and expires in 30 minutes.</p>',
      cta: { label: 'Sign in', url },
    }),
    text: `Sign in to ChuckFest: ${url}\n\nThe link works once and expires in 30 minutes.`,
  }
}
