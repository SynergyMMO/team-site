export const slugify = (text) =>
  String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// Matches the sanitising used for pokemon sprite / route names in the app
export const sanitizeName = (name) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019']/g, '')
    .replace(/\./g, '')
    .replace(/\s+/g, '-')
    .replace(/[♀]/g, 'f')
    .replace(/[♂]/g, 'm');

export const capitalize = (str) => (str ? str.charAt(0).toUpperCase() + str.slice(1) : '');

export const humanize = (slug) =>
  slug.split('-').filter(Boolean).map(capitalize).join(' ');

export const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

export const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Strip tags and collapse whitespace so descriptions never break a meta attribute
export const cleanText = (value) =>
  String(value ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

// Replaces every {placeholder} in a template with its value from vars
export const fill = (template, vars = {}) =>
  template.replace(/\{(\w+)\}/g, (match, key) => (vars[key] !== undefined ? vars[key] : match));

// GitHub Pages 301s any directory URL without a trailing slash, so every
// public URL we publish (canonical, og:url, schema, links) must end in "/".
export const withTrailingSlash = (path) => {
  const [pathname, ...rest] = path.split(/(?=[?#])/);
  return (pathname.endsWith('/') ? pathname : `${pathname}/`) + rest.join('');
};

export async function fetchJson(url, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      lastError = err;
      if (attempt < attempts) await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
  throw new Error(`Failed to fetch ${url}: ${lastError.message}`);
}

// Serialise JSON-LD safely for embedding inside a <script> tag
export const jsonLdScript = (schema) =>
  `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2).replace(/</g, '\\u003c')}\n</script>`;
