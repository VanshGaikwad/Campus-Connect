import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Image,
  Linking,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { collection, onSnapshot } from 'firebase/firestore';
import Skeleton from '../components/Skeleton';
import { db } from '../api/firebase/firebaseConfig';
import { parseFlexibleDate } from '../utils/dateParser';

// ── Colors ────────────────────────────────────────────────────────────────────
const COLORS = {
  primary:       '#007AFF',
  primaryLight:  '#E5F1FF',
  background:    '#F2F2F7',
  card:          '#FFFFFF',
  border:        '#E5E5EA',
  textPrimary:   '#000000',
  textSecondary: '#3C3C43',
  textMuted:     '#8E8E93',
  white:         '#FFFFFF',
};

// ── Category tag colors ───────────────────────────────────────────────────────
const TAG_COLORS = {
  All:         { bg: '#EEF3FD', text: '#3D6EE8' },
  Academic:    { bg: '#ECFDF5', text: '#065F46' },
  Holiday:     { bg: '#FEF3C7', text: '#B45309' },
  Scholarship: { bg: '#F5F3FF', text: '#5B21B6' },
};

// ── Filter categories ─────────────────────────────────────────────────────────
const FILTERS = ['All', 'Academic', 'Holiday', 'Scholarship'];

const normalizeCategory = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'academic' || normalized === 'academics') return 'Academic';
  if (normalized === 'holiday' || normalized === 'holidays') return 'Holiday';
  if (normalized === 'scholarship') return 'Scholarship';
  return 'All';
};

const parseNoticeDate = (rawDate) => {
  return parseFlexibleDate(rawDate) || new Date(0);
};

const formatNoticeTime = (rawDate) => {
  if (!rawDate) return 'Recent';
  const date = parseFlexibleDate(rawDate);
  if (!date) return String(rawDate);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

// ── Bell Icon ─────────────────────────────────────────────────────────────────
const BellIcon = ({ size = 16, color = '#3D6EE8' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M13.73 21a2 2 0 01-3.46 0"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// ── Notice Card ───────────────────────────────────────────────────────────────
const openAttachment = async (url) => {
  if (!url) return;
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      console.warn('Notice attachment URL is not supported:', url);
    }
  } catch (error) {
    console.warn('Failed to open notice attachment:', error);
  }
};

const NoticeCard = ({ item }) => {
  const tag = TAG_COLORS[item.category] || TAG_COLORS['All'];
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.cardTag, { backgroundColor: tag.bg }]}>
          <Text style={[styles.cardTagText, { color: tag.text }]}>{item.category}</Text>
        </View>
        <Text style={styles.cardTime}>{item.time}</Text>
      </View>
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardDesc}>{item.description}</Text>
      {item.fileUrl ? (
        <TouchableOpacity
          style={styles.attachmentBtn}
          onPress={() => openAttachment(item.fileUrl)}
          activeOpacity={0.8}
        >
          <Text style={styles.attachmentBtnText}>Open Attachment</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function NoticeTab() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'notices'),
      (snap) => {
        const parsed = snap.docs
          .map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              category: normalizeCategory(data.category),
              title: data.headline || data.title || 'Untitled notice',
              description: data.description || 'No description available.',
              fileUrl: data.fileUrl || '',
              time: formatNoticeTime(data.date || data.createdAt || data.timestamp),
              sortDate: parseNoticeDate(data.date || data.createdAt || data.timestamp),
            };
          })
          .sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());

        setNotices(parsed);
        setLoading(false);
      },
      (error) => {
        console.error('NoticeTab fetch error:', error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const filtered = activeFilter === 'All'
    ? notices
    : notices.filter(n => n.category === activeFilter);

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
        <View>
          <Text style={styles.topbarTitle}>Notices</Text>
          {/* <Text style={styles.topbarSub}>PICT Campus Connect</Text> */}
        </View>
        <Image
          source={require('../../assets/pict logo.png')}
          style={{ width: 40, height: 40, resizeMode: 'contain' }}
        />
      </View>

      {/* ── Filter pills ── */}
      <View style={styles.filterWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.pill, activeFilter === f && styles.pillActive]}
              onPress={() => setActiveFilter(f)}
              activeOpacity={0.8}
            >
              <Text style={[styles.pillText, activeFilter === f && styles.pillTextActive]}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Notices list ── */}
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
        {loading ? (
          // Skeleton Loaders
          [1, 2, 3, 4].map(key => (
            <View key={key} style={styles.card}>
              <View style={styles.cardTop}>
                <Skeleton width={80} height={24} borderRadius={12} />
                <Skeleton width={60} height={16} />
              </View>
              <Skeleton width="100%" height={20} style={{ marginBottom: 6, marginTop: 10 }} />
              <Skeleton width="80%" height={16} style={{ marginBottom: 4 }} />
              <Skeleton width="60%" height={16} />
            </View>
          ))
        ) : filtered.length > 0 ? (
          filtered.map(item => <NoticeCard key={item.id} item={item} />)
        ) : (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No notices in this category.</Text>
          </View>
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.white,
  },

  // Header
  topbar: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  topbarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  topbarSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Filter pills
  filterWrap: {
    backgroundColor: COLORS.white,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  pill: {
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  pillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  pillTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },

  // Scroll
  scroll: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 14,
  },

  // Notice card
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2, // For Android
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTag: {
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 9,
  },
  cardTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardTime: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '400',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    lineHeight: 22,
    marginBottom: 5,
  },
  cardDesc: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 19,
  },
  attachmentBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  attachmentBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // Empty state
  emptyWrap: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
});