import { useState } from 'react'
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

  const getCostumeImageUrl = (fileName, isShinyVersion) => {
    const shinyPostfix = isShinyVersion ? '_shiny' : ''
    return getAssetUrl(`images/Shiny Showcase/costumes/${fileName}${shinyPostfix}.webp`)
  }

  const getCurrentImageUrl = () => {
    if (!selectedCostume) return ''
    
    const fileKey = isBackSprite ? 'back' : 'front'
    const fileName = selectedCostume.files[fileKey]
    
    if (!fileName) {
      return getCostumeImageUrl(selectedCostume.files.front, isShiny)
    }
    
    // For numbered files, append the sprite indicator and version
    if (selectedCostume.files[fileKey].includes('-')) {
      // Format: "52-f-n-b" -> "52-f-n-b-1" (with shiny indicator if needed)
      const baseName = `${selectedCostume.files[fileKey]}-1`
      // Replace 'n' with 's' if shiny is enabled
      const shinySpriteFile = isShiny ? baseName.replace('-n-', '-s-') : baseName
      return getAssetUrl(`images/Shiny Showcase/costumes/${shinySpriteFile}.webp`)
    }
    
    // For regular costume files
    return getCostumeImageUrl(fileName, isShiny)
  }

  const handleSelectCostume = (costume) => {
    setSelectedCostume(costume)
  }

  const handlePrevious = () => {
    const currentIndex = costumesData.findIndex(c => c.id === selectedCostume.id)
    const prevIndex = currentIndex === 0 ? costumesData.length - 1 : currentIndex - 1
    setSelectedCostume(costumesData[prevIndex])
  }

  const handleNext = () => {
    const currentIndex = costumesData.findIndex(c => c.id === selectedCostume.id)
    const nextIndex = currentIndex === costumesData.length - 1 ? 0 : currentIndex + 1
    setSelectedCostume(costumesData[nextIndex])
  }

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
