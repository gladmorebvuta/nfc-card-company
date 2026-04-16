import { Helmet } from 'react-helmet-async'

interface SeoProps {
  title: string
  description: string
  url?: string
  image?: string
  type?: string
  noindex?: boolean
  jsonLd?: Record<string, unknown> | Record<string, unknown>[]
}

const SITE_URL = 'https://nfc.brandapt.co'
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`
const SITE_NAME = 'BrandApt NFC'

export function Seo({
  title,
  description,
  url,
  image = DEFAULT_IMAGE,
  type = 'website',
  noindex = false,
  jsonLd,
}: SeoProps) {
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} — ${SITE_NAME}`
  const canonicalUrl = url || SITE_URL

  const ldArray = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : []

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      {!noindex && <link rel="canonical" href={canonicalUrl} />}

      {/* Open Graph */}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* JSON-LD */}
      {!noindex &&
        ldArray.map((ld, i) => (
          <script key={i} type="application/ld+json">
            {JSON.stringify(ld)}
          </script>
        ))}
    </Helmet>
  )
}
