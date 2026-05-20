/**
 * AuthContext.js
 * ──────────────
 * Centralized authentication & user profile state.
 *
 * On login:
 *   1. Firebase Auth `onAuthStateChanged` fires
 *   2. Collection Group Query on `students` finds the student doc
 *      by matching the `email` field to `auth.currentUser.email`
 *   3. From the doc's ref path we derive dept, year, division dynamically
 *   4. Profile + divisionPath are cached in AsyncStorage
 *
 * On app restart:
 *   1. Cached profile is restored instantly (no loading spinner)
 *   2. Firestore profile is refreshed in the background
 *
 * INDEX REQUIRED:
 *   In Firebase Console → Firestore → Indexes → Collection Group Indexes:
 *   Collection group: students
 *   Field: email (Ascending)
 *   Query scope: Collection group
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  collectionGroup,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';
import { auth, db } from '../api/firebase/firebaseConfig';
import { saveToCache, loadFromCache } from '../utils/cache';
import { syncScheduleWithNotifications } from '../services/NotificationManager';

// ── Cache keys ──────────────────────────────────────────
const CACHE_PROFILE  = '@cc_user_profile';
const CACHE_DIV_PATH = '@cc_division_path';
const CACHE_ROLE     = '@cc_user_role';

// ── Context ─────────────────────────────────────────────
const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

// ── Provider ────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null);   // Firebase Auth user
  const [profile, setProfile]         = useState(null);   // Firestore doc data
  const [divisionPath, setDivisionPath] = useState(null); // e.g. departments/ENTC/years/TE/divisions/08
  const [role, setRole]               = useState(null);   // 'student' | 'faculty'
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // ── Resolve user profile from nested hierarchy ────────
  const resolveProfile = async (firebaseUser) => {
    if (!firebaseUser) {
      if (isMounted.current) {
        setProfile(null);
        setDivisionPath(null);
        setRole(null);
        setLoading(false);
      }
      return;
    }

    try {
      // 1. Try to restore from cache first for instant UI
      const [cachedProfile, cachedPath, cachedRole] = await Promise.all([
        loadFromCache(CACHE_PROFILE),
        loadFromCache(CACHE_DIV_PATH),
        loadFromCache(CACHE_ROLE),
      ]);

      if (cachedProfile && cachedPath && cachedRole && isMounted.current) {
        setProfile(cachedProfile);
        setDivisionPath(cachedPath);
        setRole(cachedRole);
        setLoading(false);
        // Continue to refresh from Firestore in background below
      }

      // 2. Collection Group Query — find the student doc by email
      //    This avoids the documentId() issue (requires even-segment path).
      //    The user's Firebase Auth email is always available after login.
      const userEmail = firebaseUser.email;
      console.log('[AuthContext] Searching for student with email:', userEmail);

      const studentsQuery = query(
        collectionGroup(db, 'students'),
        where('email', '==', userEmail),
      );
      const studentsSnap = await getDocs(studentsQuery);

      if (!studentsSnap.empty) {
        // ── Student found ──
        const studentDoc = studentsSnap.docs[0];
        const studentData = studentDoc.data();

        // Derive division path from the document reference
        // ref.path = departments/ENTC/years/TE/divisions/08/students/s24et032
        const refPath = studentDoc.ref.path;
        const pathParts = refPath.split('/');
        // pathParts = ['departments','ENTC','years','TE','divisions','08','students','s24et032']
        //              0              1      2       3    4           5    6          7

        // Remove last two segments (students/{code}) to get divisionPath
        const divPath = pathParts.slice(0, pathParts.length - 2).join('/');
        // divPath = 'departments/ENTC/years/TE/divisions/08'

        // Extract hierarchy info for logging
        const dept = pathParts[1] || '';
        const year = pathParts[3] || '';
        const division = pathParts[5] || '';
        console.log(`[AuthContext] Student found: dept=${dept}, year=${year}, div=${division}`);
        console.log(`[AuthContext] Division path: ${divPath}`);

        if (isMounted.current) {
          setProfile({ ...studentData, dept, year, division });
          setDivisionPath(divPath);
          setRole('student');
          setError(null);
          setLoading(false);
        }

        // Cache for next restart
        await Promise.all([
          saveToCache(CACHE_PROFILE, { ...studentData, dept, year, division }),
          saveToCache(CACHE_DIV_PATH, divPath),
          saveToCache(CACHE_ROLE, 'student'),
        ]);

        // Schedule local notifications (fire-and-forget)
        syncScheduleWithNotifications(divPath, studentData.batch)
          .then(n => console.log(`[AuthContext] Scheduled ${n} local notifications`))
          .catch(e => console.warn('[AuthContext] Notif sync failed:', e));

        return;
      }

      // 3. Not a student → check faculty at department level
      //    Try departments/{dept}/faculty/{uid}
      console.log('[AuthContext] Not found as student, checking faculty...');
      const departments = ['ENTC', 'CS', 'IT', 'MECH', 'CIVIL', 'EE'];
      for (const dept of departments) {
        const facultyRef = doc(db, 'departments', dept, 'faculty', firebaseUser.uid);
        const facultySnap = await getDoc(facultyRef);
        if (facultySnap.exists()) {
          const facultyData = facultySnap.data();
          const divPath = `departments/${dept}`;

          if (isMounted.current) {
            setProfile({ ...facultyData, dept });
            setDivisionPath(divPath);
            setRole('faculty');
            setError(null);
            setLoading(false);
          }

          await Promise.all([
            saveToCache(CACHE_PROFILE, { ...facultyData, dept }),
            saveToCache(CACHE_DIV_PATH, divPath),
            saveToCache(CACHE_ROLE, 'faculty'),
          ]);

          return;
        }
      }

      // 4. User not found in hierarchy
      console.warn('[AuthContext] User not found in any collection:', firebaseUser.uid);
      if (isMounted.current) {
        setError('User profile not found in the database.');
        setLoading(false);
      }
    } catch (err) {
      console.error('[AuthContext] resolveProfile error:', err);
      if (isMounted.current) {
        setError('Failed to load profile. Please try again.');
        setLoading(false);
      }
    }
  };

  // ── Auth state listener ───────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        resolveProfile(firebaseUser);
      } else {
        // Logged out
        setProfile(null);
        setDivisionPath(null);
        setRole(null);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  // ── Logout ────────────────────────────────────────────
  const logout = async () => {
    try {
      // Clear cache
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      await AsyncStorage.multiRemove([CACHE_PROFILE, CACHE_DIV_PATH, CACHE_ROLE]);
    } catch (e) {
      console.warn('[AuthContext] Cache clear failed:', e);
    }
    await signOut(auth);
  };

  const value = {
    user,
    profile,
    divisionPath,
    role,
    loading,
    error,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
