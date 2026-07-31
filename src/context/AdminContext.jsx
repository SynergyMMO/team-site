import { createContext, useContext, useState, useCallback } from 'react'

const AdminContext = createContext(null)

export function AdminProvider({ children }) {
  const [auth, setAuth] = useState(null)

  const login = useCallback((name, password, access = {}) => {
    setAuth({
      name,
      password,
      isFullAdmin: Boolean(access.isFullAdmin),
      allowedTabs: Array.isArray(access.allowedTabs) ? access.allowedTabs : ['osw'],
    })
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
