// SEO Schema Template Functions (moved from prerender.mjs)
// These are pure functions, not using any runtime data

function generatePersonSchema(playerName) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": playerName,
    "url": `https://synergymmo.com/player/${playerName}/`,
    "memberOf": {
      "@type": "Organization",
      "name": "Team Synergy",
      "url": "https://synergymmo.com"
    }
  };
}

function generatePokemonSchema(name, sanitized) {
  return {
    "@context": "https://schema.org",
    "@type": "Thing",
    "name": name,
    "url": `https://synergymmo.com/pokemon/${sanitized}/`,
    "image": `https://img.pokemondb.net/sprites/black-white/anim/shiny/${sanitized}.gif`,
    "description": `${name} shiny form in PokeMMO`
  };
}

function generateBreadcrumbSchema(routePath, routeName) {
  const segments = routePath.split('/').filter(Boolean);
  let itemListElements = [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://synergymmo.com/"
    }
  ];
  let currentPath = '';
  segments.slice(0, -1).forEach((segment, idx) => {
    currentPath += '/' + segment;
    itemListElements.push({
      "@type": "ListItem",
      "position": idx + 2,
      "name": segment.charAt(0).toUpperCase() + segment.slice(1),
      "item": `https://synergymmo.com${currentPath}/`
    });
  });
  if (routePath !== '/') {
    itemListElements.push({
      "@type": "ListItem",
      "position": itemListElements.length + 1,
      "name": routeName,
      "item": `https://synergymmo.com${routePath}/`
    });
  }
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": itemListElements
  };
}

function generateResourceBreadcrumbSchema(routePath, resourceMeta = {}) {
  const segments = routePath.split('/').filter(Boolean);
  const itemListElements = [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://synergymmo.com/"
    }
  ];
  itemListElements.push({
    "@type": "ListItem",
    "position": 2,
    "name": "Resources",
    "item": "https://synergymmo.com/resources/"
  });
  let currentPath = '/resources';
  let position = 3;
  for (let i = 1; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += '/' + segment;
    const displayName = segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    itemListElements.push({
      "@type": "ListItem",
      "position": position,
      "name": displayName,
      "item": `https://synergymmo.com${currentPath}/`,
      ...(resourceMeta.description ? { "description": resourceMeta.description } : {})
    });
    position++;
  }
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": itemListElements
  };
}

function generateResourceCollectionSchema(routePath, categoryTitle, categoryDescription) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "url": `https://synergymmo.com${routePath}/`,
    "name": categoryTitle,
    "description": categoryDescription,
    "isPartOf": {
      "@type": "WebSite",
      "name": "Team Synergy",
      "url": "https://synergymmo.com"
    },
    "mainEntity": {
      "@type": "Collection",
      "name": categoryTitle,
      "description": categoryDescription,
      "inLanguage": "en",
      "creator": {
        "@type": "Organization",
        "name": "Team Synergy",
        "url": "https://synergymmo.com"
      }
    }
  };
}

function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Team Synergy",
    "url": "https://synergymmo.com",
    "logo": "https://synergymmo.com/favicon.png",
    "description": "A PokeMMO shiny hunting community dedicated to shiny collection, PVP competition, and gaming events.",
    "sameAs": [
      "https://www.youtube.com/@ohypers",
      "https://discord.com/invite/2BEUq6fWAj"
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "",
      "contactType": "Community Support"
    }
  };
}

function generateEventSchema(eventTitle, eventDescription) {
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    "name": eventTitle,
    "description": eventDescription,
    "startDate": startDate.toISOString().split('T')[0],
    "endDate": endDate.toISOString().split('T')[0],
    "eventAttendanceMode": "https://schema.org/OnlineEventAttendanceMode",
    "organizer": {
      "@type": "Organization",
      "name": "Team Synergy",
      "url": "https://synergymmo.com"
    }
  };
}

