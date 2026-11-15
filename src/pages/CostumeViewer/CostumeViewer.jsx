import { useState, useCallback, useEffect } from 'react'
import { useDocumentHead } from '../../hooks/useDocumentHead'
import { getAssetUrl } from '../../utils/assets'
import costumesData from '../../data/costumes.json'
import styles from './CostumeViewer.module.css'

export default function CostumeViewer() {
  useDocumentHead({
    title: 'Costume Viewer - Team Synergy',
    description: 'View all available PokeMMO costumes. Browse through different Pokemon costumes with front and back sprites, and toggle shiny variants.',
    canonicalPath: '/costume-viewer',
    robots: 'index, follow',
  })

  const [selectedCostume, setSelectedCostume] = useState(costumesData[0])
  const [isBackSprite, setIsBackSprite] = useState(false)
  const [isShiny, setIsShiny] = useState(false)

  const getCostumeImageUrl = useCallback((fileName, isShinyVersion) => {
    const shinyPostfix = isShinyVersion ? '_shiny' : ''
    return getAssetUrl(`images/Shiny Showcase/costumes/${fileName}${shinyPostfix}.webp`)
  }, [])

  const getCurrentImageUrl = useCallback(() => {
    if (!selectedCostume) return ''
    
    const fileKey = isBackSprite ? 'back' : 'front'
    const fileName = selectedCostume.files[fileKey]
    
    if (!fileName) {
      return getCostumeImageUrl(selectedCostume.files.front, isShiny)
    }
    
    if (selectedCostume.files[fileKey].includes('-')) {
      const baseName = `${selectedCostume.files[fileKey]}-1`
      const shinySpriteFile = isShiny ? baseName.replace('-n-', '-s-') : baseName
      return getAssetUrl(`images/Shiny Showcase/costumes/${shinySpriteFile}.webp`)
    }
    
    return getCostumeImageUrl(fileName, isShiny)
  }, [selectedCostume, isBackSprite, isShiny, getCostumeImageUrl])

  // Preload next and previous costume images
  useEffect(() => {
    if (!selectedCostume) return
    
    const currentIndex = costumesData.findIndex(c => c.id === selectedCostume.id)
    const nextIndex = currentIndex === costumesData.length - 1 ? 0 : currentIndex + 1
    const prevIndex = currentIndex === 0 ? costumesData.length - 1 : currentIndex - 1
    
    const preloadImages = (costume) => {
      if (!costume) return
      
      // Preload front and back sprites (normal)
      const frontFile = `${costume.files.front}-1.webp`
      const backFile = `${costume.files.back}-1.webp`
      
      const frontUrl = getAssetUrl(`images/Shiny Showcase/costumes/${frontFile}`)
      const backUrl = getAssetUrl(`images/Shiny Showcase/costumes/${backFile}`)
      
      // Preload shiny variants
      const frontShinyFile = frontFile.replace('-n-', '-s-')
      const backShinyFile = backFile.replace('-n-', '-s-')
      
      const frontShinyUrl = getAssetUrl(`images/Shiny Showcase/costumes/${frontShinyFile}`)
      const backShinyUrl = getAssetUrl(`images/Shiny Showcase/costumes/${backShinyFile}`)
      
      // Load all 4 variants
      const urlsToPreload = [frontUrl, backUrl, frontShinyUrl, backShinyUrl]
      urlsToPreload.forEach(url => {
        const img = new Image()
        img.src = url
      })
    }
    
    preloadImages(costumesData[nextIndex])
    preloadImages(costumesData[prevIndex])
  }, [selectedCostume])

  const handleSelectCostume = useCallback((costume) => {
    setSelectedCostume(costume)
  }, [])

  const handlePrevious = useCallback(() => {
    const currentIndex = costumesData.findIndex(c => c.id === selectedCostume.id)
    const prevIndex = currentIndex === 0 ? costumesData.length - 1 : currentIndex - 1
    setSelectedCostume(costumesData[prevIndex])
  }, [selectedCostume])

  const handleNext = useCallback(() => {
    const currentIndex = costumesData.findIndex(c => c.id === selectedCostume.id)
    const nextIndex = currentIndex === costumesData.length - 1 ? 0 : currentIndex + 1
    setSelectedCostume(costumesData[nextIndex])
  }, [selectedCostume])

  return (
    <div className={styles.container}>
      <h1>Costume Viewer</h1>

      {/* Costumes List - Grid only */}
      <div className={styles.costumesList}>
        <div className={styles.costumesGrid}>
          {costumesData.map((costume) => (
            <button
              key={costume.id}
              className={`${styles.costumeItem} ${
                selectedCostume && selectedCostume.id === costume.id ? styles.active : ''
              }`}
              onClick={() => handleSelectCostume(costume)}
              title={`${costume.name} - ${costume.costume}`}
            >
              <img 
                src={getAssetUrl(`images/Shiny Showcase/costumes/${costume.files.front}-1.webp`)}
                alt={`${costume.name} - ${costume.costume}`}
                className={styles.thumbnail}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Main Viewer - Centered */}
      {selectedCostume && (
        <div className={styles.viewerContainer}>
          <div className={styles.viewerFrame}>
            <div className={styles.viewerFrameHeader}>
              <h2>{selectedCostume.name}</h2>
              <p className={styles.costumeTitle}>{selectedCostume.costume}</p>
              <p className={styles.dexInfo}>#{selectedCostume.dexNumber}</p>
            </div>
            
            <div className={styles.imageDisplay}>
              <img 
                src={getCurrentImageUrl()}
                alt={`${selectedCostume.name} - ${isBackSprite ? 'Back' : 'Front'} ${isShiny ? 'Shiny' : 'Normal'}`}
                className={styles.costumeImage}
              />
            </div>

            <div className={styles.controls}>
              <div className={styles.toggleGroup}>
                <label className={styles.toggleLabel}>
                  <input 
                    type="checkbox" 
                    checked={isBackSprite}
                    onChange={(e) => setIsBackSprite(e.target.checked)}
                    className={styles.toggleInput}
                  />
                  <span className={styles.toggleText}>
                    Flip Sprite ({isBackSprite ? 'Back' : 'Front'})
                  </span>
                </label>
                <label className={styles.toggleLabel}>
                  <input 
                    type="checkbox" 
                    checked={isShiny}
                    onChange={(e) => setIsShiny(e.target.checked)}
                    className={styles.toggleInput}
                  />
                  <span className={styles.toggleText}>
                    {isShiny ? 'Shiny ✨' : 'Normal'}
                  </span>
                </label>
              </div>
            </div>

            <div className={styles.viewerFrameFooter}>
              <button 
                className={styles.navButton}
                onClick={handlePrevious}
              >
                ◀ Previous
              </button>
              <button 
                className={styles.navButton}
                onClick={handleNext}
              >
                Next ▶
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
