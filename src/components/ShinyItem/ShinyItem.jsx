import { memo, useMemo } from 'react'
import InfoBox from '../InfoBox/InfoBox'
import { getLocalPokemonGif, onGifError } from '../../utils/pokemon'
import styles from './ShinyItem.module.css'

// Mapping of traits to CSS classes
const TRAIT_CLASSES = {
  Alpha: ['alphaPokemon', 'glowAlpha'],
  'Secret Shiny': ['glowPokemon'],
  Favourite: ['favouritePokemon'],
}

// Mapping of icons — use base URL prefix for public asset paths
const BASE = import.meta.env.BASE_URL || '/'
const ICON_MAP = {
  'Secret Shiny': [`${BASE}images/Shiny Showcase/secretshiny.png`, 'secretIcon'],
  'Honey Tree': [`${BASE}images/Shiny Showcase/honey.png`, 'honeyIcon'],
  Egg: [`${BASE}images/Shiny Showcase/egg.png`, 'eggIcon'],
  Safari: [`${BASE}images/Shiny Showcase/safari.png`, 'safariIcon'],
  Event: [`${BASE}images/Shiny Showcase/event.png`, 'eventIcon'],
  MysteriousBall: [`${BASE}images/Shiny Showcase/mysteriousball.gif`, 'mysteriousballGif'],
  Favourite: [`${BASE}images/Shiny Showcase/heart.png`, 'favouriteHeart'],
}

function ShinyItem({ shiny, points, userName }) {
  const shinyGifPath = useMemo(() => getLocalPokemonGif(shiny.Pokemon), [shiny.Pokemon])

  // Container CSS classes based on traits
  const containerClasses = useMemo(() => {
    const classes = [styles.gifContainer]
    Object.entries(TRAIT_CLASSES).forEach(([key, classNames]) => {
      if (shiny[key]?.toLowerCase() === 'yes') {
        classNames.forEach(c => classes.push(styles[c]))
      }
    })
    return classes.join(' ')
  }, [shiny])

  // Icons to display
  const icons = useMemo(() => {
    const iconList = []

    Object.entries(ICON_MAP).forEach(([key, [src, cls]]) => {
      if (shiny[key]?.toLowerCase() === 'yes') {
        iconList.push(
          <img
            key={key}
            src={src}
            className={styles[cls]}
            alt={key}
            width="20"
            height="20"
            loading="lazy"
          />
        )
      }
    })

    let reactionUrl = shiny['Reaction Link']?.trim()
    if (reactionUrl && !/^https?:\/\//i.test(reactionUrl)) {
      reactionUrl = 'https://' + reactionUrl
    }
    if (reactionUrl) {
      iconList.push(
        <img
          key="reaction"
          src={`${BASE}images/Shiny Showcase/reaction.png`}
          className={styles.reactionIcon}
          alt="Reaction"
          width="18"
          height="18"
          loading="lazy"
          onClick={e => {
            e.stopPropagation()
            window.open(reactionUrl, '_blank')
          }}
        />
      )
    }

    return iconList
  }, [shiny])

  const isSold = shiny.Sold?.toLowerCase() === 'yes'

  // Conditional override for InfoBox text
  const infoText = userName === 'Strength' && shiny.Pokemon === 'Zorua'
    ? 'Never forget reactive gas...'
    : shiny.infoText

  return (
    <span className={styles.wrapper}>
      <div className={containerClasses}>
        {icons}
        <img
          src={shinyGifPath}
          alt={shiny.Pokemon}
          className={`${styles.shinyGif} ${isSold ? styles.soldPokemon : ''}`}
          width="80"
          height="80"
          loading="lazy"
          onError={onGifError(shiny.Pokemon)}
        />
      </div>
      <InfoBox shiny={{ ...shiny, infoText }} points={points} />
    </span>
  )
}

export default memo(ShinyItem)
