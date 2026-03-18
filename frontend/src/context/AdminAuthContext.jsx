import { createContext, useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { clearAdminTokens } from '../lib/adminApi'

export const AdminAuthContext = createContext({})

export default function AdminAuthProvider({ children }) {
  const navigate = useNavigate()

  const onUnauthorized = useCallback(() => {
    clearAdminTokens()
    navigate('/admin/login', { replace: true })
  }, [navigate])

  useEffect(() => {
    const handler = () => onUnauthorized()
    window.addEventListener('admin:unauthorized', handler)
    return () => window.removeEventListener('admin:unauthorized', handler)
  }, [onUnauthorized])

  const value = useMemo(() => {
    return {
      onUnauthorized,
    }
  }, [onUnauthorized])

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}

