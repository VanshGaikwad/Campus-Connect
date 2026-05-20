import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Polyline, Rect, Line } from 'react-native-svg';

// ── Colors ────────────────────────────────────────────────────────────────────
const COLORS = {
  primary:      '#3D6EE8',
  primaryLight: '#EEF3FD',
  background:   '#F5F6FA',
  card:         '#FFFFFF',
  border:       '#E0E7F5',
  textPrimary:  '#111111',
  textSecondary:'#888888',
  textMuted:    '#BBBBBB',
  white:        '#FFFFFF',
  amber:        '#F59E0B',
  heroBadgeBg:  'rgba(255,255,255,0.18)',
};

// ── Icons ─────────────────────────────────────────────────────────────────────
const BackIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M15 18l-6-6 6-6" stroke={COLORS.white} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CalendarIcon = ({ color = COLORS.primary }) => (
  <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="4" width="18" height="18" rx="2" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Line x1="3" y1="10" x2="21" y2="10" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Line x1="8" y1="2" x2="8" y2="6" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Line x1="16" y1="2" x2="16" y2="6" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const ClockIcon = ({ color = COLORS.primary }) => (
  <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
    <Polyline points="12 6 12 12 16 14" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const PinIcon = ({ color = COLORS.primary }) => (
  <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
    <Path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="12" cy="10" r="3" stroke={color} strokeWidth={2} />
  </Svg>
);

const FileIcon = ({ color = COLORS.primary }) => (
  <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
    <Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Polyline points="14 2 14 8 20 8" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ── Reusable Section Card ─────────────────────────────────────────────────────
const SectionCard = ({ icon, title, children }) => (
  <View style={styles.sectionCard}>
    <View style={styles.sectionHeader}>
      {icon}
      <Text style={styles.sectionHeaderTitle}>{title}</Text>
    </View>
    <View style={styles.sectionBody}>{children}</View>
  </View>
);

// ── Reusable Info Row ─────────────────────────────────────────────────────────
const InfoRow = ({ icon, label, value, valueBlue = false }) => (
  <View style={styles.infoRow}>
    <View style={styles.iconBox}>{icon}</View>
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueBlue && styles.infoValueBlue]}>{value}</Text>
    </View>
  </View>
);

// ── Component ─────────────────────────────────────────────────────────────────
export default function UpcomingEventScreen({ navigation, route }) {
  const event = route?.params?.event ?? {
    name: 'Annual Tech Fest 2026',
    date: 'Monday, 24 October 2026',
    time: '10:00 AM – 12:00 PM',
    venue: 'Auditorium, Main Building\nPICT Campus, Pune',
    description: 'Event description goes here. This section describes the purpose, highlights, and any other relevant information about the event for students.',
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} translucent={false} />

      {/* ── Top bar ── */}
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
          <BackIcon />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ── */}
        <View style={styles.hero}>
          <Text style={styles.heroName}>{event.name}</Text>
          <View style={styles.heroBadge}>
            <View style={styles.amberDot} />
            <Text style={styles.heroBadgeText}>Upcoming Event</Text>
          </View>
        </View>

        {/* ── Date and Time ── */}
        <SectionCard icon={<ClockIcon />} title="DATE AND TIME">
          <InfoRow
            icon={<CalendarIcon />}
            label="Date"
            value={event.date}
          />
          <InfoRow
            icon={<ClockIcon />}
            label="Time"
            value={event.time}
            valueBlue
          />
        </SectionCard>

        {/* ── Venue ── */}
        <SectionCard icon={<PinIcon />} title="VENUE">
          <InfoRow
            icon={<PinIcon />}
            label="Location"
            value={event.venue}
          />
        </SectionCard>

        {/* ── About Event ── */}
        <SectionCard icon={<FileIcon />} title="ABOUT EVENT">
          <View style={styles.descBox}>
            <Text style={styles.descText}>{event.description}</Text>
          </View>
        </SectionCard>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* ── Register Now button — fixed at bottom ── */}
      <View style={styles.registerWrap}>
        <TouchableOpacity style={styles.registerBtn} activeOpacity={0.85}>
          <Text style={styles.registerBtnText}>Register Now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },

  // Topbar
  topbar: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontSize: 15,
    color: COLORS.white,
    fontWeight: '500',
    marginLeft: 4,
  },

  // Hero
  hero: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingBottom: 28,
    paddingTop: 4,
  },
  heroName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.white,
    lineHeight: 28,
    paddingRight: 10,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.heroBadgeBg,
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  amberDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.amber,
    marginRight: 6,
  },
  heroBadgeText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '600',
  },

  // Scroll
  scroll: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingTop: 16,
    paddingHorizontal: 16,
  },

  // Section card
  sectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: 12,
  },
  sectionHeader: {
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.5,
    marginLeft: 8,
  },
  sectionBody: {
    padding: 14,
  },

  // Info row
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginRight: 10,
  },
  infoContent: { flex: 1 },
  infoLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 3,
    lineHeight: 22,
  },
  infoValueBlue: {
    color: COLORS.primary,
  },

  // Description box
  descBox: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    minHeight: 110,
  },
  descText: {
    fontSize: 14,
    color: '#444444',
    lineHeight: 21,
  },

  // Register Now button
  registerWrap: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  registerBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  registerBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
});