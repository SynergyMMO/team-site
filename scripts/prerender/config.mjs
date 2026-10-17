import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const here = fileURLToPath(new URL('.', import.meta.url));

export const ROOT = join(here, '..', '..');
export const DIST = join(ROOT, 'dist');
export const DATA_DIR = join(ROOT, 'src', 'data');
export const SEO_DIR = join(ROOT, 'scripts', 'seo');

export const readJson = (path) => JSON.parse(readFileSync(path, 'utf-8'));
const seo = (file) => readJson(join(SEO_DIR, file));
const data = (file) => readJson(join(DATA_DIR, file));

// All editable SEO content lives in scripts/seo/*.json - see scripts/seo/README.md
export const SITE = seo('site.json');
export const STATIC_PAGES = seo('static_pages.json');
export const DYNAMIC_PAGES = seo('dynamic_pages.json');
export const { PAGE_KEYWORDS, DYNAMIC_KEYWORDS } = seo('page_keywords.json');
export const { PAGE_FAQS, DYNAMIC_FAQS } = seo('page_faqs.json');
export const { HIDDEN_SEO_CONTENT } = seo('seo_hidden_content.json');
export const { CREATORS } = seo('creators.json');

export const DOMAIN = SITE.domain;

export const tierPokemon = data('tier_pokemon.json');
export const trophiesData = data('trophies.json');
export const resourcesData = data('resources.json');
export const pokemonData = data('pokemmo_data/pokemon-data.json');
