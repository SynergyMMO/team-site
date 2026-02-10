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
    let finalUrl = url || `${DEFAULT_BASE_URL}${canonicalPath || '/'}`;

    // --- REMOVE QUERY STRINGS for clean OG URL and canonical ---
    finalUrl = finalUrl.split('?')[0];

    document.title = fullTitle;

    // --- Standard Meta ---
    setMeta('description', desc);

    // --- Open Graph ---
    setMeta('og:title', fullTitle, 'property');
    setMeta('og:description', desc, 'property');
    setMeta('og:image', image, 'property');
    setMeta('og:url', finalUrl, 'property'); // clean URL
    setMeta('og:type', ogType, 'property');
    setMeta('og:site_name', siteName, 'property');

    // --- Twitter Card (mirror OG tags) ---
    setMeta('twitter:card', twitterCard);
    setMeta('twitter:title', fullTitle);
    setMeta('twitter:description', desc);
    setMeta('twitter:image', image);

    // --- Canonical ---
    setCanonical(finalUrl); // clean URL

    // Note: Removed aggressive cleanup that was resetting tags on unmount.
    // This was causing issues with React Router where the cleanup would fire
    // before the new page's hook could set tags, briefly showing defaults.
    // Since each page calls useDocumentHead with its own values, we don't need
    // to reset tags here. The next page will properly set its own.
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
