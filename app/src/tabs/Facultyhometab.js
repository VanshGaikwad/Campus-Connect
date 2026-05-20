import React, { useEffect, useState } from 'react';
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
import {
  collection,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../api/firebase/firebaseConfig';
import Svg, { Path, Rect, Line } from 'react-native-svg';
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
};

// ── Notes Icon ────────────────────────────────────────────────────────────────
const NotesIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path
      d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
      stroke={COLORS.primary}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M14 2v6h6"
      stroke={COLORS.primary}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Line x1="16" y1="13" x2="8" y2="13" stroke={COLORS.primary} strokeWidth={2} strokeLinecap="round" />
    <Line x1="16" y1="17" x2="8" y2="17" stroke={COLORS.primary} strokeWidth={2} strokeLinecap="round" />
    <Line x1="10" y1="9" x2="8" y2="9" stroke={COLORS.primary} strokeWidth={2} strokeLinecap="round" />
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
export default function FacultyHomeTab({ navigation }) {
  const { profile } = useAuth();

  const [todaySchedule, setTodaySchedule] = useState([]);
  const [todayCompany, setTodayCompany] = useState(null);
  const [notices, setNotices] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const firstLoad = { companies: false, notices: false, events: false, schedule: false };
    const markLoaded = (key) => {
      firstLoad[key] = true;
      if (firstLoad.companies && firstLoad.notices && firstLoad.events && firstLoad.schedule && isMounted) {
        setLoading(false);
      }
    };

    const fetchSchedule = async () => {
      try {
        if (profile?.facultyId || profile?.uid) {
          const facultyId = profile.facultyId || profile.uid;
          const scheduleSnap = await getDocs(collection(db, 'faculty_schedules'));
          const matched = scheduleSnap.docs.find((doc) => doc.data()?.facultyId === facultyId);
          if (matched) {
            const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const daySchedule = matched.data()?.[days[new Date().getDay()]] || [];
            setTodaySchedule(Array.isArray(daySchedule) ? daySchedule : []);
          } else {
            setTodaySchedule([]);
          }
        } else {
          setTodaySchedule([]);
        }
      } catch (e) {
        console.error('FacultyHomeTab schedule fetch error:', e);
      } finally {
        markLoaded('schedule');
      }
    };

    fetchSchedule();

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
        console.error('FacultyHomeTab companies listener error:', e);
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
        console.error('FacultyHomeTab notices listener error:', e);
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
        console.error('FacultyHomeTab events listener error:', e);
        markLoaded('events');
      },
    );

    return () => {
      isMounted = false;
      unsubCompanies();
      unsubNotices();
      unsubEvents();
    };
  }, [profile]);

  const initials = profile?.name
    ? profile.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
    : 'FA';

  const getCurrentISTMinutes = () => {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const ist = new Date(now.getTime() + istOffset + now.getTimezoneOffset() * 60 * 1000);
    return ist.getHours() * 60 + ist.getMinutes();
  };

  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const cleaned = timeStr.trim().toUpperCase();
    const isPM = cleaned.includes('PM');
    const isAM = cleaned.includes('AM');
    const timePart = cleaned.replace(/[^\d:]/g, '');
    const parts = timePart.split(':');
    if (parts.length < 2 && (!parts[0] || parts[0] === '')) return 0;
    let hours = parseInt(parts[0] || '0', 10);
    let minutes = parseInt(parts[1] || '0', 10);
    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;
    if (!isPM && !isAM && hours >= 1 && hours <= 7) hours += 12;
    return hours * 60 + minutes;
  };

  const parseTimeRange = (timeStr) => {
    if (!timeStr) return { start: 0, end: 0 };
    const normalized = timeStr.replace(/\s*to\s*/i, '-').replace(/–/g, '-');
    const parts = normalized.split('-').map(s => s.trim());
    return {
      start: parseTimeToMinutes(parts[0]),
      end: parts[1] ? parseTimeToMinutes(parts[1]) : parseTimeToMinutes(parts[0]) + 60,
    };
  };

  const [nowMinutes, setNowMinutes] = useState(getCurrentISTMinutes());

  useEffect(() => {
    const interval = setInterval(() => {
      setNowMinutes(getCurrentISTMinutes());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const ongoingLecture = todaySchedule.find(entry => {
    const { start, end } = parseTimeRange(entry.time);
    return nowMinutes >= start && nowMinutes < end;
  }) || null;

  const nextLecture = [...todaySchedule].sort((a, b) => {
    return parseTimeRange(a.time).start - parseTimeRange(b.time).start;
  }).find(entry => {
    const { start } = parseTimeRange(entry.time);
    return start > nowMinutes;
  }) || null;

  const onRefresh = React.useCallback(() => {
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
          onPress={() => navigation.navigate('FacultyProfileScreen')}
          activeOpacity={0.8}
        >
          <Ionicons name="person" size={20} color={COLORS.primary} />
        </TouchableOpacity>
        <View style={styles.topbarInfo}>
          <Text style={styles.greet}>{profile?.name || 'Hello!'}</Text>
          <Text style={styles.roleTag}>Faculty · {profile?.dept || 'Computer'} Dept.</Text>
        </View>
        <TouchableOpacity
          style={styles.notesBtn}
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
        {/* ── Teaching Schedule ── */}
        <SectionRow title="My Teaching Schedule" onViewAll={() => navigation.navigate('TimetableScreen')} />
        {loading ? (
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
        ) : todaySchedule.length > 0 ? (
          todaySchedule.slice(0, 2).map((item, i) => (
            <View key={i} style={styles.classCard}>
              <View style={styles.timeCol}>
                <Text style={styles.timeVal}>{item.time}</Text>
                <View style={styles.timeBar} />
              </View>
              <View style={styles.vDivider} />
              <View style={styles.classInfo}>
                <Text style={styles.subject}>{item.sub}</Text>
                <Text style={styles.teacher}>{item.class} · Room {item.room}</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No lectures scheduled today.</Text>
        )}

        {/* ── Lecture Status ── */}
        <Text style={[styles.secTitle, { marginBottom: 8, marginTop: 4 }]}>Lecture Status</Text>
        <View style={styles.statusRow}>
          {loading ? (
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
                <View style={{ flex: 1 }}>
                  <Text style={[styles.statusText, { color: '#065F46' }]}>Ongoing</Text>
                  <Text style={styles.statusSub}>
                    {ongoingLecture ? `${ongoingLecture.sub} · ${ongoingLecture.class}` : 'No lecture now'}
                  </Text>
                </View>
              </View>
              <View style={[styles.statusCard, { backgroundColor: COLORS.primaryLight, borderColor: COLORS.border }]}>
                <View style={[styles.statusDot, { backgroundColor: COLORS.amber }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.statusText}>Upcoming</Text>
                  <Text style={styles.statusSub}>
                    {nextLecture ? `${nextLecture.sub} · ${nextLecture.time}` : 'No next lecture'}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* ── Today's Company ── */}
        {loading ? (
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
            <View style={styles.companyCard}>
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
            </View>
          </>
        )}

        {/* ── Notices ── */}
        <SectionRow title="Notices" onViewAll={() => navigation.navigate('Notice')} />
        {loading ? (
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
          {loading ? (
            [1, 2].map(key => (
              <View key={key} style={styles.eventCardCtn}>
                <View style={styles.eventNameBox}>
                  <Skeleton width="80%" height={16} />
                </View>
                <Skeleton width="50%" height={12} style={{ marginTop: 4, marginLeft: 2 }} />
              </View>
            ))
          ) : upcomingEvents.length > 0 ? (
            upcomingEvents.map(item => (
              <TouchableOpacity
                key={item.id}
                style={styles.eventCardCtn}
                onPress={() => navigation.navigate('UpcomingEventScreen', { event: item })}
                activeOpacity={0.8}
              >
                <View style={styles.eventNameBox}>
                  <Text style={styles.eventNameText} numberOfLines={1}>{item.name}</Text>
                </View>
                <Text style={styles.eventDesc} numberOfLines={1}>{item.date}</Text>
              </TouchableOpacity>
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
  notesBtn: {
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
  noticeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.primary, marginRight: 8, flexShrink: 0 },
  noticeText: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  noticeTime: { fontSize: 10, color: COLORS.textMuted, marginLeft: 8 },

  eventsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  eventCardCtn: {
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
  eventDesc: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4, marginLeft: 2, lineHeight: 15 },

  emptyText: { fontSize: 13, color: COLORS.textMuted, fontStyle: 'italic', marginBottom: 8 },
});