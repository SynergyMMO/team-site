import { useState } from 'react'
import { API } from '../../../api/endpoints'
import { onGifError } from '../../../utils/pokemon'
import styles from '../Admin.module.css'

export default function ShinyTable({ shinies, onEdit, onDelete, onReorder }) {
  const entries = Object.entries(shinies).sort(([a], [b]) => parseInt(a) - parseInt(b))
  const [draggedId, setDraggedId] = useState(null)
  const [draggedOverId, setDraggedOverId] = useState(null)

  if (entries.length === 0) {
    return <p className={styles.hintText}>No shinies found for this player.</p>
  }

  const handleDragStart = (id) => {
    setDraggedId(id)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDragEnter = (id) => {
    if (draggedId !== id) {
      setDraggedOverId(id)
    }
  }

  const handleDragLeave = () => {
    setDraggedOverId(null)
  }

  const handleDrop = (e, targetId) => {
    e.preventDefault()
    setDraggedOverId(null)

    if (!draggedId || draggedId === targetId) {
      setDraggedId(null)
      return
    }

    // Create new order by swapping or reordering IDs
    const idList = entries.map(([id]) => id)
    const draggedIndex = idList.indexOf(draggedId)
    const targetIndex = idList.indexOf(targetId)

    // Remove dragged item and insert at new position
    const newOrder = [...idList]
    newOrder.splice(draggedIndex, 1)
    newOrder.splice(targetIndex, 0, draggedId)

    // Call onReorder with the new order
    if (onReorder) {
      onReorder(newOrder)
    }

    setDraggedId(null)
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
            if (shiny.Favourite === 'Yes') traits.push({ label: 'Favourite', cls: 'traitFav' })
            if (shiny.Legendary === 'Yes') traits.push({ label: 'Legend', cls: 'traitLegend' })
            if (shiny.MysteriousBall === 'Yes') traits.push({ label: 'Mystery', cls: 'traitMystery' })
            if (shiny.Reaction === 'Yes') traits.push({ label: 'Reaction', cls: 'traitReaction' })

            const spriteName = shiny.Pokemon.toLowerCase().replace(/[^a-z0-9-]/g, '')

            return (
              <tr
                key={id}
                draggable
                onDragStart={() => handleDragStart(id)}
                onDragOver={handleDragOver}
                onDragEnter={() => handleDragEnter(id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, id)}
                className={`${shiny.Sold === 'Yes' ? styles.soldRow : ''} ${draggedId === id ? styles.dragging : ''} ${draggedOverId === id ? styles.dragOver : ''}`}
                style={{
                  opacity: draggedId === id ? 0.5 : 1,
                  cursor: 'grab',
                }}
              >
                <td>{id}</td>
                <td>
                  <img
                    src={API.pokemonSprite(spriteName)}
                    alt={shiny.Pokemon}
                    className={styles.spriteImg}
                    width="80"
                    height="80"
                    loading="lazy"
                    onError={onGifError(spriteName)}
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
