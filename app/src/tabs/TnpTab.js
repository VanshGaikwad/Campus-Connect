import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Image,
  RefreshControl,
  Modal,
  Pressable,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import { collection, onSnapshot } from 'firebase/firestore';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Skeleton from '../components/Skeleton';
import { db } from '../api/firebase/firebaseConfig';
import { parseFlexibleDate, dayStamp } from '../utils/dateParser';

// ── Monochromatic SVG Icons ───────────────────────────────────────────────────
const BellIcon = ({ size = 18, color = '#3D6EE8' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M13.73 21a2 2 0 0 1-3.46 0"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const SearchIcon = ({ size = 15, color = '#BBBBBB' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth={1.8} />
    <Path
      d="M21 21l-4-4"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
    />
  </Svg>
);

// ── Color tokens ──────────────────────────────────────────────────────────────
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

const parseDriveDate = (rawDate) => {
  return parseFlexibleDate(rawDate);
};

const formatDriveDate = (dateObj, fallback) => {
  if (!dateObj) return fallback || 'Date TBA';
  return dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const normalizeSkills = (skills, skillsRequired) => {
  if (Array.isArray(skills) && skills.length > 0) {
    return skills.join(', ');
  }
  if (Array.isArray(skillsRequired) && skillsRequired.length > 0) {
    return skillsRequired.join(', ');
  }
  return skillsRequired || skills || 'Not specified';
};

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic', 'heif'];

const getFileExtension = (value = '') => {
  const clean = String(value).split('?')[0].split('#')[0];
  const last = clean.split('.').pop();
  return last ? last.toLowerCase() : '';
};

const isImageFile = (url = '', fileName = '') => {
  const extFromName = getFileExtension(fileName);
  const extFromUrl = getFileExtension(url);
  return IMAGE_EXTENSIONS.includes(extFromName) || IMAGE_EXTENSIONS.includes(extFromUrl);
};

const isPdfFile = (url = '', fileName = '') => {
  const ext = getFileExtension(fileName) || getFileExtension(url);
  return ext === 'pdf';
};

const getFileChipText = (url = '', fileName = '') => {
  const ext = getFileExtension(fileName) || getFileExtension(url);
  if (!ext) return 'FILE';
  return ext.toUpperCase();
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function TnpTab({ navigation }) {
  const [search, setSearch] = useState('');
  const [todayCompanies, setTodayCompanies] = useState([]);
  const [upcomingCompanies, setUpcomingCompanies] = useState([]);
  const [visitedCompanies, setVisitedCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [previewFile, setPreviewFile] = useState({
    url: '',
    fileName: '',
    isImage: false,
  });
  const [isDownloading, setIsDownloading] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'placement_drives'),
      (snap) => {
        const today = new Date();
        const todayKey = dayStamp(today);

        const drives = snap.docs
          .map((doc) => {
            const data = doc.data();
            const dateObj = parseDriveDate(data.date || data.createdAt || data.timestamp);
            const offer = data.offer || data.lpa || 'N/A';
            const normalizedOffer = typeof offer === 'string' && offer.toLowerCase().includes('lpa') ? offer : `${offer} LPA`;
            return {
              id: doc.id,
              name: data.company || data.companyName || 'Unnamed company',
              service: data.role || 'Campus Drive',
              imageUrl: data.imageUrl || '',
              imageName: data.imageName || '',
              package: normalizedOffer,
              lpa: normalizedOffer,
              eligibility: data.eligibility || data.criteria || 'Eligibility will be updated soon',
              skills: normalizeSkills(data.skills, data.skillsRequired),
              skillsRequired: normalizeSkills(data.skills, data.skillsRequired),
              reportingTime: data.reportingTime || 'TBA',
              venue: data.venue || 'TBA',
              date: formatDriveDate(dateObj, data.date),
              totalHired: data.totalHired != null ? String(data.totalHired) : 'N/A',
              registrationLink: data.registrationLink || data.regLink || '',
              dateObj,
            };
          })
          .sort((a, b) => {
            const aTime = a.dateObj ? a.dateObj.getTime() : Number.MAX_SAFE_INTEGER;
            const bTime = b.dateObj ? b.dateObj.getTime() : Number.MAX_SAFE_INTEGER;
            return aTime - bTime;
          });

        const todayDrives = drives.filter((drive) => drive.dateObj && dayStamp(drive.dateObj) === todayKey);
        const upcoming = drives.filter((drive) => !drive.dateObj || dayStamp(drive.dateObj) > todayKey);
        const visited = drives
          .filter((drive) => drive.dateObj && dayStamp(drive.dateObj) < todayKey)
          .sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());

        setTodayCompanies(todayDrives);
        setUpcomingCompanies(upcoming.slice(0, 10));
        setVisitedCompanies(visited.slice(0, 2));
        setLoading(false);
      },
      (error) => {
        console.error('TnpTab fetch error:', error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const normalizedSearch = search.trim().toLowerCase();

  const filteredUpcoming = normalizedSearch
    ? upcomingCompanies.filter((item) => {
        const haystack = `${item.name} ${item.service} ${item.eligibility} ${item.skills}`.toLowerCase();
        return haystack.includes(normalizedSearch);
      })
    : upcomingCompanies;

  const filteredVisited = normalizedSearch
    ? visitedCompanies.filter((item) => {
        const haystack = `${item.name} ${item.service} ${item.eligibility} ${item.skills}`.toLowerCase();
        return haystack.includes(normalizedSearch);
      })
    : visitedCompanies;

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 500);
  }, []);

  const openFilePreview = useCallback((url, fileName = '') => {
    if (!url) return;
    setPreviewFile({
      url,
      fileName,
      isImage: isImageFile(url, fileName),
    });
    setIsPreviewVisible(true);
  }, []);

  const closeImagePreview = useCallback(() => {
    setIsPreviewVisible(false);
    setPreviewFile({ url: '', fileName: '', isImage: false });
  }, []);

  const handleDownloadFile = useCallback(async () => {
    if (!previewFile.url) return;
    try {
      setIsDownloading(true);
      const ext = getFileExtension(previewFile.fileName) || getFileExtension(previewFile.url) || 'file';
      const baseName = previewFile.fileName || `tnp_file_${Date.now()}.${ext}`;
      const safeName = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const localUri = `${FileSystem.documentDirectory}${safeName}`;

      const result = await FileSystem.downloadAsync(previewFile.url, localUri);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri);
      } else {
        Alert.alert('Downloaded', `Saved to: ${result.uri}`);
      }
    } catch (error) {
      console.warn('Failed to download file:', error);
      Alert.alert('Download Failed', 'Unable to download this file right now.');
    } finally {
      setIsDownloading(false);
    }
  }, [previewFile]);

  const handleCompanyFilePress = useCallback(
    async (company) => {
      if (!company?.imageUrl) return;
      openFilePreview(company.imageUrl, company.imageName || '');
    },
    [openFilePreview],
  );

  const handleOpenOutside = useCallback(async () => {
    if (!previewFile.url) return;
    try {
      const canOpen = await Linking.canOpenURL(previewFile.url);
      if (canOpen) {
        await Linking.openURL(previewFile.url);
      } else {
        Alert.alert('Cannot Open File', 'This file cannot be opened on this device.');
      }
    } catch (error) {
      Alert.alert('Open Failed', 'Unable to open this file right now.');
    }
  }, [previewFile.url]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.white}
        translucent={false}
      />

      {/* ── Header ── */}
      <View style={styles.topbar}>
        <View>
          <Text style={styles.topbarTitle}>T&P Hub</Text>
          {/* <Text style={styles.topbarSub}>PICT Campus Connect</Text> */}
        </View>
        <Image
          source={require('../../assets/pict logo.png')}
          style={{ width: 40, height: 40, resizeMode: 'contain' }}
        />
      </View>

      {/* ── Search ── */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <SearchIcon size={15} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search companies, roles..."
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
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
        {/* ── Today's Company ── */}
        <Text style={styles.sectionTitle}>Today's Company</Text>
        {loading ? (
          <View style={styles.todayCard}>
            <View style={styles.todayTop}>
              <View style={styles.todayInfo}>
                <Skeleton width={150} height={22} style={{ marginBottom: 6 }} />
                <Skeleton width={100} height={16} />
              </View>
              <Skeleton width={68} height={68} borderRadius={12} />
            </View>
            <View style={styles.pillRow}>
              <Skeleton width={120} height={36} borderRadius={10} />
              <Skeleton width={100} height={36} borderRadius={10} />
            </View>
            <View style={styles.metaList}>
              <Skeleton width="90%" height={16} />
              <Skeleton width="80%" height={16} />
              <Skeleton width="70%" height={16} />
            </View>
          </View>
        ) : todayCompanies.length > 0 ? (
          todayCompanies.map((company) => (
            <View key={company.id} style={styles.todayCard}>
              <View style={styles.todayTop}>
                <View style={styles.todayInfo}>
                  <Text style={styles.coName}>{company.name}</Text>
                  <Text style={styles.coSub}>{company.service}</Text>
                </View>
                <View style={styles.photoBox}>
                  {company.imageUrl ? (
                    <TouchableOpacity
                      style={styles.photoTouch}
                      onPress={() => handleCompanyFilePress(company)}
                      activeOpacity={0.9}
                    >
                      {isImageFile(company.imageUrl, company.imageName) ? (
                        <Image
                          source={{ uri: company.imageUrl }}
                          style={styles.photoImage}
                        />
                      ) : (
                        <View style={styles.fileChipWrap}>
                          <Text style={styles.fileChipText}>{getFileChipText(company.imageUrl, company.imageName)}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.photoText}>Photo</Text>
                  )}
                </View>
              </View>

              <View style={styles.pillRow}>
                <View style={styles.pillBlue}>
                  <Text style={styles.pillBlueText}>Package (CTC)</Text>
                  <Text style={styles.pillBlueText}>{company.package}</Text>
                </View>
                <View style={styles.pillOutline}>
                  <Text style={styles.pillOutlineText}>{company.eligibility}</Text>
                </View>
              </View>

              <View style={styles.metaList}>
                <Text style={styles.metaText}>
                  <Text style={styles.metaBold}>Skills: </Text>{company.skills}
                </Text>
                <Text style={styles.metaText}>
                  Reporting Time: <Text style={styles.metaBold}>{company.reportingTime}</Text>
                </Text>
                <Text style={styles.metaText}>
                  Venue: <Text style={styles.metaBold}>{company.venue}</Text>
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => navigation.navigate('TodayCompanyScreen', { company })}
              >
                <Text style={styles.viewLink}>View Details →</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No companies scheduled for today.</Text>
        )}

        {/* ── Upcoming Companies ── */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Upcoming Company</Text>
        {loading ? (
          [1, 2].map(key => (
            <View key={key} style={styles.upCard}>
               <View style={styles.upRow}>
                 <View>
                   <Skeleton width={120} height={20} style={{ marginBottom: 6 }} />
                   <Skeleton width={80} height={14} />
                 </View>
                 <Skeleton width={70} height={20} />
               </View>
               <View style={[styles.upBottom, { marginTop: 16 }]}>
                 <Skeleton width={100} height={14} />
               </View>
            </View>
          ))
        ) : filteredUpcoming.length > 0 ? (
          filteredUpcoming.map((item) => (
            <View key={item.id} style={styles.upCard}>
              <View style={styles.upRow}>
                <View style={styles.upLeft}>
                  {item.imageUrl ? (
                    <TouchableOpacity
                      onPress={() => handleCompanyFilePress(item)}
                      activeOpacity={0.9}
                    >
                      {isImageFile(item.imageUrl, item.imageName) ? (
                        <Image source={{ uri: item.imageUrl }} style={styles.upThumb} />
                      ) : (
                        <View style={styles.upFileThumb}>
                          <Text style={styles.upFileText}>{getFileChipText(item.imageUrl, item.imageName)}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ) : null}
                  <View style={styles.upTextWrap}>
                  <Text style={styles.upName}>{item.name}</Text>
                  <Text style={styles.upSub}>{item.service}</Text>
                  </View>
                </View>
                <Text style={styles.lpa}>{item.lpa}</Text>
              </View>
              <View style={styles.upBottom}>
                <Text style={styles.upDate}>{item.date}</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('UpcomingCompanyScreen', { company: item })}
                >
                  <Text style={styles.upLink}>View Details →</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No upcoming drives found.</Text>
        )}

        {/* ── Company Visited ── */}
        <View style={styles.visitedHeader}>
          <Text style={[styles.sectionTitle, { marginTop: 20, marginBottom: 0 }]}>
            Company Visited
          </Text>
          <TouchableOpacity style={{ marginTop: 20 }}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.visitedGrid}>
          {loading ? (
            [1, 2].map(key => (
              <View key={key} style={styles.vCard}>
                <Skeleton width="80%" height={16} style={{ marginBottom: 4 }} />
                <Skeleton width="60%" height={16} style={{ marginBottom: 4 }} />
                <Skeleton width="70%" height={14} />
              </View>
            ))
          ) : filteredVisited.length > 0 ? (
            filteredVisited.map((item) => (
              <View key={item.id} style={styles.vCard}>
                <Text style={styles.vName}>{item.name}</Text>
                <Text style={styles.vLpa}>{item.lpa}</Text>
                <Text style={styles.vHired}>Total Hired: {item.totalHired}</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('VisitedCompanyScreen', { company: item })}
                >
                  <Text style={styles.vLink}>View Details →</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No visited drives found.</Text>
          )}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      <Modal
        visible={isPreviewVisible}
        transparent
        animationType="fade"
        onRequestClose={closeImagePreview}
      >
        <Pressable style={styles.previewBackdrop} onPress={closeImagePreview}>
          <Pressable style={styles.previewContent} onPress={() => {}}>
            <TouchableOpacity style={styles.previewCloseBtn} onPress={closeImagePreview} activeOpacity={0.8}>
              <Text style={styles.previewCloseText}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.previewDownloadBtn}
              onPress={handleDownloadFile}
              activeOpacity={0.8}
              disabled={isDownloading}
            >
              <Text style={styles.previewDownloadText}>{isDownloading ? 'Downloading...' : 'Download'}</Text>
            </TouchableOpacity>

            {previewFile.url ? (
              previewFile.isImage ? (
                <Image source={{ uri: previewFile.url }} style={styles.previewImage} resizeMode="contain" />
              ) : (
                <View style={styles.previewFallbackWrap}>
                  <Text style={styles.previewFallbackTitle}>{previewFile.fileName || 'File preview'}</Text>
                  <Text style={styles.previewFallbackText}>This file type is not previewed inside the app yet.</Text>
                  <Text style={styles.previewFallbackText}>You can open it outside the app or download it.</Text>
                  <TouchableOpacity style={styles.previewOpenBtn} onPress={handleOpenOutside} activeOpacity={0.85}>
                    <Text style={styles.previewOpenBtnText}>Open File</Text>
                  </TouchableOpacity>
                </View>
              )
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
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

  // Search
  searchWrap: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  searchBox: {
    backgroundColor: COLORS.background,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    padding: 0,
  },

  // Scroll
  scroll: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 14,
  },

  // Section title
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },

  // Today card
  todayCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  todayTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  todayInfo: {
    flex: 1,
  },
  coName: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  coSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  photoBox: {
    width: 68,
    height: 68,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  photoTouch: {
    width: '100%',
    height: '100%',
  },
  fileChipWrap: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileChipText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '800',
  },
  pillRow: {
    flexDirection: 'row',
    marginTop: 16,
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
  },
  pillBlue: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  pillBlueText: {
    fontSize: 13,
    color: COLORS.white,
    fontWeight: '600',
    lineHeight: 19,
  },
  pillOutline: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  pillOutlineText: {
    fontSize: 13,
    color: '#555555',
    fontWeight: '500',
  },
  metaList: {
    marginTop: 16,
    gap: 7,
  },
  metaText: {
    fontSize: 14,
    color: '#444444',
    lineHeight: 21,
  },
  metaBold: {
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  viewLink: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
    textAlign: 'right',
    marginTop: 14,
  },

  // Upcoming — individual cards with gap
  upCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  upRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  upLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 6,
  },
  upTextWrap: {
    flex: 1,
  },
  upThumb: {
    width: 38,
    height: 38,
    borderRadius: 10,
    marginRight: 10,
  },
  upFileThumb: {
    width: 38,
    height: 38,
    borderRadius: 10,
    marginRight: 10,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  upFileText: {
    fontSize: 9,
    color: COLORS.primary,
    fontWeight: '800',
  },
  upName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  upSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  lpa: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  upBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  upDate: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  upLink: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Visited
  visitedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  visitedGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  vCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  vName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  vLpa: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '700',
    marginTop: 4,
  },
  vHired: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  vLink: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 12,
  },
  viewAll: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  previewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  previewContent: {
    width: '100%',
    height: '86%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewCloseBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  previewCloseText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  previewDownloadBtn: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  previewDownloadText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  previewFallbackWrap: {
    width: '100%',
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  previewFallbackTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  previewFallbackText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 14,
  },
  previewOpenBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  previewOpenBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
});