function generateTrophySchema(trophyName) {
  return {
    "@context": "https://schema.org",
    "@type": "Award",
    "name": trophyName,
    "description": `${trophyName} achievement earned by Team Synergy members in PokeMMO`,
    "url": `https://synergymmo.com/trophy/${trophyName.toLowerCase().replace(/\s+/g, '-')}/`,
    "awardedBy": {
      "@type": "Organization",
      "name": "Team Synergy",
      "url": "https://synergymmo.com"
    },
    "isPartOf": {
      "@type": "AggregateOffer",
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock",
      "offerCount": 1
    }
  };
}

function generateFaqSchema(faqs) {
  if (!faqs || faqs.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };
}

function generateCreatorSchema(route = '/') {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Team Synergy",
    "url": "https://synergymmo.com",
    "creator": {
      "@type": "Organization",
      "name": "Team Synergy",
      "url": "https://synergymmo.com",
      "sameAs": [
        "https://www.youtube.com/@ohypers",
        "https://discord.com/invite/2BEUq6fWAj"
      ]
    },
    "description": "A PokeMMO shiny hunting community dedicated to shiny collection, PVP competition, and gaming events.",
    "publisher": {
      "@type": "Organization",
      "name": "Team Synergy",
      "url": "https://synergymmo.com",
      "logo": "https://synergymmo.com/favicon.png"
    }
  };
}

function generateWebPageSchema(route, title, description, image) {
  const url = route === '/' ? 'https://synergymmo.com/' : `https://synergymmo.com${route}/`;
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "url": url,
    "name": title,
    "description": description,
    "image": image,
    "datePublished": "2024-01-01",
    "dateModified": new Date().toISOString().split('T')[0],
    "isPartOf": {
      "@type": "WebSite",
      "name": "Team Synergy",
      "url": "https://synergymmo.com"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Team Synergy",
      "logo": {
        "@type": "ImageObject",
        "url": "https://synergymmo.com/favicon.png"
      }
    },
    "author": {
      "@type": "Organization",
      "name": "Team Synergy",
      "url": "https://synergymmo.com"
    }
  };
}

function generateCollectionPageSchema(route, title, description, image, itemCount) {
  const url = route === '/' ? 'https://synergymmo.com/' : `https://synergymmo.com${route}/`;
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "url": url,
    "name": title,
    "description": description,
    "image": image,
    "numberOfItems": itemCount,
    "isPartOf": {
      "@type": "WebSite",
      "name": "Team Synergy",
      "url": "https://synergymmo.com"
    },
    "author": {
      "@type": "Organization",
      "name": "Team Synergy",
      "url": "https://synergymmo.com"
    }
  };
}

function generateGameSchema(pokemonName) {
  return {
    "@context": "https://schema.org",
    "@type": "Game",
    "name": pokemonName,
    "gamePlatform": "Web",
    "applicationCategory": "GamingApplication",
    "isPartOf": {
      "@type": "Game",
      "name": "PokeMMO"
    }
  };
}

function generateSocialMediaSchema(title, description, image, url) {
  return {
    "@context": "https://schema.org",
    "@type": "SocialMediaPosting",
    "headline": title,
    "description": description,
    "image": image,
    "url": url,
    "datePublished": new Date().toISOString(),
    "author": {
      "@type": "Person",
      "name": "Team Synergy Staff",
      "url": "https://synergymmo.com/player/Hyper/"
    },
    "sharedContent": {
      "@type": "CreativeWork",
      "name": title,
      "description": description,
      "image": image,
      "url": url
    },
    "publisher": {
      "@type": "Organization",
      "name": "Team Synergy",
      "url": "https://synergymmo.com"
    }
  };
}

function generateWebsiteSearchSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Team Synergy",
    "url": "https://synergymmo.com",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://synergymmo.com/?search={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    }
  };
}

module.exports = {
  generatePersonSchema,
  generatePokemonSchema,
  generateBreadcrumbSchema,
  generateResourceBreadcrumbSchema,
  generateResourceCollectionSchema,
  generateOrganizationSchema,
  generateEventSchema,
  generateTrophySchema,
  generateFaqSchema,
  generateCreatorSchema,
  generateWebPageSchema,
  generateCollectionPageSchema,
  generateGameSchema,
  generateSocialMediaSchema,
  generateWebsiteSearchSchema
};
