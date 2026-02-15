import { useEffect } from 'react';

const DEFAULT_SITE_NAME = 'Team Synergy - PokeMMO';
const DEFAULT_BASE_URL = 'https://synergymmo.com';
const DEFAULT_IMAGE = `${DEFAULT_BASE_URL}/favicon.png`;
const DEFAULT_DESCRIPTION =
  'Team Synergy is a PokeMMO shiny hunting team. Browse our shiny dex, view shiny collections, watch our streamers, and generate encounter counter themes.';

function setMeta(name, content, attr = 'name') {
  let el = document.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(url) {
  let el = document.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', url);
}

// Function to add or update structured data
function setStructuredData(schema, id = 'structured-data') {
  let script = document.querySelector(`script#${id}`);
  if (!script) {
    script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = id;
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(schema);
}

export function useDocumentHead({
  title,
  description,
  url,          
  canonicalPath,  
  ogImage,
  ogType = 'website',
  siteName = DEFAULT_SITE_NAME,
  twitterCard = 'summary_large_image',
  // Additional SEO options
  robots = 'index, follow, max-image-preview:large',
  structuredData = null,
  breadcrumbs = null,
  imageAlt = null,
  author = null,
} = {}) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${siteName}` : siteName;
    const desc = description || DEFAULT_DESCRIPTION;
    const image = ogImage || DEFAULT_IMAGE;
    let finalUrl = url || `${DEFAULT_BASE_URL}${canonicalPath || '/'}`;

    // --- REMOVE QUERY STRINGS for clean OG URL and canonical ---
    finalUrl = finalUrl.split('?')[0];

    document.title = fullTitle;

    // --- Standard Meta ---
    setMeta('description', desc);

    // --- Set robots meta ---
    setMeta('robots', robots);

    // --- Set author if provided ---
    if (author) {
      setMeta('author', author);
    }

    // --- Open Graph ---
    setMeta('og:title', fullTitle, 'property');
    setMeta('og:description', desc, 'property');
    setMeta('og:image', image, 'property');
    setMeta('og:url', finalUrl, 'property');
    setMeta('og:type', ogType, 'property');
    setMeta('og:site_name', siteName, 'property');

    // --- Add image alt text if available ---
    if (imageAlt) {
      setMeta('og:image:alt', imageAlt, 'property');
    }

    // --- Twitter Card (mirror OG tags) ---
    setMeta('twitter:card', twitterCard);
    setMeta('twitter:title', fullTitle);
    setMeta('twitter:description', desc);
    setMeta('twitter:image', image);

    // --- Canonical ---
    setCanonical(finalUrl);

    // --- Handle breadcrumb schema ---
    if (breadcrumbs && breadcrumbs.length > 0) {
      const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': breadcrumbs.map((item, idx) => ({
          '@type': 'ListItem',
          'position': idx + 1,
          'name': item.name,
          'item': item.url.startsWith('http') ? item.url : `${DEFAULT_BASE_URL}${item.url}`
        }))
      };
      setStructuredData(breadcrumbSchema, 'breadcrumb-schema');
    }

    // --- Handle custom structured data ---
    if (structuredData) {
      setStructuredData(structuredData, 'page-schema');
    }

  }, [
    title,
    description,
    url,
    canonicalPath,
    ogImage,
    ogType,
    siteName,
    twitterCard,
    robots,
    structuredData,
    breadcrumbs,
    imageAlt,
    author,
  ]);
}

