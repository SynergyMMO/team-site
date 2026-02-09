import { useEffect } from 'react'

const SITE_NAME = 'Team Synergy - PokeMMO'
const BASE_URL = 'https://synergymmo.com'
const DEFAULT_IMAGE = `${BASE_URL}/favicon.png`
const DEFAULT_DESCRIPTION = 'Team Synergy is a PokeMMO shiny hunting team. Browse our shiny dex, view shiny collections, watch our streamers, and generate encounter counter themes.'

function setMeta(name, content, attr = 'name') {
  let el = document.querySelector(`meta[${attr}="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}


function setCanonical(path) {
  let el = document.querySelector('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', `${BASE_URL}${path}`)
}

export function useDocumentHead({ title, description, canonicalPath = '/', ogImage, ogType = 'website' } = {}) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME
    const desc = description || DEFAULT_DESCRIPTION
    const image = ogImage || DEFAULT_IMAGE
    console.log('Setting OG image to', ogImage)
    const url = `${BASE_URL}${canonicalPath}`

    document.title = fullTitle

    setMeta('description', desc)

    // Open Graph
    setMeta('og:title', fullTitle, 'property')
    setMeta('og:description', desc, 'property')
    setMeta('og:image', image, 'property')
    setMeta('og:url', url, 'property')
    setMeta('og:type', ogType, 'property')
    setMeta('og:site_name', SITE_NAME, 'property')

    // Twitter Card
    setMeta('twitter:card', 'summary')
    setMeta('twitter:title', fullTitle)
    setMeta('twitter:description', desc)
    setMeta('twitter:image', image)

    setCanonical(canonicalPath)

    return () => {
      document.title = SITE_NAME
      setMeta('description', DEFAULT_DESCRIPTION)
      setMeta('og:title', SITE_NAME, 'property')
      setMeta('og:description', DEFAULT_DESCRIPTION, 'property')
      setMeta('og:image', DEFAULT_IMAGE, 'property')
      setMeta('og:url', BASE_URL, 'property')
      setMeta('og:type', 'website', 'property')
      setMeta('twitter:title', SITE_NAME)
      setMeta('twitter:description', DEFAULT_DESCRIPTION)
      setMeta('twitter:image', DEFAULT_IMAGE)
      setCanonical('/')
    }
  }, [title, description, canonicalPath, ogImage, ogType])
}
