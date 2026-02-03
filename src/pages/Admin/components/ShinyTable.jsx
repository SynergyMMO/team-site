import { API } from '../../../api/endpoints'
import styles from '../Admin.module.css'

export default function ShinyTable({ shinies, onEdit, onDelete }) {
  const entries = Object.entries(shinies).sort(([a], [b]) => parseInt(a) - parseInt(b))

  if (entries.length === 0) {
    return <p className={styles.hintText}>No shinies found for this player.</p>
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.shinyTable}>
        <thead>
          <tr>
            <th>#</th>
            <th>Sprite</th>
            <th>Pokemon</th>
            <th>Month</th>
            <th>Year</th>
            <th>Traits</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([id, shiny]) => {
            const traits = []
            if (shiny['Secret Shiny'] === 'Yes') traits.push({ label: 'Secret', cls: 'traitSecret' })
            if (shiny.Alpha === 'Yes') traits.push({ label: 'Alpha', cls: 'traitAlpha' })
            if (shiny.Egg === 'Yes') traits.push({ label: 'Egg', cls: 'traitEgg' })
            if (shiny.Safari === 'Yes') traits.push({ label: 'Safari', cls: 'traitSafari' })
            if (shiny['Honey Tree'] === 'Yes') traits.push({ label: 'Honey', cls: 'traitHoney' })
            if (shiny.Sold === 'Yes') traits.push({ label: 'Sold', cls: 'traitSold' })
            if (shiny.Event === 'Yes') traits.push({ label: 'Event', cls: 'traitEvent' })
            if (shiny.Favourite === 'Yes') traits.push({ label: 'Fav', cls: 'traitFav' })
            if (shiny.Legendary === 'Yes') traits.push({ label: 'Legend', cls: 'traitLegend' })
            if (shiny.MysteriousBall === 'Yes') traits.push({ label: 'Mystery', cls: 'traitMystery' })
            if (shiny.Reaction === 'Yes') traits.push({ label: 'Reaction', cls: 'traitReaction' })

            const spriteName = shiny.Pokemon.toLowerCase().replace(/[^a-z0-9-]/g, '')

            return (
              <tr key={id} className={shiny.Sold === 'Yes' ? styles.soldRow : ''}>
                <td>{id}</td>
                <td>
                  <img
                    src={API.pokemonSprite(spriteName)}
                    alt={shiny.Pokemon}
                    className={styles.spriteImg}
                    onError={e => { e.target.style.display = 'none' }}
                  />
                </td>
                <td>{shiny.Pokemon}</td>
                <td>{shiny.Month || '-'}</td>
                <td>{shiny.Year || '-'}</td>
                <td>
                  <div className={styles.traitBadges}>
                    {traits.map(t => (
                      <span key={t.label} className={`${styles.traitBadge} ${styles[t.cls]}`}>{t.label}</span>
                    ))}
                    {traits.length === 0 && <span className={styles.traitNone}>-</span>}
                  </div>
                </td>
                <td>
                  <div className={styles.actionBtns}>
                    <button className={styles.editBtn} onClick={() => onEdit(id, shiny)}>Edit</button>
                    <button className={styles.deleteBtn} onClick={() => onDelete(id, shiny)}>Delete</button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
