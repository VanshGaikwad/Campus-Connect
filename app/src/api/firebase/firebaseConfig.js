import { initializeApp } from "firebase/app";
import { 
  initializeAuth, 
  getReactNativePersistence 
} from 'firebase/auth'; // Change getAuth to these
import { initializeFirestore } from 'firebase/firestore';
import { Platform } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage'; // Import this

const firebaseConfig = {
  apiKey: Platform.select({
    ios: process.env.EXPO_PUBLIC_FIREBASE_API_KEY_IOS,
    android: process.env.EXPO_PUBLIC_FIREBASE_API_KEY_ANDROID,
    default: process.env.EXPO_PUBLIC_FIREBASE_API_KEY_ANDROID,
  }),
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: Platform.select({
    ios: process.env.EXPO_PUBLIC_FIREBASE_APP_ID_IOS,
    android: process.env.EXPO_PUBLIC_FIREBASE_APP_ID_ANDROID,
    default: process.env.EXPO_PUBLIC_FIREBASE_APP_ID_ANDROID,
  }),
};

const app = initializeApp(firebaseConfig);

// Initialize Auth with Persistence so users stay logged in
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Long polling is more stable than WebChannel on some mobile networks and emulators.
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  useFetchStreams: false,
});
export default app;