import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import useTimetable from '../../hooks/useTimetable';

// ── Colors ────────────────────────────────────────────────────────────────────
const C = {
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  primaryLight: '#EEF3FD',
  bg: '#F5F6FA',
  card: '#FFFFFF',
  border: '#E0E7F5',
  text: '#111111',
  textSec: '#6B7280',
  textMuted: '#9CA3AF',
  white: '#FFFFFF',
  blue50: '#EFF6FF',
  slate50: '#F8FAFC',
  slate100: '#F1F5F9',
  red: '#EF4444',
};

const weekdayTabs = [
  { key: 'monday', short: 'Mon', date: '01' },
  { key: 'tuesday', short: 'Tue', date: '02' },
  { key: 'wednesday', short: 'Wed', date: '03' },
  { key: 'thursday', short: 'Thu', date: '04' },
  { key: 'friday', short: 'Fri', date: '05' },
];

export default function TimetableScreen({ navigation }) {
  const { timetable, todayKey, getClassesForDay, loading, error } = useTimetable();

  const isWeekend = todayKey === 'saturday' || todayKey === 'sunday';
  const initialDay = weekdayTabs.some(d => d.key === todayKey) ? todayKey : 'monday';
  const [selectedDay, setSelectedDay] = useState(initialDay);

  const lectures = useMemo(() => {
    const dayClasses = getClassesForDay(selectedDay);
    return dayClasses.map(item => ({
      subject: item?.subject || item?.sub || 'Lecture',
      time: item?.time || 'TBD',
      room: item?.room || 'TBD',
      teacher: item?.teacher || item?.type || 'Faculty',
      batch: item?.batch || 'all',
    }));
  }, [timetable, selectedDay]);

  // ── Loading ──
  if (loading && Object.keys(timetable || {}).length === 0) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  // ── Error ──
  if (error && Object.keys(timetable || {}).length === 0) {
    return (
      <View style={s.center}>
        <Ionicons name="alert-circle" size={48} color={C.red} />
        <Text style={s.errTitle}>Oops!</Text>
        <Text style={s.errMsg}>{error}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Pressable onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={C.white} />
          </Pressable>
          <View>
            <Text style={s.headerTitle}>Schedule</Text>
            <Text style={s.headerSub}>PICT Campus Connect</Text>
          </View>
        </View>
        <View style={s.headerIcon}>
          <Ionicons name="calendar-clear" size={24} color={C.white} />
        </View>
      </View>

      {/* ── Day Selector ── */}
      <View style={s.dayBarWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.dayBarContent}>
          {weekdayTabs.map((day) => {
            const isActive = day.key === selectedDay;
            return (
              <Pressable
                key={day.key}
                onPress={() => setSelectedDay(day.key)}
                style={[s.dayTab, isActive && s.dayTabActive]}
              >
                <Text style={[s.dayShort, isActive && s.dayShortActive]}>{day.short}</Text>
                <Text style={[s.dayDate, isActive && s.dayDateActive]}>{day.date}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Content ── */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isWeekend ? (
          <View style={s.weekendCard}>
            <View style={s.weekendIconWrap}>
              <Ionicons name="cafe" size={50} color={C.primary} />
            </View>
            <Text style={s.weekendTitle}>Weekend Mode</Text>
            <Text style={s.weekendMsg}>
              No lectures scheduled.{'\n'}Go explore Pune or catch up on sleep!
            </Text>
          </View>
        ) : lectures.length === 0 ? (
          <View style={[s.center, { marginTop: 40 }]}>
            <Ionicons name="calendar-outline" size={40} color={C.textMuted} />
            <Text style={s.emptyText}>No classes for {selectedDay}</Text>
          </View>
        ) : (
          lectures.map((lecture, index) => (
            <View key={index} style={s.timelineRow}>
              {/* Left Rail */}
              <View style={s.railCol}>
                <View style={[s.railDot, index === 0 && s.railDotFirst]} />
                {index < lectures.length - 1 && <View style={s.railLine} />}
              </View>

              {/* Card */}
              <View style={s.lectureCard}>
                <View style={s.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardSubject}>{lecture.subject}</Text>
                    <View style={s.cardTimeline}>
                      <Ionicons name="time" size={14} color={C.primary} />
                      <Text style={s.cardTime}>{lecture.time}</Text>
                    </View>
                  </View>
                  <View style={s.roomBadge}>
                    <Text style={s.roomText}>{lecture.room}</Text>
                  </View>
                </View>

                <View style={s.cardDivider} />

                <View style={s.cardBottom}>
                  <View style={s.teacherRow}>
                    <View style={s.teacherAvatar}>
                      <Ionicons name="person" size={12} color={C.primary} />
                    </View>
                    <Text style={s.teacherText}>
                      {lecture.teacher}
                      {lecture.batch && lecture.batch !== 'all' ? ` · Batch ${lecture.batch}` : ''}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white, padding: 32 },

  // Error
  errTitle: { fontSize: 18, fontWeight: '800', color: C.text, marginTop: 16 },
  errMsg: { fontSize: 14, color: C.textSec, textAlign: 'center', marginTop: 8 },

  // Header
  header: {
    backgroundColor: C.primary,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 56,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 28, fontWeight: '900', color: C.white },
  headerSub: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  headerIcon: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 12, borderRadius: 16 },

  // Day bar
  dayBarWrap: { marginTop: -32 },
  dayBarContent: { paddingVertical: 8, paddingHorizontal: 20 },
  dayTab: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginRight: 10,
    backgroundColor: C.white,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  dayTabActive: {
    backgroundColor: C.primary,
    elevation: 8,
    shadowColor: C.primary,
    shadowOpacity: 0.35,
  },
  dayShort: { fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: C.textMuted },
  dayShortActive: { color: 'rgba(255,255,255,0.7)' },
  dayDate: { fontSize: 20, fontWeight: '900', color: C.text, marginTop: 2 },
  dayDateActive: { color: C.white },

  // Scroll
  scroll: { flex: 1, marginTop: 12 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },

  // Weekend
  weekendCard: {
    alignItems: 'center',
    marginTop: 24,
    padding: 32,
    backgroundColor: C.white,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: C.border,
  },
  weekendIconWrap: { backgroundColor: C.blue50, padding: 24, borderRadius: 999, marginBottom: 20 },
  weekendTitle: { fontSize: 22, fontWeight: '900', color: C.text },
  weekendMsg: { fontSize: 14, color: C.textSec, textAlign: 'center', marginTop: 8, lineHeight: 20 },

  // Empty
  emptyText: { fontSize: 14, color: C.textMuted, fontWeight: '500', marginTop: 12 },

  // Timeline
  timelineRow: { flexDirection: 'row', marginBottom: 4 },
  railCol: { alignItems: 'center', marginRight: 14, width: 20 },
  railDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#BFDBFE',
    borderWidth: 3,
    borderColor: C.white,
    zIndex: 1,
  },
  railDotFirst: { backgroundColor: C.primary },
  railLine: { width: 2, flex: 1, backgroundColor: '#DBEAFE', marginVertical: -2 },

  // Lecture card
  lectureCard: {
    flex: 1,
    backgroundColor: C.white,
    marginBottom: 16,
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.border,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardSubject: { fontSize: 16, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  cardTimeline: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  cardTime: { marginLeft: 4, fontSize: 12, fontWeight: '700', color: C.primary },
  roomBadge: { backgroundColor: C.slate100, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  roomText: { fontSize: 10, fontWeight: '800', color: C.textSec, textTransform: 'uppercase' },
  cardDivider: { height: 1, backgroundColor: C.slate50, marginVertical: 14 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  teacherRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  teacherAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.blue50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teacherText: { marginLeft: 8, fontSize: 12, fontWeight: '600', color: C.textSec, flexShrink: 1 },
  chevronWrap: { backgroundColor: C.blue50, padding: 8, borderRadius: 12 },
});