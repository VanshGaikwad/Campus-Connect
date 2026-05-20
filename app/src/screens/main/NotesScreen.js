import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path, Polyline, Line } from 'react-native-svg';
import * as FileSystem from 'expo-file-system/legacy';
// expo-sharing requires a native module — import lazily to avoid crash
// if the current dev build doesn't include it yet.
let Sharing = null;
try {
  Sharing = require('expo-sharing');
} catch (e) {
  console.warn('[NotesScreen] expo-sharing native module not available. Sharing will be disabled.');
}

// ── Colors ────────────────────────────────────────────────────────────────────
const COLORS = {
  primary:      '#3D6EE8',
  primaryLight: '#EEF3FD',
  background:   '#F5F6FA',
  card:         '#FFFFFF',
  border:       '#E0E7F5',
  textPrimary:  '#111111',
  textSecondary:'#888888',
  textMuted:    '#C8D0E0',
  white:        '#FFFFFF',
  bulletDark:   '#1a1a2e',
  green:        '#059669',
  greenLight:   '#F0FDF4',
  red:          '#EF4444',
  redLight:     '#FEF2F2',
  purple:       '#7C3AED',
  purpleLight:  '#F5F3FF',
};

const STORAGE_KEY = '@campus_connect_notes';

// ── Icons ─────────────────────────────────────────────────────────────────────
const EditIcon   = () => <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"><Path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke={COLORS.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/><Path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke={COLORS.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/></Svg>;
const SaveIcon   = () => <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"><Path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v14a2 2 0 01-2 2z" stroke={COLORS.green} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/><Polyline points="17 21 17 13 7 13 7 21" stroke={COLORS.green} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/><Polyline points="7 3 7 8 15 8" stroke={COLORS.green} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/></Svg>;
const DeleteIcon = () => <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"><Polyline points="3 6 5 6 21 6" stroke={COLORS.red} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/><Path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke={COLORS.red} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/><Path d="M10 11v6M14 11v6" stroke={COLORS.red} strokeWidth={2} strokeLinecap="round"/><Path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" stroke={COLORS.red} strokeWidth={2} strokeLinecap="round"/></Svg>;
const XIcon = () => <Svg width={14} height={14} viewBox="0 0 24 24" fill="none"><Path d="M18 6L6 18M6 6l12 12" stroke={COLORS.red} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/></Svg>;
const DownloadIcon = () => <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"><Path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke={COLORS.purple} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/><Polyline points="7 10 12 15 17 10" stroke={COLORS.purple} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/><Line x1="12" y1="15" x2="12" y2="3" stroke={COLORS.purple} strokeWidth={2} strokeLinecap="round"/></Svg>;
const BackIcon   = () => <Svg width={15} height={15} viewBox="0 0 24 24" fill="none"><Path d="M15 18l-6-6 6-6" stroke={COLORS.primary} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/></Svg>;
const PlusIcon   = () => <Svg width={14} height={14} viewBox="0 0 24 24" fill="none"><Line x1="12" y1="5" x2="12" y2="19" stroke={COLORS.primary} strokeWidth={2.5} strokeLinecap="round"/><Line x1="5" y1="12" x2="19" y2="12" stroke={COLORS.primary} strokeWidth={2.5} strokeLinecap="round"/></Svg>;

