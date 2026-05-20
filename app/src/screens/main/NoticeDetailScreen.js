import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Line } from 'react-native-svg';

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
  green:        '#4ADE80',
  blue:         '#3D6EE8',
};

// ── Category colors ──────────────────────────────────────────────────────────
const TAG_COLORS = {
  academic:    { bg: '#ECFDF5', text: '#065F46' },
  scholarship: { bg: '#F5F3FF', text: '#5B21B6' },
  holiday:     { bg: '#FEF3C7', text: '#B45309' },
  general:     { bg: '#EEF3FD', text: '#3D6EE8' },
};

// ── Icons ─────────────────────────────────────────────────────────────────────
const BackIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M15 18l-6-6 6-6" stroke={COLORS.white} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CalendarIcon = ({ color = COLORS.primary }) => (
  <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
    <Path d="M3 9h18M7 2v5M17 2v5M6 4h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const FileIcon = ({ color = COLORS.primary }) => (
  <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
    <Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M14 2v6h6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const LinkIcon = ({ color = COLORS.primary }) => (
  <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
    <Path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
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
export default function NoticeDetailScreen({ navigation, route }) {
  const notificationData = route?.params?.notificationData;

  if (!notificationData) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} translucent={false} />
        <View style={styles.topbar}>
          <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
            <BackIcon />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Notice not available</Text>
        </View>
      </SafeAreaView>
    );
  }

  const title = notificationData.title || 'Notice';
  const description = notificationData.description || 'No description available.';
  const category = (notificationData.category || 'general').toLowerCase();
  const tagColor = TAG_COLORS[category] || TAG_COLORS.general;
  const fileUrl = notificationData.fileUrl;
  const fileName = notificationData.fileName || 'Notice Document';

  const handleOpenFile = async () => {
    if (fileUrl) {
      try {
        const canOpen = await Linking.canOpenURL(fileUrl);
        if (canOpen) {
          await Linking.openURL(fileUrl);
        } else {
          alert('Cannot open this file. Please try a different method.');
        }
      } catch (error) {
        console.error('Error opening file:', error);
        alert('Error opening file');
      }
    }
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
          <View style={[styles.tag, { backgroundColor: tagColor.bg }]}>
            <Text style={[styles.tagText, { color: tagColor.text }]}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </Text>
          </View>
          <Text style={styles.heroTitle}>{title}</Text>
        </View>

        {/* ── Description ── */}
        <SectionCard icon={<FileIcon />} title="NOTICE">
          <View style={styles.descBox}>
            <Text style={styles.descText}>{description}</Text>
          </View>
        </SectionCard>

        {/* ── Attachment ── */}
        {fileUrl && (
          <SectionCard icon={<FileIcon />} title="ATTACHMENT">
            <TouchableOpacity 
              style={styles.attachmentBtn}
              onPress={handleOpenFile}
            >
              <FileIcon color={COLORS.blue} />
              <View style={styles.attachmentText}>
                <Text style={styles.attachmentName}>{fileName}</Text>
                <Text style={styles.attachmentSize}>Tap to view</Text>
              </View>
              <LinkIcon color={COLORS.blue} />
            </TouchableOpacity>
          </SectionCard>
        )}

        <View style={{ height: 24 }} />
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

  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  errorText: {
    fontSize: 16,
    color: COLORS.textMuted,
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
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 12,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.white,
    lineHeight: 28,
    paddingRight: 10,
  },

  // Scroll
  scroll: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingTop: 12,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },

  // Section Card
  sectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: COLORS.primaryLight,
  },
  sectionHeaderTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 8,
  },
  sectionBody: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  // Description
  descBox: {
    paddingVertical: 4,
  },
  descText: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textPrimary,
  },

  // Attachment
  attachmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 6,
    marginVertical: 4,
  },
  attachmentText: {
    flex: 1,
    marginHorizontal: 12,
  },
  attachmentName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  attachmentSize: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
});
