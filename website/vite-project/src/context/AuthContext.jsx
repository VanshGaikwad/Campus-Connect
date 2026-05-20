import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../services/firebase'
import { login as loginRequest, logout as logoutRequest, watchAuthState } from '../services/authService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = watchAuthState(async (user) => {
      setFirebaseUser(user)

      if (!user) {
        setProfile(null)
        setIsLoading(false)
        return
      }

      const snapshot = await getDoc(doc(db, 'users', user.uid))
      if (snapshot.exists()) {
        setProfile({ uid: user.uid, ...snapshot.data() })
      } else {
        setProfile(null)
      }

      setIsLoading(false)
    })

    return unsubscribe
  }, [])

  const value = useMemo(
    () => ({
      firebaseUser,
      user: profile,
      isAuthenticated: Boolean(firebaseUser && profile),
      isLoading,
      login: loginRequest,
      logout: logoutRequest,
      refreshProfile: async () => {
        if (!auth.currentUser) return
        const snapshot = await getDoc(doc(db, 'users', auth.currentUser.uid))
        if (snapshot.exists()) {
          const nextProfile = { uid: auth.currentUser.uid, ...snapshot.data() }
          setProfile(nextProfile)
          return nextProfile
        }
        return null
      },
    }),
    [firebaseUser, profile, isLoading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
