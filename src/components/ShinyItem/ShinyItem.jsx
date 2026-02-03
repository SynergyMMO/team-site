import { memo } from 'react'
import InfoBox from '../InfoBox/InfoBox'
import styles from './ShinyItem.module.css'

const TRAIT_CLASSES = {
  Alpha: ['alphaPokemon', 'glowAlpha'],
  'Secret Shiny': ['glowPokemon'],
  Favourite: ['favouritePokemon'],
}

const ICON_MAP = {
  'Secret Shiny': ['/images/Shiny Showcase/secretshiny.png', 'secretIcon'],
  'Honey Tree': ['/images/Shiny Showcase/honey.png', 'honeyIcon'],
  Egg: ['/images/Shiny Showcase/egg.png', 'eggIcon'],
  Safari: ['/images/Shiny Showcase/safari.png', 'safariIcon'],
  Event: ['/images/Shiny Showcase/event.png', 'eventIcon'],
  MysteriousBall: ['/images/Shiny Showcase/mysteriousball.gif', 'mysteriousballGif'],
  Favourite: ['/images/Shiny Showcase/heart.png', 'favouriteHeart'],
}

function ShinyItem({ shiny, points }) {
  const urlName = shiny.Pokemon.toLowerCase().replace(/[^a-z0-9-]/g, '-')

  const containerClasses = [styles.gifContainer]
  Object.entries(TRAIT_CLASSES).forEach(([key, classNames]) => {
    if (shiny[key]?.toLowerCase() === 'yes') {
      classNames.forEach(c => containerClasses.push(styles[c]))
    }
  })

  const icons = []
  Object.entries(ICON_MAP).forEach(([key, [src, cls]]) => {
    if (shiny[key]?.toLowerCase() === 'yes') {
      icons.push(
        <img key={key} src={src} className={styles[cls]} alt={key} />
      )
    }
  })

  const reactionUrl = shiny['Reaction Link']?.trim()
  if (reactionUrl) {
    icons.push(
      <img
        key="reaction"
        src="/images/Shiny Showcase/reaction.png"
        className={styles.reactionIcon}
        alt="Reaction"
        onClick={e => {
          e.stopPropagation()
          window.open(reactionUrl, '_blank')
        }}
      />
    )
  }

  const isSold = shiny.Sold?.toLowerCase() === 'yes'

  return (
    <span className={styles.wrapper}>
      <div className={containerClasses.join(' ')}>
        {icons}
        <img
          src={`https://img.pokemondb.net/sprites/black-white/anim/shiny/${urlName}.gif`}
          alt={shiny.Pokemon}
          className={`${styles.shinyGif} ${isSold ? styles.soldPokemon : ''}`}
          loading="lazy"
        />
        <img
          src="/images/Shiny Showcase/sparkle.gif"
          className={styles.particleGif}
          alt=""
        />
      </div>
      <InfoBox shiny={shiny} points={points} />
    </span>
  )
}

export default memo(ShinyItem)
