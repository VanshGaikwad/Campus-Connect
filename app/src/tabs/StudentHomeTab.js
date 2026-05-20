import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import useTimetable from '../hooks/useTimetable';
import {
  collection,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../api/firebase/firebaseConfig';
import { useState, useEffect, useCallback } from 'react';
import Svg, { Path, Circle, Rect, Line, Polyline } from 'react-native-svg';
import { isScheduleStale, syncScheduleWithNotifications } from '../services/NotificationManager';
import Skeleton from '../components/Skeleton';
import { parseFlexibleDate, dayStamp } from '../utils/dateParser';

const parseDateSafe = (rawDate) => {
  return parseFlexibleDate(rawDate);
};

// ── Colors ────────────────────────────────────────────────────────────────────
const COLORS = {
  primary: '#007AFF',
  primaryLight: '#E5F1FF',
  background: '#F2F2F7',
  card: '#FFFFFF',
  border: '#E5E5EA',
  textPrimary: '#000000',
  textSecondary: '#3C3C43',
  textMuted: '#8E8E93',
  white: '#FFFFFF',
  green: '#34C759',
  greenLight: '#E8F8EE',
  greenBorder: '#D1FAE5',
  amber: '#FF9500',
  red: '#FF3B30',
};

// ── Icons ─────────────────────────────────────────────────────────────────────
const NotesIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path
      d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
      stroke={COLORS.primary}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Polyline
      points="14 2 14 8 20 8"
      stroke={COLORS.primary}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Line x1="16" y1="13" x2="8" y2="13" stroke={COLORS.primary} strokeWidth={2} strokeLinecap="round" />
    <Line x1="16" y1="17" x2="8" y2="17" stroke={COLORS.primary} strokeWidth={2} strokeLinecap="round" />
    <Polyline points="10 9 9 9 8 9" stroke={COLORS.primary} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

// ── Section Header ────────────────────────────────────────────────────────────
const SectionRow = ({ title, onViewAll }) => (
  <View style={styles.secRow}>
    <Text style={styles.secTitle}>{title}</Text>
    {onViewAll && (
      <TouchableOpacity onPress={onViewAll}>
        <Text style={styles.secLink}>View All</Text>
      </TouchableOpacity>
    )}
  </View>
);

// ── Component ─────────────────────────────────────────────────────────────────
export default function StudentHomeTab({ navigation }) {
  const { profile, divisionPath } = useAuth();
  const { todayClasses, ongoingClass, upcomingClass, loading: ttLoading, error: ttError } = useTimetable();

  const [todayCompany, setTodayCompany] = useState(null);
  const [notices, setNotices] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [extraLoading, setExtraLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const firstLoad = { companies: false, notices: false, events: false };
    const markLoaded = (key) => {
      firstLoad[key] = true;
      if (firstLoad.companies && firstLoad.notices && firstLoad.events) {
        setExtraLoading(false);
      }
    };

    const unsubCompanies = onSnapshot(
      collection(db, 'placement_drives'),
      (companySnap) => {
        const todayKey = dayStamp(new Date());
        const drives = companySnap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              companyName: data.company || data.companyName || 'Company',
              imageUrl: data.imageUrl || '',
              lpa: data.offer || data.lpa || 'N/A',
              eligibility: data.eligibility || data.criteria || 'Eligibility TBA',
              skills: Array.isArray(data.skills) ? data.skills.join(', ') : (data.skills || data.skillsRequired || 'N/A'),
              reportingTime: data.reportingTime || 'TBA',
              venue: data.venue || 'TBA',
              role: data.role || 'Campus Drive',
              dateObj: parseDateSafe(data.date),
            };
          })
          .sort((a, b) => {
            const aTime = a.dateObj ? a.dateObj.getTime() : Number.MAX_SAFE_INTEGER;
            const bTime = b.dateObj ? b.dateObj.getTime() : Number.MAX_SAFE_INTEGER;
            return aTime - bTime;
          });

        const todayDrive = drives.find((drive) => drive.dateObj && dayStamp(drive.dateObj) === todayKey);
        setTodayCompany(todayDrive || drives[0] || null);
        markLoaded('companies');
      },
      (e) => {
        console.error('StudentHomeTab companies listener error:', e);
        markLoaded('companies');
      },
    );

    const unsubNotices = onSnapshot(
      collection(db, 'notices'),
      (noticeSnap) => {
        const latestNotices = noticeSnap.docs
          .map((d) => {
            const data = d.data();
            const dateObj = parseDateSafe(data.date || data.createdAt || data.timestamp);
            return {
              id: d.id,
              title: data.headline || data.title || 'Notice',
              category: data.category || 'general',
              time: dateObj
                ? dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                : 'Recent',
              sortDate: dateObj ? dateObj.getTime() : 0,
            };
          })
          .sort((a, b) => b.sortDate - a.sortDate)
          .slice(0, 2);
        setNotices(latestNotices);
        markLoaded('notices');
      },
      (e) => {
        console.error('StudentHomeTab notices listener error:', e);
        markLoaded('notices');
      },
    );

    const unsubEvents = onSnapshot(
      collection(db, 'events'),
      (eventsSnap) => {
        const todayKey = dayStamp(new Date());
        const events = eventsSnap.docs
          .map((d) => {
            const data = d.data();
            const dateObj = parseDateSafe(data.date);
            return {
              id: d.id,
              name: data.eventName || data.title || 'Event',
              date: dateObj
                ? dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                : (data.date || 'Date TBA'),
              description: data.description || '',
              venue: data.venue || 'Venue TBA',
              time: data.time || 'Time TBA',
              registrationLink: data.registrationLink || data.regLink || '',
              dateObj,
            };
          })
          .filter((event) => !event.dateObj || dayStamp(event.dateObj) >= todayKey)
          .sort((a, b) => {
            const aTime = a.dateObj ? a.dateObj.getTime() : Number.MAX_SAFE_INTEGER;
            const bTime = b.dateObj ? b.dateObj.getTime() : Number.MAX_SAFE_INTEGER;
            return aTime - bTime;
          })
          .slice(0, 2);
        setUpcomingEvents(events);
        markLoaded('events');
      },
      (e) => {
        console.error('StudentHomeTab events listener error:', e);
        markLoaded('events');
      },
    );

    return () => {
      unsubCompanies();
      unsubNotices();
      unsubEvents();
    };
  }, []);

  // ── Re-sync local notifications if timetable changed ──
  useEffect(() => {
    if (!divisionPath || !profile?.batch) return;
    (async () => {
      try {
        const stale = await isScheduleStale(divisionPath);
        if (stale) {
          const count = await syncScheduleWithNotifications(divisionPath, profile.batch);
          console.log(`[HomeTab] Re-synced ${count} notifications`);
        } else {
          console.log('[HomeTab] Notification schedule is current.');
        }
      } catch (err) {
        console.warn('[HomeTab] Notification sync check failed:', err);
      }
    })();
  }, [divisionPath, profile?.batch]);

  const initials = profile?.name
    ? profile.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
    : 'ST';

  // ── Derive dept/year from divisionPath via AuthContext ──
  const dept = profile?.dept || 'ENTC';
  const year = profile?.year || 'TE';
  const studentId = profile?.email?.split('@')[0] || '';

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 500);
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} translucent={false} />

      {/* ── Header ── */}
      <View style={styles.topbar}>
        <TouchableOpacity
          style={styles.avatar}
          onPress={() => navigation.navigate('StudentProfileScreen')}
          activeOpacity={0.8}
        >
          <Ionicons name="person" size={20} color={COLORS.primary} />
        </TouchableOpacity>
        <View style={styles.topbarInfo}>
          <Text style={styles.greet}>{profile?.name?.split(' ')[0] ? `Hello, ${profile.name.split(' ')[0]}` : 'Hello!'}</Text>
          <Text style={styles.roleTag}>Student · {year}-{dept} · {studentId}</Text>
        </View>
        <TouchableOpacity
          style={styles.bellBtn}
          onPress={() => navigation.navigate('NotesScreen')}
        >
          <NotesIcon />
        </TouchableOpacity>
        <Image
          source={require('../../assets/pict logo.png')}
          style={{ width: 40, height: 40, resizeMode: 'contain', marginLeft: 12 }}
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* ── Timetable ── */}
        <SectionRow title="Time Table" onViewAll={() => navigation.navigate('TimetableScreen')} />
        {ttLoading ? (
          [1, 2].map(key => (
            <View key={key} style={styles.classCard}>
              <View style={styles.timeCol}>
                <Skeleton width={40} height={14} style={{ marginBottom: 4 }} />
              </View>
              <View style={styles.vDivider} />
              <View style={styles.classInfo}>
                <Skeleton width={120} height={16} style={{ marginBottom: 6 }} />
                <Skeleton width={80} height={14} />
              </View>
            </View>
          ))
        ) : ttError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{ttError}</Text>
          </View>
        ) : todayClasses.length > 0 ? (
          todayClasses.slice(0, 2).map((item, i) => (
            <View key={i} style={styles.classCard}>
              <View style={styles.timeCol}>
                <Text style={styles.timeVal}>{item.time}</Text>
                <View style={styles.timeBar} />
              </View>
              <View style={styles.vDivider} />
              <View style={styles.classInfo}>
                <Text style={styles.subject}>{item.sub || item.subject}</Text>
                <Text style={styles.teacher}>
                  {item.teacher || item.type || ''}{item.room ? ` · Room ${item.room}` : ''}
                  {item.batch && item.batch !== 'all' ? ` · Batch ${item.batch}` : ''}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No classes today.</Text>
        )}

        {/* ── Lecture Status (time-aware) ── */}
        <Text style={[styles.secTitle, { marginBottom: 8, marginTop: 4 }]}>Lecture Status</Text>
        <View style={styles.statusRow}>
          {ttLoading ? (
            <>
              <View style={[styles.statusCard, { backgroundColor: COLORS.greenLight }]}>
                <Skeleton width="80%" height={14} style={{ marginBottom: 4 }} />
                <Skeleton width="60%" height={12} />
              </View>
              <View style={[styles.statusCard, { backgroundColor: COLORS.primaryLight }]}>
                <Skeleton width="80%" height={14} style={{ marginBottom: 4 }} />
                <Skeleton width="60%" height={12} />
              </View>
            </>
          ) : (
            <>
              <View style={[styles.statusCard, { backgroundColor: COLORS.greenLight, borderColor: COLORS.greenBorder }]}>
                <View style={[styles.statusDot, { backgroundColor: COLORS.green }]} />
                <View>
                  <Text style={[styles.statusText, { color: '#065F46' }]}>Ongoing</Text>
                  <Text style={styles.statusSub}>
                    {ongoingClass ? `${ongoingClass.sub || ongoingClass.subject} · ${ongoingClass.room || ''}` : 'No class now'}
                  </Text>
                </View>
              </View>
              <View style={[styles.statusCard, { backgroundColor: COLORS.primaryLight, borderColor: COLORS.border }]}>
                <View style={[styles.statusDot, { backgroundColor: COLORS.amber }]} />
                <View>
                  <Text style={styles.statusText}>Upcoming</Text>
                  <Text style={styles.statusSub}>
                    {upcomingClass ? `${upcomingClass.sub || upcomingClass.subject} · ${upcomingClass.time}` : 'No next class'}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* ── Today's Company ── */}
        {extraLoading ? (
          <>
            <Text style={[styles.secTitle, { marginBottom: 8, marginTop: 4 }]}>Today's Company</Text>
            <View style={styles.companyCard}>
              <View style={styles.companyHeader}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Skeleton width={150} height={20} style={{ marginBottom: 6 }} baseColor="rgba(255,255,255,0.2)" highlightColor="rgba(255,255,255,0.4)" />
                  <Skeleton width={100} height={14} style={{ marginBottom: 4 }} baseColor="rgba(255,255,255,0.2)" highlightColor="rgba(255,255,255,0.4)" />
                  <Skeleton width={120} height={14} baseColor="rgba(255,255,255,0.2)" highlightColor="rgba(255,255,255,0.4)" />
                </View>
                <Skeleton width={46} height={46} borderRadius={10} baseColor="rgba(255,255,255,0.2)" highlightColor="rgba(255,255,255,0.4)" />
              </View>
              <Skeleton width="80%" height={14} style={{ marginTop: 8 }} baseColor="rgba(255,255,255,0.2)" highlightColor="rgba(255,255,255,0.4)" />
            </View>
          </>
        ) : todayCompany && (
          <>
            <Text style={[styles.secTitle, { marginBottom: 8, marginTop: 4 }]}>Today's Company</Text>
            <TouchableOpacity
              style={styles.companyCard}
              onPress={() => navigation.navigate('TodayCompanyScreen', {
                company: {
                  name: todayCompany.companyName,
                  service: todayCompany.role || 'Software Engineer',
                  imageUrl: todayCompany.imageUrl || '',
                  package: todayCompany.lpa,
                  eligibility: todayCompany.eligibility,
                  reportingTime: todayCompany.reportingTime,
                  venue: todayCompany.venue,
                  skillsRequired: todayCompany.skills,
                },
              })}
              activeOpacity={0.9}
            >
              <View style={styles.companyHeader}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.companyName}>{todayCompany.companyName}</Text>
                  <Text style={styles.companyMeta}>Criteria: {todayCompany.eligibility}</Text>
                  <Text style={styles.companyMeta}>Skills: {todayCompany.skills}</Text>
                </View>
                <View style={styles.companyPhoto}>
                  {todayCompany.imageUrl ? (
                    <Image source={{ uri: todayCompany.imageUrl }} style={styles.companyPhotoImage} />
                  ) : (
                    <Text style={styles.companyPhotoText}>
                      {todayCompany.companyName?.substring(0, 3).toUpperCase()}
                    </Text>
                  )}
                </View>
              </View>
              <Text style={styles.companyBottom}>
                {todayCompany.lpa} · {todayCompany.reportingTime} · {todayCompany.venue}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── Notices ── */}
        <SectionRow title="Notices" onViewAll={() => navigation.navigate('Notice')} />
        {extraLoading ? (
          [1, 2].map(key => (
            <View key={key} style={styles.noticeCard}>
              <View style={styles.noticeDot} />
              <Skeleton width="60%" height={16} />
            </View>
          ))
        ) : notices.length > 0 ? (
          notices.map(item => (
            <View key={item.id} style={styles.noticeCard}>
              <View style={[styles.noticeDot, String(item.category).toLowerCase() === 'holiday' && { backgroundColor: COLORS.amber }]} />
              <Text style={styles.noticeText} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.noticeTime}>{item.time}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No recent notices.</Text>
        )}

        {/* ── Upcoming Events ── */}
        <SectionRow title="Upcoming Events" onViewAll={() => navigation.navigate('Events')} />
        <View style={styles.eventsGrid}>
          {extraLoading ? (
            [1, 2].map(key => (
              <View key={key} style={styles.eventCard}>
                <View style={styles.eventNameBox}>
                  <Skeleton width="80%" height={16} />
                </View>
                <Skeleton width="50%" height={12} style={{ marginTop: 4 }} />
                <Skeleton width="100%" height={26} borderRadius={6} style={{ marginTop: 8 }} />
              </View>
            ))
          ) : upcomingEvents.length > 0 ? (
            upcomingEvents.map(item => (
              <View key={item.id} style={styles.eventCard}>
                <View style={styles.eventNameBox}>
                  <Text style={styles.eventNameText} numberOfLines={1}>{item.name}</Text>
                </View>
                <Text style={styles.eventDesc} numberOfLines={1}>{item.date}</Text>
                <TouchableOpacity
                  style={styles.regBtn}
                  onPress={() => navigation.navigate('UpcomingEventScreen', { event: item })}
                >
                  <Text style={styles.regBtnText}>Register Now</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No upcoming events.</Text>
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.white },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.white },

  topbar: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    flexShrink: 0,
  },
  avatarText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  topbarInfo: { flex: 1 },
  greet: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, lineHeight: 20 },
  roleTag: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  bellBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: 14 },

  secRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 4 },
  secTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  secLink: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },

  classCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  timeCol: { width: 56, alignItems: 'center', flexShrink: 0 },
  timeVal: { fontSize: 11, fontWeight: '700', color: COLORS.primary, lineHeight: 15, textAlign: 'center' },
  timeBar: { width: 2, height: 14, backgroundColor: COLORS.primary, marginTop: 3 },
  vDivider: { width: 1, backgroundColor: COLORS.border, height: 36, marginHorizontal: 10, flexShrink: 0 },
  classInfo: { flex: 1 },
  subject: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  teacher: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },

  statusRow: { gap: 12, marginBottom: 16 },
  statusCard: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12, flexShrink: 0 },
  statusText: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  statusSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },

  companyCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  companyHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  companyName: { fontSize: 16, fontWeight: '800', color: COLORS.white },
  companyMeta: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2, lineHeight: 16 },
  companyPhoto: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  companyPhotoText: { fontSize: 11, fontWeight: '700', color: COLORS.white, textAlign: 'center' },
  companyPhotoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  companyBottom: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 8 },

  noticeCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  noticeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.primary, marginRight: 10, flexShrink: 0 },
  noticeText: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  noticeTime: { fontSize: 11, color: COLORS.textMuted, marginLeft: 8 },

  eventsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  eventCard: {
    width: '50%',
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  eventNameBox: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  eventNameText: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  eventDesc: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2, lineHeight: 15 },
  regBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    paddingVertical: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  regBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.white },

  emptyText: { fontSize: 13, color: COLORS.textMuted, fontStyle: 'italic', marginBottom: 8 },

  errorCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 12,
    marginBottom: 8,
  },
  errorText: { fontSize: 12, color: COLORS.red, fontWeight: '500' },
});