import { useState } from 'react'
import styles from '../Admin.module.css'

export default function ConfirmDialog({ title, message, confirmLabel = 'Confirm', typeToConfirm, onConfirm, onCancel }) {
  const [typed, setTyped] = useState('')
  const needsTyping = !!typeToConfirm
  const canConfirm = !needsTyping || typed === typeToConfirm

  return (
    <div className={styles.modal} onClick={onCancel}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <h2>{title}</h2>
        <p style={{ color: '#ddd', lineHeight: 1.5, whiteSpace: 'pre-wrap', maxHeight: '50vh', overflowY: 'auto' }}>{message}</p>
        {needsTyping && (
          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: '0.9rem', color: '#aaa' }}>
              Type <strong style={{ color: '#e53935' }}>{typeToConfirm}</strong> to confirm:
            </label>
            <input
              type="text"
              value={typed}
              onChange={e => setTyped(e.target.value)}
              autoFocus
              style={{ marginTop: 6 }}
            />
          </div>
        )}
        <div className={styles.modalButtons}>
          <button
            onClick={onConfirm}
            disabled={!canConfirm}
            style={{
              backgroundColor: canConfirm ? '#e53935' : '#555',
              cursor: canConfirm ? 'pointer' : 'not-allowed',
            }}
          >
            {confirmLabel}
          </button>
          <button onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
