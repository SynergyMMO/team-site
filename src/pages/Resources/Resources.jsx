import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDocumentHead } from '../../hooks/useDocumentHead'
import resourcesData from '../../data/resources.json'
import styles from './Resources.module.css'

// Utility function to convert text to URL slug
const toSlug = (text) => {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
    .replace(/-+/g, '-') // collapse multiple dashes
    .replace(/^-+|-+$/g, ''); // trim leading/trailing dashes
}

// Utility function to find key by slug
const findKeyBySlug = (obj, slug) => {
  if (!obj) return null
  return Object.keys(obj).find(key => toSlug(key) === slug)
}

// Function to calculate leaderboard from resources data
const calculateLeaderboard = (data) => {
  const credits = {}

  // Recursively traverse the data structure to find all credits fields
  const traverse = (obj) => {
    if (!obj || typeof obj !== 'object') return
    
    if (Array.isArray(obj)) {
      obj.forEach(item => traverse(item))
      return
    }

    // Check if this object has a credits field
    if (obj.credits && typeof obj.credits === 'string') {
      // Split by comma in case multiple credits are listed
      const creditsArray = obj.credits.split(',').map(c => c.trim()).filter(c => c)
      creditsArray.forEach(credit => {
        credits[credit] = (credits[credit] || 0) + 1
      })
    }

    // Traverse nested objects
    Object.values(obj).forEach(value => {
      if (value && typeof value === 'object') {
        traverse(value)
      }
    })
  }

  traverse(data)

  // Sort by count descending and get top 5
  return Object.entries(credits)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map((entry, idx) => ({
      rank: idx + 1,
      name: entry[0],
      count: entry[1]
    }))
}

