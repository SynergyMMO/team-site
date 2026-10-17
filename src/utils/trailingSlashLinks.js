// GitHub Pages 301-redirects /route to /route/. Rewriting internal hrefs to the
// slashed form avoids those redirects (reported as "Page with redirect") for crawlers.
function fixLink(a) {
  const href = a.getAttribute('href');
  if (!href || !href.startsWith('/') || href.startsWith('//')) return;

  const match = href.match(/^([^?#]*)(.*)$/);
  const [, path, rest] = match;
  if (path.endsWith('/') || /\.[a-z0-9]+$/i.test(path)) return;
  a.setAttribute('href', `${path}/${rest}`);
}

function fixTree(root) {
  if (root.nodeType !== 1) return;
  if (root.tagName === 'A') fixLink(root);
  root.querySelectorAll?.('a[href^="/"]').forEach(fixLink);
}

export function startTrailingSlashLinks() {
  fixTree(document.body);
  new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'attributes') fixLink(m.target);
      else m.addedNodes.forEach(fixTree);
    }
  }).observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['href'],
  });
}
