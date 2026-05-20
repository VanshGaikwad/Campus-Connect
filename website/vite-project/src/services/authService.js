import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateEmail,
  updatePassword,
} from 'firebase/auth'
import { deleteApp, initializeApp } from 'firebase/app'
import { doc, setDoc, updateDoc } from 'firebase/firestore'
import { auth, db, firebaseConfig } from './firebase'

export const login = (email, password) => signInWithEmailAndPassword(auth, email, password)

export const logout = () => signOut(auth)

export const watchAuthState = (callback) => onAuthStateChanged(auth, callback)

export const createAdminWithCredentials = async ({ name, email, password, role, createdBy }) => {
  const secondaryApp = initializeApp(firebaseConfig, `create-admin-${Date.now()}`)
  const secondaryAuth = getAuth(secondaryApp)

  try {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password)
    await setDoc(doc(db, 'users', credential.user.uid), {
      name,
      email,
      role,
      createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
    })

    await signOut(secondaryAuth)
    await deleteApp(secondaryApp)
    return credential.user.uid
  } catch (error) {
    await deleteApp(secondaryApp)
    throw error
  }
}

export const updateAdminProfile = async (uid, payload) => {
  await updateDoc(doc(db, 'users', uid), {
    ...payload,
    updatedAt: new Date().toISOString(),
  })
}

export const updateMyCredentials = async ({ user, email, password }) => {
  if (email && email !== user.email) {
    await updateEmail(user, email)
  }
  if (password) {
    await updatePassword(user, password)
  }
}

export const removeCurrentUser = async (user) => {
  await deleteUser(user)
}
