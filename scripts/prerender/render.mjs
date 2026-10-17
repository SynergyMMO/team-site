// Turns the Vite-built index.html into a fully prerendered page for one route.
import { DOMAIN, SITE, DYNAMIC_PAGES } from './config.mjs';
import { cleanText, escapeHtml, escapeRegExp, jsonLdScript, withTrailingSlash } from './utils.mjs';
import {
  getKeywords, getFaqs, getHiddenContent, getCrawlerNav,
  getPokemonIndex, getPokemonRelatedLinks,
} from './content.mjs';
import { buildSchemas } from './schemas.mjs';

const INDEXABLE_ROBOTS = 'index, follow, max-image-preview:large';
const NOINDEX_ROBOTS = 'noindex, follow';
const MAX_DESCRIPTION_LENGTH = 160;
const OG_TYPES = { player: 'profile', event: 'article', resource: 'article' };

// Tags added only when the template does not already define them
const HEAD_DEFAULTS = [
  { match: 'name="mobile-web-app-capable"', tag: '<meta name="mobile-web-app-capable" content="yes">' },
  { match: 'name="apple-mobile-web-app-status-bar-style"', tag: '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">' },
  { match: 'name="author"', tag: `<meta name="author" content="${escapeHtml(SITE.authorMeta)}">` },
];

// ---------- <head> helpers (replacers are functions so "$" in content is never special) ----------
const insertInHead = (html, tag) => html.replace('</head>', () => `  ${tag}\n</head>`);

function upsert(html, pattern, tag) {
  return pattern.test(html) ? html.replace(pattern, () => tag) : insertInHead(html, tag);
}

const setTitle = (html, title) =>
  upsert(html, /<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`);

function setMeta(html, attr, key, content) {
  const pattern = new RegExp(`<meta\\s+${attr}="${escapeRegExp(key)}"[^>]*>`, 'i');
  return upsert(html, pattern, `<meta ${attr}="${key}" content="${escapeHtml(content)}">`);
}

const setLink = (html, rel, href, extra = '') => {
  const pattern = extra
    ? new RegExp(`<link\\s+rel="${rel}"\\s+hreflang="[^"]*"[^>]*>`, 'i')
    : new RegExp(`<link\\s+rel="${rel}"[^>]*>`, 'i');
  return upsert(html, pattern, `<link rel="${rel}"${extra} href="${escapeHtml(href)}">`);
};

function applyHead(html, page, { url, description, keywords }) {
  const robots = page.noindex ? NOINDEX_ROBOTS : INDEXABLE_ROBOTS;
  const altText = page.title.split('|')[0].trim();

  html = setTitle(html, page.title);
  html = setMeta(html, 'name', 'description', description);
  html = setMeta(html, 'name', 'keywords', keywords);
  html = setMeta(html, 'name', 'robots', robots);

  html = setMeta(html, 'property', 'og:title', page.title);
  html = setMeta(html, 'property', 'og:description', description);
  html = setMeta(html, 'property', 'og:image', page.image);
  html = setMeta(html, 'property', 'og:url', url);
  html = setMeta(html, 'property', 'og:type', OG_TYPES[page.type] || 'website');
  html = setMeta(html, 'property', 'og:locale', 'en_US');
  html = setMeta(html, 'property', 'og:image:alt', altText);

  html = setMeta(html, 'name', 'twitter:card', 'summary_large_image');
  html = setMeta(html, 'name', 'twitter:title', page.title);
  html = setMeta(html, 'name', 'twitter:description', description);
  html = setMeta(html, 'name', 'twitter:image', page.image);
  html = setMeta(html, 'name', 'twitter:image:alt', altText);

  html = setLink(html, 'canonical', url);
  html = setLink(html, 'alternate', url, ' hreflang="en"');

  for (const { match, tag } of HEAD_DEFAULTS) {
    if (!html.includes(match)) html = insertInHead(html, tag);
  }
  return html;
}

// ---------- public API ----------
export const PRERENDER_MARKER = '<!-- prerendered -->';

export function renderPage(templateHtml, page) {
  const url = `${DOMAIN}${withTrailingSlash(page.canonical || page.route)}`;
  const description = cleanText(page.description || SITE.defaultDescription);
  const keywords = getKeywords(page);

  if (description.length > MAX_DESCRIPTION_LENGTH) {
    console.warn(`  description is ${description.length} chars (>${MAX_DESCRIPTION_LENGTH}): ${page.route}`);
  }

  let html = applyHead(templateHtml, { ...page, title: cleanText(page.title) || SITE.defaultTitle }, { url, description, keywords });

  const hiddenContent = page.type === 'static' && page.route === '/pokedex'
    ? ''
    : getHiddenContent(page);
  html = html.replace(/<body[^>]*>/, () => `<body>\n  ${PRERENDER_MARKER}\n  ${hiddenContent}`);

  const parent = DYNAMIC_PAGES[page.type]?.parent;
  const schemas = buildSchemas(page, { faqs: getFaqs(page), parent });
  const schemaHtml = schemas.map(jsonLdScript).join('\n  ');
  const crawlerNav = page.type === 'static' && page.route === '/pokedex' || page.type === 'pokemon'
    ? ''
    : getCrawlerNav(page);
  html = html.replace(
    '</body>',
    () => `  ${schemaHtml}${crawlerNav}${getPokemonIndex(page)}${getPokemonRelatedLinks(page)}\n</body>`,
  );

  return html;
}
