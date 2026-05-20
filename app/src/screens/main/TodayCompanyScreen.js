import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Polyline, Polygon } from 'react-native-svg';

// ── Colors ────────────────────────────────────────────────────────────────────
const COLORS = {
  primary:       '#3D6EE8',
  primaryLight:  '#EEF3FD',
  background:    '#F5F6FA',
  card:          '#FFFFFF',
  border:        '#E0E7F5',
  textPrimary:   '#111111',
  textSecondary: '#888888',
  textMuted:     '#BBBBBB',
  white:         '#FFFFFF',
  green:         '#4ADE80',
  heroSubText:   '#B5CEFF',
  heroBadgeBg:   'rgba(255,255,255,0.18)',
};

// ── Icons ─────────────────────────────────────────────────────────────────────
const BackIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M15 18l-6-6 6-6" stroke={COLORS.white} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ActivityIcon = ({ color = COLORS.primary }) => (
  <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
    <Polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
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

const StarIcon = ({ color = COLORS.primary }) => (
  <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
    <Polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
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
export default function TodayCompanyScreen({ navigation, route }) {
  const notificationData = route?.params?.notificationData;
  
  // If navigated from a notification, use notification data to construct company object
  const company = notificationData ? {
    name: notificationData.companyName || 'Company',
    service: notificationData.position || 'Position TBA',
    package: notificationData.offer || 'Package TBA',
    eligibility: notificationData.eligibility || 'Eligibility criteria TBA',
    reportingTime: notificationData.reportingTime || 'TBA',
    venue: notificationData.venue || 'Venue TBA',
    skillsRequired: notificationData.skills || 'Skills TBA',
  } : (route?.params?.company ?? {
    name: 'Siemens Healthineers',
    service: 'Software Engineer Intern',
    package: '14.5L',
    eligibility: '60% aggregate throughout, No active backlogs, COMP / IT / ENTC branches only',
    reportingTime: '09:30 AM',
    venue: 'A-Block Seminar Hall',
    skillsRequired: 'Strong knowledge of Java and Data Structures, Good problem solving ability, Basic SQL knowledge, Effective communication skills, Familiarity with OOP concepts',
  });

  // Split skills by comma into bullet points
  const skills = Array.isArray(company.skillsRequired)
    ? company.skillsRequired
    : (company.skillsRequired || '').split(',').map(s => s.trim()).filter(Boolean);

  // Generate 2-line logo abbreviation from company name
  const getLogoLines = (name = '') => {
    const words = name.trim().split(/\s+/);
    const first = (words[0] || '').toUpperCase();
    if (first.length <= 4) return [first, (words[1] || '').substring(0, 4).toUpperCase()].filter(Boolean);
    return [first.substring(0, 3), first.substring(3, 7)];
  };
  const logoLines = getLogoLines(company.name);

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
          <View style={styles.heroTop}>
            <View style={styles.heroInfo}>
              <Text style={styles.heroName}>{company.name}</Text>
              <Text style={styles.heroSub}>{company.service}</Text>
            </View>
            <View style={styles.logoBox}>
              {company.imageUrl ? (
                <Image source={{ uri: company.imageUrl }} style={styles.logoImage} />
              ) : (
                logoLines.map((line, i) => (
                  <Text key={i} style={styles.logoText}>{line}</Text>
                ))
              )}
            </View>
          </View>
          <View style={styles.heroBadge}>
            <View style={styles.greenDot} />
            <Text style={styles.heroBadgeText}>Visiting Today</Text>
          </View>
        </View>

        {/* ── Stats strip ── */}
        <View style={styles.statsRow}>
          <View style={styles.statCell}>
            <Text style={styles.statVal}>₹{company.package}</Text>
            <Text style={styles.statLbl}>Package CTC</Text>
          </View>
          <View style={[styles.statCell, styles.statBorderLeft]}>
            <Text style={styles.statVal}>{company.reportingTime}</Text>
            <Text style={styles.statLbl}>Reporting Time</Text>
          </View>
        </View>

        {/* ── Eligibility Criteria ── */}
        <SectionCard icon={<ActivityIcon />} title="ELIGIBILITY CRITERIA">
          <InfoRow
            icon={<ActivityIcon />}
            label="Criteria"
            value={company.eligibility}
          />
        </SectionCard>

        {/* ── Schedule ── */}
        <SectionCard icon={<ClockIcon />} title="SCHEDULE">
          <InfoRow
            icon={<ClockIcon />}
            label="Reporting Time"
            value={`${company.reportingTime} sharp`}
            valueBlue
          />
          <InfoRow
            icon={<PinIcon />}
            label="Venue"
            value={company.venue}
          />
        </SectionCard>

        {/* ── Skills Required ── */}
        <SectionCard icon={<StarIcon />} title="SKILLS REQUIRED">
          {skills.map((skill, index) => (
            <View key={index} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>{skill}</Text>
            </View>
          ))}
        </SectionCard>

        <View style={{ height: 30, marginHorizontal: 16 }} />
      </ScrollView>
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
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroInfo: { flex: 1, marginRight: 12 },
  heroName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.white,
    lineHeight: 28,
  },
  heroSub: {
    fontSize: 14,
    color: COLORS.heroSubText,
    marginTop: 4,
  },
  logoBox: {
    width: 62,
    height: 62,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  logoText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
    textAlign: 'center',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.heroBadgeBg,
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    marginTop: 14,
  },
  greenDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.green,
    marginRight: 6,
  },
  heroBadgeText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '600',
  },

  // Stats strip — only 2 cells
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.primaryLight,
    marginHorizontal: 16,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: -14,
    paddingVertical: 0,
    marginBottom: 16,
  },
  statCell: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  statBorderLeft: {
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
  },
  statVal: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
    paddingVertical: 2,
  },
  statLbl: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 3,
    fontWeight: '500',
  },

  // Scroll
  scroll: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingTop: 0,
  },

  // Section card
  sectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: 12,
    marginHorizontal: 16,
    paddingVertical: 0
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

  // Bullet points for skills
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  bulletDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginTop: 7,
    marginRight: 10,
    flexShrink: 0,
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    color: '#333333',
    lineHeight: 22,
  },
});