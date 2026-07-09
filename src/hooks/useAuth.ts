import { useEffect, useState } from 'react'
import type { AuthUser } from '../types/global'

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.api
      ?.authGetUser()
      .then((u) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
    return window.api?.onAuthChange((u) => setUser(u))
  }, [])

  async function signUp(email: string, password: string) {
    const u = await window.api!.authSignUp(email, password)
    setUser(u)
    return u
  }

  async function signIn(email: string, password: string) {
    const u = await window.api!.authSignIn(email, password)
    setUser(u)
    return u
  }

  async function signOut() {
    await window.api!.authSignOut()
    setUser(null)
  }

  return { user, loading, signUp, signIn, signOut }
}
