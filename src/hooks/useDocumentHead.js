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

export function useDocumentHead({
  title,
  description,
  url,          
  canonicalPath,  
  ogImage,
  ogType = 'website',
  siteName = DEFAULT_SITE_NAME,
  twitterCard = 'summary_large_image', // default to large image for shinies
} = {}) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${siteName}` : siteName;
    const desc = description || DEFAULT_DESCRIPTION;
    const image = ogImage || DEFAULT_IMAGE;
    const finalUrl = url || `${DEFAULT_BASE_URL}${canonicalPath || '/'}`;

    document.title = fullTitle;

    // --- Standard Meta ---
    setMeta('description', desc);

    // --- Open Graph ---
    setMeta('og:title', fullTitle, 'property');
    setMeta('og:description', desc, 'property');
    setMeta('og:image', image, 'property');
    setMeta('og:url', finalUrl, 'property');
    setMeta('og:type', ogType, 'property');
    setMeta('og:site_name', siteName, 'property');

    // --- Twitter Card (mirror OG tags) ---
    setMeta('twitter:card', twitterCard);
    setMeta('twitter:title', fullTitle);
    setMeta('twitter:description', desc);
    setMeta('twitter:image', image);

    // --- Canonical ---
    setCanonical(finalUrl);

    return () => {
      // Reset all to defaults
      document.title = siteName;
      setMeta('description', DEFAULT_DESCRIPTION);
      setMeta('og:title', siteName, 'property');
      setMeta('og:description', DEFAULT_DESCRIPTION, 'property');
      setMeta('og:image', DEFAULT_IMAGE, 'property');
      setMeta('og:url', DEFAULT_BASE_URL, 'property');
      setMeta('og:type', 'website', 'property');
      setMeta('og:site_name', siteName, 'property');

      setMeta('twitter:card', 'summary');
      setMeta('twitter:title', siteName);
      setMeta('twitter:description', DEFAULT_DESCRIPTION);
      setMeta('twitter:image', DEFAULT_IMAGE);

      setCanonical(DEFAULT_BASE_URL);
    };
  }, [
    title,
    description,
    url,
    canonicalPath,
    ogImage,
    ogType,
    siteName,
    twitterCard,
  ]);
}
