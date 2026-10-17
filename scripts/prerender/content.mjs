// Keywords, FAQs, hidden semantic content and crawler navigation for a page.
import {
  SITE, PAGE_KEYWORDS, DYNAMIC_KEYWORDS, PAGE_FAQS, DYNAMIC_FAQS, HIDDEN_SEO_CONTENT, DYNAMIC_PAGES,
} from './config.mjs';
import { escapeHtml, fill, humanize, withTrailingSlash } from './utils.mjs';

const stripSlash = (route) => (route.length > 1 ? route.replace(/\/+$/, '') : route);

// Alias pages (canonical set) reuse the content of the page they point to
const contentRoute = (page) => (page.canonical ? stripSlash(page.canonical) : page.route);

export function getKeywords(page) {
  if (page.type === 'static') {
    return PAGE_KEYWORDS[contentRoute(page)] || SITE.defaultKeywords;
  }
  const template = DYNAMIC_KEYWORDS[page.type];
  return template ? fill(template, page.vars) : SITE.defaultKeywords;
}

export function getFaqs(page) {
  const faqs = page.type === 'static' ? PAGE_FAQS[page.route] : DYNAMIC_FAQS[page.type];
  if (!faqs) return null;
  if (page.type === 'static') return faqs;

  const vars = { ...page.vars, name: page.name };
  return faqs.map(({ question, answer }) => ({
    question: fill(question, vars),
    answer: fill(answer, vars),
  }));
}

// Hidden (display:none) semantic text: an <h1> plus any page-specific copy
export function getHiddenContent(page) {
  const heading = page.title.split('|')[0].trim();

  if (page.type === 'resource') {
    const segments = page.route.split('/').filter(Boolean).slice(1);
    const breadcrumb = segments.map(humanize).join(' > ');
    const description = page.description?.length > 20
      ? page.description
      : 'Explore Team Synergy resources for PokeMMO guides, tools, and community links';
    return `<h1 class="seo-semantic-hidden">${escapeHtml(heading || breadcrumb)}</h1>` +
      `<nav class="seo-semantic-hidden" role="navigation"><p>Breadcrumb: Resources > ${escapeHtml(breadcrumb)}</p></nav>` +
      `<section class="seo-semantic-hidden"><p>${escapeHtml(description)}</p></section>`;
  }

  return HIDDEN_SEO_CONTENT[contentRoute(page)] ||
    `<h1 class="seo-semantic-hidden">${escapeHtml(heading || SITE.defaultTitle)}</h1>`;
}

// Hidden <nav> that gives crawlers internal links to related pages
export function getCrawlerNav(page) {
  const related = DYNAMIC_PAGES[page.type]?.relatedLinks || [];
  const selfHref = withTrailingSlash(page.route);

  const seen = new Set([selfHref]);
  const links = [...SITE.mainNavLinks, ...related, ...(page.crawlerLinks || [])].filter(link => {
    if (seen.has(link.href)) return false;
    seen.add(link.href);
    return true;
  });

  if (!links.length) return '';

  return `
  <nav class="crawler-nav" aria-hidden="true" role="navigation">
    ${links.map(link => `<a href="${escapeHtml(link.href)}" title="${escapeHtml(link.title)}"></a>`).join('\n    ')}
  </nav>`;
}
