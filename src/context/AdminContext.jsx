import { createContext, useContext, useState, useCallback } from 'react'

const AdminContext = createContext(null)

export function AdminProvider({ children }) {
  const [auth, setAuth] = useState(null)

  const login = useCallback((name, password) => {
    setAuth({ name, password })
  }, [])

  const logout = useCallback(() => {
    setAuth(null)
  }, [])

  return (
    <AdminContext.Provider value={{ auth, login, logout }}>
      {children}
    </AdminContext.Provider>
  )
}

export function useAdmin() {
  const ctx = useContext(AdminContext)
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider')
  return ctx
}
