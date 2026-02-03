import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdmin } from '../../context/AdminContext'
import { API } from '../../api/endpoints'
import styles from './Admin.module.css'

export default function AdminLogin() {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const { login } = useAdmin()
  const navigate = useNavigate()

  async function handleLogin(e) {
    e.preventDefault()
    setMessage('')

    try {
      const res = await fetch(API.adminCheck, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: name, password }),
      })
      const data = await res.json()

      if (data.authorized) {
        login(name, password)
        navigate('/admin/panel')
      } else {
        setMessage('Invalid credentials')
      }
    } catch {
      setMessage('Error connecting to server')
    }
  }

  return (
    <div className={styles.loginContainer}>
      <h2 className={styles.adminText}>Admin Login</h2>
      <form onSubmit={handleLogin}>
        <input
          type="text"
          className={styles.adminInput}
          placeholder="Username"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <input
          type="password"
          className={styles.adminInput}
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <button type="submit" className={styles.loginBtn}>Login</button>
      </form>
      {message && <div className={styles.adminMessage}>{message}</div>}
    </div>
  )
}
