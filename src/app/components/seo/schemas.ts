const SITE_URL = 'https://nfc.brandapt.co'

export const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'BrandApt NFC',
  url: SITE_URL,
  logo: `${SITE_URL}/favicon.svg`,
  description: 'Digital business cards powered by NFC technology.',
}

export const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'BrandApt NFC',
  url: SITE_URL,
}

export function personSchema(profile: {
  name: string
  title?: string
  company?: string
  bio?: string
  photoUrl?: string
  profileUrl: string
  email?: string
  phone?: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.name,
    ...(profile.title && { jobTitle: profile.title }),
    ...(profile.company && {
      worksFor: { '@type': 'Organization', name: profile.company },
    }),
    ...(profile.bio && { description: profile.bio }),
    ...(profile.photoUrl && { image: profile.photoUrl }),
    url: profile.profileUrl,
    ...(profile.email && { email: `mailto:${profile.email}` }),
    ...(profile.phone && { telephone: profile.phone }),
  }
}

export function profilePageSchema(profile: {
  name: string
  profileUrl: string
  description: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    name: `${profile.name} — Digital Business Card`,
    url: profile.profileUrl,
    description: profile.description,
    mainEntity: {
      '@type': 'Person',
      name: profile.name,
    },
  }
}
