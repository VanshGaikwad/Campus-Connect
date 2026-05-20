import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../../api/firebase/firebaseConfig';
import { sendPasswordResetEmail } from 'firebase/auth';
import Svg, { Path, Circle, Polyline, Rect, Line } from 'react-native-svg';

// ── Colors ────────────────────────────────────────────────────────────────────
const COLORS = {
  primary:       '#3D6EE8',
  primaryLight:  '#EEF3FD',
  background:    '#FFFFFF',
  border:        '#E0E7F5',
  divider:       '#F0F4FF',
  textPrimary:   '#111111',
  textSecondary: '#888888',
  textMuted:     '#BBBBBB',
  white:         '#FFFFFF',
  green:         '#059669',
  greenLight:    '#F0FDF4',
  red:           '#EF4444',
};

// ── Icons ─────────────────────────────────────────────────────────────────────
const BackIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M15 18l-6-6 6-6" stroke="#555" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IdIcon = () => (
  <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="4" width="18" height="18" rx="2" stroke={COLORS.primary} strokeWidth={2} strokeLinecap="round" />
    <Path d="M16 2v4M8 2v4M3 10h18" stroke={COLORS.primary} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const UserIcon = () => (
  <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
    <Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke={COLORS.primary} strokeWidth={2} strokeLinecap="round" />
    <Circle cx="12" cy="7" r="4" stroke={COLORS.primary} strokeWidth={2} />
  </Svg>
);

