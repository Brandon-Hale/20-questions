import type { Metadata } from 'next'
import './globals.css'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://20qs.brandonhaledev.com'

export const metadata: Metadata = {
  title: {
    default: '20 Questions — AI Guessing Game',
    template: '%s | 20 Questions',
  },
  description:
    'Play 20 Questions against an AI. Pick a category, ask yes-or-no questions, and try to guess what the AI is thinking of. Free, no sign-up required.',
  keywords: [
    '20 questions',
    'twenty questions',
    'AI game',
    'guessing game',
    'trivia',
    'word game',
    'AI trivia',
    'online game',
    'free game',
  ],
  authors: [{ name: 'Brandon Hale' }],
  creator: 'Brandon Hale',
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: '20 Questions',
    title: '20 Questions — AI Guessing Game',
    description:
      'Can you guess what the AI is thinking of in 20 questions? Pick a category and start guessing!',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: '20 Questions — AI Guessing Game',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '20 Questions — AI Guessing Game',
    description:
      'Can you guess what the AI is thinking of in 20 questions? Pick a category and start guessing!',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  manifest: '/manifest.json',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: '20 Questions',
  description:
    'Play 20 Questions against an AI. Pick a category, ask yes-or-no questions, and try to guess what the AI is thinking of.',
  url: siteUrl,
  applicationCategory: 'Game',
  operatingSystem: 'Any',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=DM+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
