import type { Metadata } from 'next';

export const SITE_URL = 'https://quiefx.dev';
export const REPOSITORY = 'https://github.com/filipeafns/quiet-fx';
export const SITE_TITLE = 'Quiet FX | Free Open-Source UI Sound Effects';
export const SITE_DESCRIPTION =
  'Explore 72 gentle UI sound effects and 432 variations. Shape sounds, test them with motion, export WAV or MP3, or use the MIT-licensed JavaScript library.';

export function pageMetadata(
  title: string,
  description: string,
  path = '/',
): Metadata {
  const url = new URL(path, SITE_URL).href;
  const image = {
    url: `${SITE_URL}/og-image.png`,
    width: 1200,
    height: 630,
    alt: 'Quiet FX. Gentle, open-source sound effects for interfaces and motion.',
  };
  return {
    metadataBase: new URL(SITE_URL),
    title: 'Quiet FX',
    description,
    applicationName: 'Quiet FX',
    authors: [{ name: 'Filipe Soares', url: 'https://github.com/filipeafns' }],
    creator: 'Filipe Soares',
    alternates: { canonical: url },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    icons: { icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }] },
    openGraph: {
      type: 'website',
      locale: 'en_US',
      siteName: 'Quiet FX',
      url,
      title,
      description,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

export const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: 'Quiet FX',
      url: `${SITE_URL}/`,
      description: SITE_DESCRIPTION,
      inLanguage: 'en',
      publisher: { '@id': `${SITE_URL}/#author` },
    },
    {
      '@type': 'Person',
      '@id': `${SITE_URL}/#author`,
      name: 'Filipe Soares',
      url: 'https://github.com/filipeafns',
    },
    {
      '@type': 'SoftwareSourceCode',
      '@id': `${SITE_URL}/#library`,
      name: 'Quiet FX',
      url: `${SITE_URL}/`,
      description: SITE_DESCRIPTION,
      codeRepository: REPOSITORY,
      programmingLanguage: ['JavaScript', 'TypeScript'],
      runtimePlatform: 'Web Audio API',
      license: `${SITE_URL}/licenses/QUIET-MIT.txt`,
      isAccessibleForFree: true,
      author: { '@id': `${SITE_URL}/#author` },
      targetProduct: { '@id': `${SITE_URL}/#studio` },
    },
    {
      '@type': 'WebApplication',
      '@id': `${SITE_URL}/#studio`,
      name: 'Quiet FX Sound Studio',
      url: `${SITE_URL}/studio`,
      description:
        'A free browser studio for shaping gentle UI sounds, previewing them with motion, and exporting WAV or MP3.',
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Any',
      browserRequirements:
        'A modern browser with Web Audio API support. Playback requires a user gesture.',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      license: `${SITE_URL}/licenses/QUIET-MIT.txt`,
      featureList: [
        '72 procedural sounds',
        '432 named variations',
        '12 musical keys',
        'Major, Minor and Pentatonic scales',
        'WAV and MP3 export',
        'Motion sandbox',
      ],
      author: { '@id': `${SITE_URL}/#author` },
    },
  ],
};