// ── Component ─────────────────────────────────────────────────────────────────
export default function NotesScreen({ navigation }) {
  const [notes, setNotes] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  // ── Load notes from AsyncStorage on mount ─────────────────────────────────
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) setNotes(JSON.parse(stored));
    } catch (e) {
      console.error('Load notes error:', e);
    } finally {
      setHasLoaded(true);
    }
  };

  // ── Auto-persist every time notes change (after initial load) ────────────
  useEffect(() => {
    if (!hasLoaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notes)).catch(e =>
      console.error('Auto-save error:', e)
    );
  }, [notes, hasLoaded]);

  // ── Save notes to AsyncStorage ────────────────────────────────────────────
  const persistNotes = async (updatedNotes) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedNotes));
    } catch (e) {
      console.error('Save notes error:', e);
    }
  };

  // ── Add a new note ────────────────────────────────────────────────────────
  const handleAddNote = () => {
    if (!newNoteText.trim()) return;
    const updated = [
      ...notes,
      { id: Date.now().toString(), text: newNoteText.trim() },
    ];
    setNotes(updated);
    setNewNoteText('');
    setModalVisible(false);
  };

  // ── Edit a note text ──────────────────────────────────────────────────────
  const handleEditNote = (id, text) => {
    const updated = notes.map(n => n.id === id ? { ...n, text } : n);
    setNotes(updated);
  };

  // ── Delete individual note ────────────────────────────────────────────────
  const handleDeleteNote = (id) => {
    const updated = notes.filter(n => n.id !== id);
    setNotes(updated);
  };

  // ── Save — locks editing, notes already auto-saved via useEffect ─────────
  const handleSave = () => {
    setIsEditing(false);
    Alert.alert('Saved', 'Your notes have been saved to the app.');
  };

  // ── Delete all notes ──────────────────────────────────────────────────────
  const handleDelete = () => {
    Alert.alert(
      'Delete All Notes',
      'This will permanently delete all your notes. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            setNotes([]);
            await AsyncStorage.removeItem(STORAGE_KEY);
          },
        },
      ]
    );
  };

  // ── Download — saves as .txt and shares ──────────────────────────────────
  const handleDownload = async () => {
    if (isDownloading) return;
    if (notes.length === 0) {
      Alert.alert('No Notes', 'Add some notes before downloading.');
      return;
    }
    
    setIsDownloading(true);
    try {
      const content = notes.map((n) => `• ${n.text}`).join('\n');
      const fileName = `CampusConnect_Notes_${Date.now()}.txt`;
      const fileUri = FileSystem.documentDirectory + fileName;
      await FileSystem.writeAsStringAsync(fileUri, content);
      const canShare = Sharing ? await Sharing.isAvailableAsync() : false;
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/plain',
          dialogTitle: 'Save Notes',
          UTI: 'public.plain-text',
        });
      } else {
        Alert.alert('Saved', `File saved to app documents:\n${fileName}`);
      }
    } catch (e) {
      if (e.message && e.message.includes('Another share request is being processed')) {
        // User tapped multiple times, ignore or wait
      } else {
        Alert.alert('Error', 'Could not download notes. Please try again.');
        console.error('Download error:', e);
      }
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} translucent={false} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Outer blue pad ── */}
        <View style={styles.outerPad}>

          {/* ── NOTES header pill ── */}
          <View style={styles.notesHeader}>
            <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
              <BackIcon />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            <Text style={styles.notesTitle}>NOTES</Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setModalVisible(true)}
            >
              <PlusIcon />
            </TouchableOpacity>
          </View>

          {/* ── White inner notepad ── */}
          <View style={styles.innerPad}>
            {notes.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No notes yet.</Text>
                <Text style={styles.emptySubText}>Tap + to add your first note.</Text>
              </View>
            ) : (
              notes.map((note, index) => (
                <View
                  key={note.id}
                  style={[
                    styles.noteItem,
                    index === notes.length - 1 && { borderBottomWidth: 0, marginBottom: 0, paddingBottom: 0 },
                  ]}
                >
                  <View style={styles.bullet} />
                  {isEditing ? (
                    <>
                      <TextInput
                        style={styles.noteInput}
                        value={note.text}
                        onChangeText={(t) => handleEditNote(note.id, t)}
                        multiline
                        autoFocus={index === 0}
                      />
                      <TouchableOpacity
                        style={styles.noteDeleteBtn}
                        onPress={() => handleDeleteNote(note.id)}
                        activeOpacity={0.7}
                      >
                        <XIcon />
                      </TouchableOpacity>
                    </>
                  ) : (
                    <Text style={styles.noteText}>{note.text}</Text>
                  )}
                </View>
              ))
            )}
          </View>

          {/* ── Save location ── */}
          <Text style={styles.saveLoc}>
            Downloaded to:{' '}
            <Text style={styles.saveLocStrong}>Downloads / CampusConnect / Notes /</Text>
          </Text>

        </View>

        {/* ── Action bar ── */}
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={[styles.actBtn, styles.actEdit]}
            onPress={() => setIsEditing(true)}
            activeOpacity={0.8}
          >
            <EditIcon />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actBtn, styles.actSave]}
            onPress={handleSave}
            activeOpacity={0.8}
          >
            <SaveIcon />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actBtn, styles.actDelete]}
            onPress={handleDelete}
            activeOpacity={0.8}
          >
            <DeleteIcon />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actBtn, styles.actDownload]}
            onPress={handleDownload}
            activeOpacity={0.8}
          >
            <DownloadIcon />
          </TouchableOpacity>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ── Add Note Modal ── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Note</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Type your note here..."
              placeholderTextColor={COLORS.textMuted}
              value={newNoteText}
              onChangeText={setNewNoteText}
              multiline
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => { setModalVisible(false); setNewNoteText(''); }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalAdd} onPress={handleAddNote}>
                <Text style={styles.modalAddText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: 14 },

  // Outer blue pad
  outerPad: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 12,
    marginBottom: 12,
  },

  // NOTES header pill
  notesHeader: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center' },
  backText: { fontSize: 13, fontWeight: '600', color: COLORS.primary, marginLeft: 3 },
  notesTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.12,
    flex: 1,
    textAlign: 'center',
  },
  addBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // White inner notepad
  innerPad: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    minHeight: 200,
  },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
  emptySubText: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },

  // Note item
  noteItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  bullet: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: COLORS.bulletDark,
    marginRight: 12,
    marginTop: 5,
    flexShrink: 0,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textPrimary,
    lineHeight: 20,
    fontWeight: '400',
  },
  noteInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textPrimary,
    lineHeight: 20,
    padding: 0,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
  },
  noteDeleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.redLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    flexShrink: 0,
  },

  // Save location
  saveLoc: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 14,
  },
  saveLocStrong: { color: COLORS.white, fontWeight: '600' },

  // Action bar
  actionBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  actBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRightWidth: 1,
    borderRightColor: '#F0F4FF',
  },
  actEdit:     { backgroundColor: COLORS.primaryLight },
  actSave:     { backgroundColor: COLORS.greenLight },
  actDelete:   { backgroundColor: COLORS.redLight },
  actDownload: { backgroundColor: COLORS.purpleLight, borderRightWidth: 0 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  modalInput: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 14,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  modalCancel: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  modalCancelText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  modalAdd: {
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
  },
  modalAddText: { fontSize: 13, fontWeight: '700', color: COLORS.white },
});