import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore'
import { db } from './firebase'

export const createDocument = async (collectionName, payload) => {
  return addDoc(collection(db, collectionName), {
    ...payload,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
}

export const updateDocument = async (collectionName, id, payload) => {
  await updateDoc(doc(db, collectionName, id), {
    ...payload,
    updatedAt: new Date().toISOString(),
  })
}

export const deleteDocument = async (collectionName, id) => {
  await deleteDoc(doc(db, collectionName, id))
}

export const getDocument = async (collectionName, id) => {
  const snapshot = await getDoc(doc(db, collectionName, id))
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null
}

export const subscribeCollection = (collectionName, callback) => {
  const q = query(collection(db, collectionName), orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })))
  })
}

export const subscribeUsers = (callback) => {
  return onSnapshot(collection(db, 'users'), (snapshot) => {
    callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })))
  })
}

export const fetchAllDocuments = async (collectionName) => {
  const snapshot = await getDocs(collection(db, collectionName))
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
}