const RoleIcon = () => (
  <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
    <Path d="M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" stroke={COLORS.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" stroke={COLORS.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const DeptIcon = () => (
  <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
    <Path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke={COLORS.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Polyline points="9 22 9 12 15 12 15 22" stroke={COLORS.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const MailIcon = () => (
  <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
    <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke={COLORS.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Polyline points="22 6 12 13 2 6" stroke={COLORS.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const PhoneIcon = () => (
  <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
    <Path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .99h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" stroke={COLORS.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const BookIcon = () => (
  <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
    <Path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" stroke={COLORS.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" stroke={COLORS.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const RefreshIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path d="M21.5 2v6h-6M21.34 15.57a10 10 0 11-.57-8.38" stroke={COLORS.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const LogoutIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke={COLORS.red} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Polyline points="16 17 21 12 16 7" stroke={COLORS.red} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="21" y1="12" x2="9" y2="12" stroke={COLORS.red} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

// ── Info Row ──────────────────────────────────────────────────────────────────
const InfoRow = ({ icon, value, isLast = false }) => (
  <View style={[styles.infoRow, isLast && { borderBottomWidth: 0 }]}>
    <View style={styles.infoIcon}>{icon}</View>
    <Text style={styles.infoText}>{value || '—'}</Text>
  </View>
);

// ── Component ─────────────────────────────────────────────────────────────────
export default function FacultyProfileScreen({ navigation }) {
  const { profile, loading, logout } = useAuth();
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const uid = auth.currentUser?.uid;
        if (!uid) return;
        const classSnap = await getDocs(
          query(collection(db, 'faculty_classes'), where('facultyId', '==', uid))
        );
        setClasses(classSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error('FacultyProfile classes fetch error:', e);
      }
    };
    fetchClasses();
  }, []);

  const handleChangePassword = async () => {
    const email = auth.currentUser?.email;
    if (!email) return;
    Alert.alert(
      'Change Password',
      `A password reset link will be sent to ${email}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            try {
              await sendPasswordResetEmail(auth, email);
              Alert.alert('Email Sent', 'Check your email to reset your password.');
            } catch (e) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (e) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const initials = profile?.name
    ? profile.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
    : 'FA';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} translucent={false} />

      {/* ── Topbar ── */}
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
          <BackIcon />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.topbarTitle}>My Profile</Text>
        <View style={styles.ph} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Avatar + Name ── */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarRing}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.avatarName}>{profile?.name || 'Faculty'}</Text>
        </View>

        <View style={styles.divider} />

        {/* ── Personal Info ── */}
        <View style={styles.infoList}>
          <InfoRow icon={<IdIcon />}    value={profile?.pictId || profile?.facultyId} />
          <InfoRow icon={<UserIcon />}  value={profile?.name} />
          <InfoRow icon={<RoleIcon />}  value="Faculty" />
          <InfoRow icon={<DeptIcon />}  value={profile?.dept ? `${profile.dept} Engineering` : 'Computer Engineering'} />
          <InfoRow icon={<MailIcon />}  value={profile?.email} />
          <InfoRow icon={<PhoneIcon />} value={profile?.contact || profile?.phone} isLast />
        </View>

        <View style={styles.divider} />

        {/* ── Classes Assigned ── */}
        <View style={styles.sectionLabelWrap}>
          <Text style={styles.sectionLabel}>CLASSES ASSIGNED</Text>
        </View>

        <View style={styles.infoList}>
          {classes.length > 0 ? (
            classes.map((cls, index) => (
              <View
                key={cls.id}
                style={[styles.classRow, index === classes.length - 1 && { borderBottomWidth: 0 }]}
              >
                <View style={styles.infoIcon}><BookIcon /></View>
                <View style={styles.classInfo}>
                  <Text style={styles.classSubject}>{cls.subName}</Text>
                  <Text style={styles.classMeta}>
                    {cls.className} · Div {cls.div} · {cls.time} · {cls.venue}
                  </Text>
                  <View style={styles.tagRow}>
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>{cls.subName}</Text>
                    </View>
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>Div {cls.div}</Text>
                    </View>
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>Batch {cls.batch}</Text>
                    </View>
                    <TouchableOpacity style={styles.syllabusBtn}>
                      <Text style={styles.syllabusBtnText}>View Syllabus →</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          ) : (
            // ── Fallback mock if no classes in Firebase yet ──
            [
              { id: '1', subName: 'Computer Networks', className: 'TE-COMP', div: 'A', batch: '1', time: 'Mon 09:00 AM', venue: 'Room A3-207' },
              { id: '2', subName: 'Data Structures',   className: 'SE-COMP', div: 'B', batch: '2', time: 'Tue 11:00 AM', venue: 'Room A2-101' },
            ].map((cls, index, arr) => (
              <View
                key={cls.id}
                style={[styles.classRow, index === arr.length - 1 && { borderBottomWidth: 0 }]}
              >
                <View style={styles.infoIcon}><BookIcon /></View>
                <View style={styles.classInfo}>
                  <Text style={styles.classSubject}>{cls.subName}</Text>
                  <Text style={styles.classMeta}>
                    {cls.className} · Div {cls.div} · {cls.time} · {cls.venue}
                  </Text>
                  <View style={styles.tagRow}>
                    <View style={styles.tag}><Text style={styles.tagText}>{cls.subName}</Text></View>
                    <View style={styles.tag}><Text style={styles.tagText}>Div {cls.div}</Text></View>
                    <View style={styles.tag}><Text style={styles.tagText}>Batch {cls.batch}</Text></View>
                    <TouchableOpacity style={styles.syllabusBtn}>
                      <Text style={styles.syllabusBtnText}>View Syllabus →</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.divider} />

        {/* ── Actions ── */}
        <TouchableOpacity style={styles.actionBtn} onPress={handleChangePassword} activeOpacity={0.7}>
          <RefreshIcon />
          <Text style={styles.changePwdText}>Change Password</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.actionBtn} onPress={handleLogout} activeOpacity={0.7}>
          <LogoutIcon />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: COLORS.background },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },

  topbar: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn:     { flexDirection: 'row', alignItems: 'center' },
  backText:    { fontSize: 14, fontWeight: '500', color: '#555', marginLeft: 4 },
  topbarTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  ph:          { width: 50 },

  scroll:        { flex: 1, backgroundColor: COLORS.white },
  scrollContent: { paddingBottom: 20 },

  // Avatar
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  avatarRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 3,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: { fontSize: 24, fontWeight: '800', color: COLORS.primary },
  avatarName: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },

  divider: { height: 1, backgroundColor: COLORS.border },

  // Info list
  infoList:    { paddingHorizontal: 16 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textPrimary,
    lineHeight: 20,
  },

  // Section label
  sectionLabelWrap: {
    backgroundColor: COLORS.primaryLight,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },

  // Class row
  classRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  classInfo:    { flex: 1 },
  classSubject: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  classMeta:    { fontSize: 11, color: COLORS.textSecondary, marginTop: 3, lineHeight: 16 },
  tagRow:       { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  tag: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText:      { fontSize: 10, fontWeight: '600', color: COLORS.primary },
  syllabusBtn: {
    backgroundColor: COLORS.greenLight,
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  syllabusBtnText: { fontSize: 10, fontWeight: '600', color: COLORS.green },

  // Action buttons
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 8,
  },
  changePwdText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  logoutText:    { fontSize: 14, fontWeight: '600', color: COLORS.red },
});