export default function Resources() {
  const navigate = useNavigate()
  const { category: urlCategory, subcategory: urlSubcategory, nested: urlNested } = useParams()
  
  // Get initial values from URL params and find actual keys
  const defaultCategory = Object.keys(resourcesData)[0]
  const actualCategory = urlCategory ? findKeyBySlug(resourcesData, urlCategory) : defaultCategory
  
  const categoryData = resourcesData[actualCategory]
  const actualSubcategory = urlSubcategory ? findKeyBySlug(categoryData, urlSubcategory) : null
  
  const subcategoryData = actualCategory && actualSubcategory ? categoryData[actualSubcategory] : null
  const actualNested = urlNested && subcategoryData && typeof subcategoryData === 'object' && !Array.isArray(subcategoryData)
    ? findKeyBySlug(subcategoryData, urlNested)
    : null

  // State for navigation through tabs
  const [activeCategory, setActiveCategory] = useState(actualCategory)
  const [activeSubcategory, setActiveSubcategory] = useState(actualSubcategory)
  const [activeNestedTab, setActiveNestedTab] = useState(actualNested)
  const [expandedIndexCategories, setExpandedIndexCategories] = useState({})
  const [showIndex, setShowIndex] = useState(false)

  // Extract metadata for SEO
  const categoryMeta = categoryData?._meta
  const subcategoryMeta = subcategoryData?._meta
  const nestedTabData = activeNestedTab && subcategoryData ? subcategoryData[activeNestedTab] : null
  const nestedMeta = nestedTabData?._meta

  // Build breadcrumbs with dynamic metadata
  const buildBreadcrumbs = () => {
    const crumbs = [
      { name: 'Home', url: '/' },
      { name: 'Resources', url: '/resources/' }
    ]
    
    if (activeCategory) {
      crumbs.push({ name: activeCategory, url: `/resources/${toSlug(activeCategory)}/` })
    }
    if (activeSubcategory) {
      crumbs.push({ name: activeSubcategory, url: `/resources/${toSlug(activeCategory)}/${toSlug(activeSubcategory)}/` })
    }
    if (activeNestedTab) {
      crumbs.push({ name: activeNestedTab, url: `/resources/${toSlug(activeCategory)}/${toSlug(activeSubcategory)}/${toSlug(activeNestedTab)}/` })
    }
    
    return crumbs
  }

  // Determine which metadata to use for the page head
  const seoMeta = nestedMeta || subcategoryMeta || categoryMeta || {}
  let currentCanonicalPath = `/resources${activeCategory ? `/${toSlug(activeCategory)}` : ''}${activeSubcategory ? `/${toSlug(activeSubcategory)}` : ''}${activeNestedTab ? `/${toSlug(activeNestedTab)}` : ''}`;
  // Only add trailing slash for root /resources/ page
  if (!activeCategory && !activeSubcategory && !activeNestedTab) {
    currentCanonicalPath += '/';
  }

  useDocumentHead({
    title: seoMeta.title || 'Team Synergy Resources',
    description: seoMeta.description || 'Explore Team Synergy\'s comprehensive PokeMMO resources. Find guides, tools, calculators, community links, and expert tips.',
    canonicalPath: currentCanonicalPath,
    breadcrumbs: buildBreadcrumbs()
  })

  // Get available categories
  const categories = Object.keys(resourcesData).filter(key => !key.startsWith('_'))
  const currentCategory = resourcesData[activeCategory]
  
  // For subcategories: check if category has nested structure (subcats) or if it's flat (_items)
  const isFlatCategory = currentCategory && currentCategory._items && Array.isArray(currentCategory._items) && !Object.keys(currentCategory).some(k => !k.startsWith('_') && k !== '_items')
  const subcategories = !isFlatCategory && activeCategory ? Object.keys(currentCategory || {}).filter(key => !key.startsWith('_')) : []

  // Update URL when tab changes
  useEffect(() => {
    let newPath = '/resources/'
    
    if (activeCategory) {
      newPath += `${toSlug(activeCategory)}/`
    }
    if (activeSubcategory) {
      newPath += `${toSlug(activeSubcategory)}/`
    }
    if (activeNestedTab) {
      newPath += `${toSlug(activeNestedTab)}/`
    }
    
    // Only navigate if necessary
    const currentPath = window.location.pathname
    if (currentPath !== newPath) {
      navigate(newPath, { replace: true })
    }
  }, [activeCategory, activeSubcategory, activeNestedTab, navigate])

  // Set initial subcategory when category changes
  useEffect(() => {
    const newSubcategories = currentCategory ? Object.keys(currentCategory).filter(key => !key.startsWith('_')) : []
    if (newSubcategories.length > 0) {
      // Only set if not already set from URL
      if (!activeSubcategory) {
        setActiveSubcategory(newSubcategories[0])
        setActiveNestedTab(null)
      }
    }
  }, [activeCategory, currentCategory, activeSubcategory])

  // Check if current subcategory has nested structure
  const getSubcategoryContent = () => {
    if (!activeSubcategory || !currentCategory) return null
    return currentCategory[activeSubcategory]
  }

  const subcategoryContent = getSubcategoryContent()
  const isNested = subcategoryContent && typeof subcategoryContent === 'object' && !Array.isArray(subcategoryContent)
  const nestedKeys = isNested ? Object.keys(subcategoryContent).filter(key => !key.startsWith('_')) : []

  // Set initial nested tab when subcategory changes
  useEffect(() => {
    if (!activeSubcategory) {
      setActiveNestedTab(null)
      return
    }
    
    const subcatContent = resourcesData[activeCategory]?.[activeSubcategory]
    const hasNesting = subcatContent && typeof subcatContent === 'object' && !Array.isArray(subcatContent)
    
    if (hasNesting) {
      const keys = Object.keys(subcatContent).filter(key => !key.startsWith('_'))
      setActiveNestedTab(keys[0] || null)
    } else {
      setActiveNestedTab(null)
    }
  }, [activeSubcategory, activeCategory])

  // Get items for current view
  const getItems = () => {
    // First check if category itself has _items (flat structure like Events)
    if (!activeSubcategory && currentCategory && currentCategory._items && Array.isArray(currentCategory._items)) {
      return currentCategory._items.filter(item => item !== null && item !== undefined)
    }

    if (!subcategoryContent) return []

    // If it's a direct array (old format)
    if (Array.isArray(subcategoryContent)) {
      return subcategoryContent.filter(item => item !== null && item !== undefined)
    }

    // If the subcategory content has _items directly (like Rock Smash Routes)
    if (subcategoryContent._items && Array.isArray(subcategoryContent._items)) {
      return subcategoryContent._items.filter(item => item !== null && item !== undefined)
    }

    // If it's nested and we have a selected nested tab
    if (isNested && activeNestedTab) {
      const nestedContent = subcategoryContent[activeNestedTab]
      
      // Check for new format with _items array
      if (nestedContent && typeof nestedContent === 'object' && !Array.isArray(nestedContent) && nestedContent._items) {
        return nestedContent._items.filter(item => item !== null && item !== undefined)
      }
      
      // Check for old direct array format
      if (Array.isArray(nestedContent)) {
        return nestedContent.filter(item => item !== null && item !== undefined)
      }
    }

    return []
  }

  const items = getItems()

  // Dynamically render item fields, excluding certain keys
  const renderItemFields = (item) => {
    if (!item || typeof item !== 'object') return null

    const excludeKeys = ['name', 'profileImage'] // Keys to exclude from display
    const entries = Object.entries(item).filter(([key]) => !excludeKeys.includes(key))

    return entries.map(([key, value]) => {
      // Special handling for links
      if (key === 'link' || key === 'url') {
        return null // Handled separately in the card
      }
      if (key === 'description') {
        return (
          <p key={key} className={styles.itemDescription}>
            {value}
          </p>
        )
      }
      return (
        <>
          <strong key={`${key}-label`} className={styles.itemFieldLabel}>{key.charAt(0).toUpperCase() + key.slice(1)}:</strong>
          <span key={`${key}-value`} className={styles.itemFieldValue}>{String(value)}</span>
        </>
      )
    })
  }

  // Toggle index category expansion
  const toggleIndexCategory = (categoryKey) => {
    setExpandedIndexCategories(prev => ({
      ...prev,
      [categoryKey]: !prev[categoryKey]
    }))
  }

  // Navigate to a resource section
  const navigateToResource = (catSlug, subcatSlug = null, nestedSlug = null) => {
    let path = `/resources/${catSlug}/`
    if (subcatSlug) path += `${subcatSlug}/`
    if (nestedSlug) path += `${nestedSlug}/`
    navigate(path)
    setShowIndex(false)
  }

  // Filter items by selected tags (if any)
  const filterItemsByTags = (items) => {
    if (!selectedTags.length) return items
    return items.filter(item => {
      if (!item.tags) return false
      const tagsArr = item.tags.split(',').map(t => t.trim())
      return selectedTags.every(tag => tagsArr.includes(tag))
    })
  }

  // Tag filtering for Content Creators (must always be defined)
  const [selectedTags, setSelectedTags] = useState([])
  let allContentCreatorTags = []
  if (activeCategory === 'Content Creators') {
    const cc = resourcesData['Content Creators']
    const tagSet = new Set()
    // If a subcategory is selected, only show tags from that subcategory
    const subcats = activeSubcategory && cc[activeSubcategory] && cc[activeSubcategory]._items
      ? [activeSubcategory]
      : ['YouTubers', 'Twitch Streamers']
    subcats.forEach(subcat => {
      if (cc[subcat] && cc[subcat]._items) {
        cc[subcat]._items.forEach(item => {
          if (item.tags) {
            item.tags.split(',').map(t => t.trim()).filter(Boolean).forEach(t => tagSet.add(t))
          }
        })
      }
    })
    allContentCreatorTags = Array.from(tagSet).sort()
  }

  return (
    <div className={styles.container}>
      <h1>Team Synergy Resources</h1>
      <p className={styles.intro}>
        Discover guides, tools, and community links to enhance your PokeMMO experience.
      </p>

        <h4 className={styles.intro}>If you are creddited in this and would like for your guide to be removed or you have a useful guide or tool that you would like to be added please contact ohypers on discord</h4>

      {/* Index/Table of Contents */}
      <div className={styles.indexContainer}>
        <button 
          className={styles.indexToggleButton}
          onClick={() => setShowIndex(!showIndex)}
        >
          <span className={styles.indexToggleIcon}>{showIndex ? '▼' : '▶'}</span>
          📑 Index
        </button>
        
        {showIndex && (
          <div className={styles.indexDropdown}>
            {categories.map(category => {
              const categoryKey = category
              const categoryContent = resourcesData[categoryKey]
              // Always show subcategories if any (even if _items exists)
              const subcategoryKeys = Object.keys(categoryContent || {}).filter(key => !key.startsWith('_') && key !== '_items')
              return (
                <div key={categoryKey} className={styles.indexCategoryWrapper}>
                  <div className={styles.indexCategoryHeader}>
                    <button
                      className={styles.indexCategoryLink}
                      onClick={() => {
                        setActiveCategory(categoryKey)
                        setActiveSubcategory(null)
                        setActiveNestedTab(null)
                        navigate(`/resources/${toSlug(categoryKey)}/`)
                        setShowIndex(false)
                      }}
                    >
                      {categoryKey}
                    </button>
                  </div>
                  {subcategoryKeys.length > 0 && (
                    <div className={styles.indexSubcategoryList}>
                      {subcategoryKeys.map(subcategoryKey => {
                        const subcategoryContent = categoryContent[subcategoryKey]
                        const nestedKeys = subcategoryContent && typeof subcategoryContent === 'object' && !Array.isArray(subcategoryContent)
                          ? Object.keys(subcategoryContent).filter(key => !key.startsWith('_') && key !== '_items')
                          : []
                        return (
                          <div key={subcategoryKey} className={styles.indexSubcategoryWrapper}>
                            <div className={styles.indexSubcategoryHeader}>
                              <button
                                className={styles.indexSubcategoryLink}
                                onClick={() => {
                                  setActiveCategory(categoryKey)
                                  setActiveSubcategory(subcategoryKey)
                                  setActiveNestedTab(null)
                                  navigate(`/resources/${toSlug(categoryKey)}/${toSlug(subcategoryKey)}/`)
                                  setShowIndex(false)
                                }}
                              >
                                {subcategoryKey}
                              </button>
                            </div>
                            {nestedKeys.length > 0 && (
                              <div className={styles.indexNestedList}>
                                {nestedKeys.map(nestedKey => (
                                  <button
                                    key={nestedKey}
                                    className={styles.indexNestedLink}
                                    onClick={() => {
                                      setActiveCategory(categoryKey)
                                      setActiveSubcategory(subcategoryKey)
                                      setActiveNestedTab(nestedKey)
                                      navigate(`/resources/${toSlug(categoryKey)}/${toSlug(subcategoryKey)}/${toSlug(nestedKey)}/`)
                                      setShowIndex(false)
                                    }}
                                  >
                                    {nestedKey}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Main Category Tabs */}
      <div className={styles.tabsContainer}>
        <div className={styles.tabs}>
          {categories.map(category => (
            <button
              key={category}
              className={`${styles.tab} ${activeCategory === category ? styles.activeTab : ''}`}
              onClick={() => {
                setActiveCategory(category)
                setActiveSubcategory(null)
                setActiveNestedTab(null)
              }}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Subcategory Tabs */}
      {subcategories.length > 0 && (
        <div className={styles.subTabsContainer}>
          <div className={styles.subTabs}>
            {subcategories.map(subcategory => (
              <button
                key={subcategory}
                className={`${styles.subTab} ${activeSubcategory === subcategory ? styles.activeSubTab : ''}`}
                onClick={() => {
                  setActiveSubcategory(subcategory)
                  setActiveNestedTab(null)
                }}
              >
                {subcategory}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Nested Tabs (for third level) */}
      {isNested && nestedKeys.length > 0 && (
        <div className={styles.nestedTabsContainer}>
          <div className={styles.nestedTabs}>
            {nestedKeys.map(nestedKey => (
              <button
                key={nestedKey}
                className={`${styles.nestedTab} ${activeNestedTab === nestedKey ? styles.activeNestedTab : ''}`}
                onClick={() => setActiveNestedTab(nestedKey)}
              >
                {nestedKey}
              </button>
            ))}
          </div>
        </div>
      )}

            {/* Subcategory Description - Only show for Twitch Streamers */}
      {activeCategory === 'Content Creators' && activeSubcategory === 'Twitch Streamers' && subcategoryContent?._meta?.description && (
        <div className={styles.subcategoryDescription}>
          <p dangerouslySetInnerHTML={{ __html: subcategoryContent._meta.description }} />
        </div>
      )}

            {/* Subcategory Description - Show for Twitch Streamers and YouTubers */}
      {activeCategory === 'Content Creators' &&
        (activeSubcategory === 'Twitch Streamers' || activeSubcategory === 'YouTubers') && (
        <div className={styles.contentCreatoradd}>
          <p>Wish to be added? DM ohypers on discord</p>
        </div>
      )}

      {/* Tag Filter UI for Content Creators */}
      {activeCategory === 'Content Creators' && allContentCreatorTags.length > 0 && (
        <div className={styles.tagFilterContainer}>
          <span className={styles.tagFilterLabel}>Filter by tag:</span>
          {allContentCreatorTags.map(tag => (
            <button
              key={tag}
              className={selectedTags.includes(tag) ? styles.tagFilterButtonActive : styles.tagFilterButton}
              onClick={() => {
                setSelectedTags(selectedTags.includes(tag)
                  ? selectedTags.filter(t => t !== tag)
                  : [...selectedTags, tag])
              }}
            >
              {tag}
            </button>
          ))}
          {selectedTags.length > 0 && (
            <button className={styles.tagFilterClearButton} onClick={() => setSelectedTags([])}>
              Clear
            </button>
          )}
        </div>
      )}

      {/* Items Grid */}
      {filterItemsByTags(items).length > 0 && (
        <div className={styles.itemsGrid}>
          {filterItemsByTags(items).map((item, idx) => (
            item && (
              <div key={idx} className={styles.resourceCard}>
                {item.profileImage && (
                  <div className={styles.cardImageContainer}>
                    <img 
                      src={getAssetUrl(item.profileImage)} 
                      alt={item.name || 'Profile'}
                      className={styles.cardImage}
                      onError={(e) => {
                        e.target.style.display = 'none'
                      }}
                    />
                  </div>
                )}
                <div className={styles.cardContent}>
                  <h3 className={styles.itemName}>{item.name || 'Unnamed Item'}</h3>
                  {renderItemFields(item)}
                </div>
                {(item.link || item.url) && (
                  <a
                    href={item.link || item.url}
                    target={(item.link || item.url).startsWith('http') ? '_blank' : '_self'}
                    rel={(item.link || item.url).startsWith('http') ? 'noopener noreferrer' : ''}
                    className={styles.itemLink}
                  >
                    Visit {item.name || 'Resource'}
                    {(item.link || item.url).startsWith('http') && (
                      <span className={styles.externalIcon}>↗</span>
                    )}
                  </a>
                )}
              </div>
            )
          ))}
        </div>
      )}

      {filterItemsByTags(items).length === 0 && (
        <div className={styles.emptyState}>
          <p>No resources available in this section yet.</p>
        </div>
      )}

      {/* Leaderboard Section */}
      <div className={styles.leaderboardSection}>
        <h2>Top Contributors</h2>
        <div className={styles.leaderboard}>
          {calculateLeaderboard(resourcesData).map((contributor) => (
            <div key={contributor.name} className={styles.leaderboardEntry}>
              <div className={styles.leaderboardRank}>#{contributor.rank}</div>
              <div className={styles.leaderboardName}>{contributor.name}</div>
              <div className={styles.leaderboardCount}>{contributor.count} {contributor.count === 1 ? 'guide' : 'guides'}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
