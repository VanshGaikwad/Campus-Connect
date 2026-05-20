/**
 * useTimetable.js
 * ───────────────
 * Custom hook to fetch the weekly_schedule from the division's
 * timetable sub-collection and provide time-aware helpers for
 * ongoing / upcoming lectures.
 *
 * Usage:
 *   const { timetable, todayClasses, ongoingClass, upcomingClass, loading, error }
 *     = useTimetable();
 */

import { useState, useEffect, useMemo } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../api/firebase/firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { saveToCache, loadFromCache } from '../utils/cache';

// ── Time parsing helpers ────────────────────────────────

/**
 * Parse a time string like "10:30" or "01:15" into minutes since midnight.
 */
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const cleaned = timeStr.trim().toUpperCase();
  
  const isPM = cleaned.includes('PM');
  const isAM = cleaned.includes('AM');
  
  // Extract just the numbers and colon
  const timePart = cleaned.replace(/[^\d:]/g, '');
  const parts = timePart.split(':');
  
  if (parts.length < 2 && (!parts[0] || parts[0] === '')) return 0;
  
  let hours = parseInt(parts[0] || '0', 10);
  let minutes = parseInt(parts[1] || '0', 10);
  
  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;
  
  // Heuristic: if no AM/PM, and hours is between 1 and 7, assume PM.
  if (!isPM && !isAM && hours >= 1 && hours <= 7) {
    hours += 12;
  }
  
  return hours * 60 + minutes;
}

/**
 * Parse a time range like "10:30 - 12:30", "10:30 to 12:30", or "10:30–12:30" into { start, end } in minutes.
 */
function parseTimeRange(timeStr) {
  if (!timeStr) return { start: 0, end: 0 };
  const normalized = timeStr.replace(/\s*to\s*/i, '-').replace(/–/g, '-');
  const parts = normalized.split('-').map(s => s.trim());
  return {
    start: parseTimeToMinutes(parts[0]),
    end: parts[1] ? parseTimeToMinutes(parts[1]) : parseTimeToMinutes(parts[0]) + 60,
  };
}

/**
 * Get current IST time in minutes since midnight.
 */
function getCurrentISTMinutes() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffset + now.getTimezoneOffset() * 60 * 1000);
  return ist.getHours() * 60 + ist.getMinutes();
}

/**
 * Get current IST day key.
 */
function getTodayKey() {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffset + now.getTimezoneOffset() * 60 * 1000);
  return days[ist.getDay()];
}

// ── Hook ────────────────────────────────────────────────

export default function useTimetable() {
  const { divisionPath, profile } = useAuth();
  const [timetable, setTimetable] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const userBatch = profile?.batch?.toUpperCase() || null;

  useEffect(() => {
    if (!divisionPath) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    const cacheKey = `@cc_timetable_${divisionPath.replace(/\//g, '_')}`;

    const fetchTimetable = async () => {
      try {
        // 1. Try cache first
        const cached = await loadFromCache(cacheKey);
        if (cached && isMounted) {
          setTimetable(cached);
          setLoading(false);
        }

        // 2. Fetch from Firestore: {divisionPath}/timetables/weekly_schedule
        const ttRef = doc(db, divisionPath, 'timetables', 'weekly_schedule');
        const ttSnap = await getDoc(ttRef);

        if (ttSnap.exists() && isMounted) {
          const freshData = ttSnap.data();
          setTimetable(freshData);
          setError(null);
          await saveToCache(cacheKey, freshData);
        } else if (!cached && isMounted) {
          setError('Timetable not found for your division.');
        }
      } catch (err) {
        console.error('[useTimetable] Fetch error:', err);
        if (isMounted && !timetable) {
          setError('Failed to load timetable.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchTimetable();
    return () => { isMounted = false; };
  }, [divisionPath]);

  // ── Derived data ──────────────────────────────────────

  const [nowMinutes, setNowMinutes] = useState(getCurrentISTMinutes());

  useEffect(() => {
    const interval = setInterval(() => {
      setNowMinutes(getCurrentISTMinutes());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const todayKey = useMemo(() => getTodayKey(), [nowMinutes]); // Updates at midnight automatically

  /**
   * Today's classes filtered by user's batch:
   * - Lectures (batch = "all") are always shown
   * - Practicals are only shown if batch matches user's batch
   */
  const todayClasses = useMemo(() => {
    const dayData = timetable?.[todayKey] || [];
    if (!Array.isArray(dayData)) return [];

    return dayData.filter(entry => {
      const entryBatch = (entry.batch || 'all').toUpperCase();
      if (entryBatch === 'ALL') return true;
      if (!userBatch) return true; // If no batch info, show all
      return entryBatch === userBatch;
    });
  }, [timetable, todayKey, userBatch]);

  /**
   * Filter classes for a specific day by batch.
   */
  const getClassesForDay = (dayKey) => {
    const dayData = timetable?.[dayKey] || [];
    if (!Array.isArray(dayData)) return [];

    return dayData.filter(entry => {
      const entryBatch = (entry.batch || 'all').toUpperCase();
      if (entryBatch === 'ALL') return true;
      if (!userBatch) return true;
      return entryBatch === userBatch;
    });
  };

  /**
   * Find the currently ongoing class based on current IST time.
   */
  const ongoingClass = useMemo(() => {
    return todayClasses.find(entry => {
      const { start, end } = parseTimeRange(entry.time);
      return nowMinutes >= start && nowMinutes < end;
    }) || null;
  }, [todayClasses, nowMinutes]);

  /**
   * Find the next upcoming class based on current IST time.
   */
  const upcomingClass = useMemo(() => {
    // Sort by start time and find the first one that starts after now
    const sorted = [...todayClasses].sort((a, b) => {
      return parseTimeRange(a.time).start - parseTimeRange(b.time).start;
    });
    return sorted.find(entry => {
      const { start } = parseTimeRange(entry.time);
      return start > nowMinutes;
    }) || null;
  }, [todayClasses, nowMinutes]);

  return {
    timetable,
    todayKey,
    todayClasses,
    ongoingClass,
    upcomingClass,
    getClassesForDay,
    loading,
    error,
  };
}
