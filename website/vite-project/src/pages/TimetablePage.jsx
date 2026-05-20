import { useEffect, useMemo, useState } from 'react'
import {
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { db } from '../services/firebase'

const YEARS = ['FE', 'SE', 'TE', 'BE']
const DEPARTMENTS = ['IT', 'CS', 'EN/TC', 'AIDS']
const DEFAULT_SECTIONS = ['I', 'II', 'III', 'IV']
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const BATCH_OPTIONS = ['A', 'B', 'C', 'ALL']
const DEFAULT_TIME_SLOTS = []
const STATIC_LOGO_SRC = '/image/LOGO.png'
const DEPARTMENT_LABELS = {
  IT: 'Information Technology',
  CS: 'Computer Science',
  'EN/TC': 'Electronics and Telecommunication Engineering',
  AIDS: 'Artificial Intelligence and Data Science',
}

const getDefaultExportMeta = (year, department, section) => ({
  instituteName: "SCTR'S Pune Institute of Computer Technology Pune - 43",
  departmentName: DEPARTMENT_LABELS[department] || 'Department',
  academicYear: 'AY 2025-26',
  semester: 'SEM II',
  effectiveFrom: '01/01/2026',
  classLabel: `${year || '-'} ${department || '-'} ${section || '-'}`,
  roomNumbers: 'A3-107, A3-208',
  coordinator: 'Dr. M. A. Gangarde',
})

const DEFAULT_FACULTY_MAPPINGS = [
  {
    rowId: `${Date.now()}-default`,
    theoryCourse: '',
    theoryTeacher: '',
    practicalCourse: '',
    lab: '',
    practicalTeacher: '',
  },
]

const createFacultyMappingRow = (seed = {}) => ({
  rowId: seed.rowId ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  theoryCourse: seed.theoryCourse ?? '',
  theoryTeacher: seed.theoryTeacher ?? '',
  practicalCourse: seed.practicalCourse ?? '',
  lab: seed.lab ?? '',
  practicalTeacher: seed.practicalTeacher ?? '',
})

const normalizeFacultyMappings = (rows) => {
  const source = Array.isArray(rows) && rows.length ? rows : DEFAULT_FACULTY_MAPPINGS
  return source.map((item) => createFacultyMappingRow(item))
}

const serializeFacultyMappings = (rows) =>
  rows
    .map((row) => ({
      theoryCourse: row.theoryCourse.trim(),
      theoryTeacher: row.theoryTeacher.trim(),
      practicalCourse: row.practicalCourse.trim(),
      lab: row.lab.trim(),
      practicalTeacher: row.practicalTeacher.trim(),
    }))
    .filter((row) =>
      row.theoryCourse || row.theoryTeacher || row.practicalCourse || row.lab || row.practicalTeacher,
    )

const cellKey = (day, slotIndex) => `${day}__${slotIndex}`
const timetableDocId = (year, department, section) =>
  `${year || 'NA'}__${department || 'NA'}__${section || 'NA'}`
    .replace(/\//g, '_')
    .replace(/\s+/g, '_')

const createEditorRow = (seed = {}) => ({
  rowId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  type: seed.type === 'practical' ? 'practical' : 'theory',
  subjectName: seed.subjectName ?? '',
  selectedSubject: seed.subjectName ?? '',
  batch: seed.batch ?? 'ALL',
})

const normalizeCellEntries = (value) => {
  if (!value) return []
  const source = Array.isArray(value) ? value : [value]

  return source
    .map((item) => ({
      type: item?.type === 'practical' ? 'practical' : 'theory',
      subjectName: item?.subjectName ?? '',
      batch: item?.batch ?? 'ALL',
      updatedBy: item?.updatedBy ?? '',
      updatedAt: item?.updatedAt ?? '',
    }))
    .filter((item) => item.subjectName.trim())
}

const mergeSubjects = (currentSubjects, newNames) => {
  const nextSubjects = [...currentSubjects]
  const seen = new Set(currentSubjects.map((item) => item.toLowerCase()))

  newNames.forEach((name) => {
    const next = name.trim()
    if (!next) return
    const normalized = next.toLowerCase()
    if (seen.has(normalized)) return
    seen.add(normalized)
    nextSubjects.push(next)
  })

  return nextSubjects.sort((a, b) => a.localeCompare(b))
}

const parseTimeToken = (token) => {
  const match = String(token).trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i)
  if (!match) return null

  const hour = Number(match[1])
  const minute = Number(match[2])
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null

  return {
    hour,
    minute,
    meridiem: match[3]?.toUpperCase() ?? null,
  }
}

const toMinutes = ({ hour, minute, meridiem }) => {
  let normalizedHour = hour

  if (meridiem === 'PM' && normalizedHour < 12) normalizedHour += 12
  if (meridiem === 'AM' && normalizedHour === 12) normalizedHour = 0

  return normalizedHour * 60 + minute
}

const inferStartMeridiem = (start, end) => {
  if (!end?.meridiem) return null

  // Legacy labels like "1:15 - 2:15 PM" should treat start as PM,
  // but "11:45 - 12:00 PM" should treat start as AM.
  if (end.meridiem === 'PM' && end.hour === 12 && start.hour < 12) {
    return 'AM'
  }

  if (end.meridiem === 'AM' && end.hour === 12 && start.hour < 12) {
    return 'PM'
  }

  return end.meridiem
}

const extractStartMinutes = (slotLabel) => {
  if (!slotLabel) return Number.MAX_SAFE_INTEGER

  const [rawStart = '', rawEnd = ''] = String(slotLabel).split('-')
  const parsedStart = parseTimeToken(rawStart)
  if (!parsedStart) return Number.MAX_SAFE_INTEGER

  if (parsedStart.meridiem) {
    return toMinutes(parsedStart)
  }

  const parsedEnd = parseTimeToken(rawEnd)
  const inferredMeridiem = inferStartMeridiem(parsedStart, parsedEnd)

  if (inferredMeridiem) {
    return toMinutes({ ...parsedStart, meridiem: inferredMeridiem })
  }

  // Fallback for ambiguous tokens without AM/PM.
  return parsedStart.hour * 60 + parsedStart.minute
}

const extractTimeValuesFromSlot = (slotLabel) => {
  const [rawStart = '', rawEnd = ''] = String(slotLabel).split('-')
  const parsedStart = parseTimeToken(rawStart)
  const parsedEnd = parseTimeToken(rawEnd)

  let startMeridiem = parsedStart?.meridiem
  let endMeridiem = parsedEnd?.meridiem

  if (!startMeridiem && endMeridiem) {
    startMeridiem = inferStartMeridiem(parsedStart, parsedEnd)
  }

  const startWithMeridiem = parsedStart && startMeridiem ? { ...parsedStart, meridiem: startMeridiem } : parsedStart
  const endWithMeridiem = parsedEnd && endMeridiem ? { ...parsedEnd, meridiem: endMeridiem } : parsedEnd

  let startHour = startWithMeridiem?.hour ?? 0
  let startMinute = startWithMeridiem?.minute ?? 0
  let endHour = endWithMeridiem?.hour ?? 0
  let endMinute = endWithMeridiem?.minute ?? 0

  if (startWithMeridiem?.meridiem === 'PM' && startHour < 12) startHour += 12
  if (startWithMeridiem?.meridiem === 'AM' && startHour === 12) startHour = 0

  if (endWithMeridiem?.meridiem === 'PM' && endHour < 12) endHour += 12
  if (endWithMeridiem?.meridiem === 'AM' && endHour === 12) endHour = 0

  const startTime = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`
  const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`

  return { startTime, endTime }
}

const sortSlotsAndReindexEntries = (slots, sourceEntries) => {
  if (!slots?.length) {
    return {
      sortedSlots: [],
      sortedEntries: {},
      changed: false,
    }
  }

  const indexedSlots = slots.map((slot, oldIndex) => ({
    slot,
    oldIndex,
    startMinutes: extractStartMinutes(slot),
  }))

  const sortedIndexedSlots = [...indexedSlots].sort((a, b) => {
    if (a.startMinutes !== b.startMinutes) {
      return a.startMinutes - b.startMinutes
    }
    return a.oldIndex - b.oldIndex
  })

  const sortedSlots = sortedIndexedSlots.map((item) => item.slot)
  const sortedEntries = {}

  DAYS.forEach((day) => {
    sortedIndexedSlots.forEach((item, newIndex) => {
      const existingValue = sourceEntries[cellKey(day, item.oldIndex)]
      if (existingValue) {
        sortedEntries[cellKey(day, newIndex)] = existingValue
      }
    })
  })

  const changed = sortedIndexedSlots.some((item, newIndex) => item.oldIndex !== newIndex)

  return {
    sortedSlots,
    sortedEntries,
    changed,
  }
}

const formatTimeForDisplay = (value) => {
  if (!value) return ''
  const [hoursRaw, minutes] = value.split(':')
  const hours = Number(hoursRaw)
  if (Number.isNaN(hours) || !minutes) return value

  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${minutes} ${period}`
}

const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })

const loadImageFromBlob = (blob) =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob)
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }

    image.onerror = (error) => {
      URL.revokeObjectURL(objectUrl)
      reject(error)
    }

    image.src = objectUrl
  })

const buildWordSafeSquareLogo = async (blob, size = 96) => {
  const image = await loadImageFromBlob(blob)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const context = canvas.getContext('2d')
  if (!context) {
    return blobToDataUrl(blob)
  }

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, size, size)

  const scale = Math.min(size / image.width, size / image.height)
  const drawWidth = image.width * scale
  const drawHeight = image.height * scale
  const offsetX = (size - drawWidth) / 2
  const offsetY = (size - drawHeight) / 2

  context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight)

  return canvas.toDataURL('image/png')
}

function TimetablePage() {
  const { user } = useAuth()
  const [year, setYear] = useState('')
  const [department, setDepartment] = useState('')
  const [section, setSection] = useState('')
  const [sectionOptions, setSectionOptions] = useState(DEFAULT_SECTIONS)

  const [docRef, setDocRef] = useState(null)
  const [entries, setEntries] = useState({})
  const [timeSlots, setTimeSlots] = useState(DEFAULT_TIME_SLOTS)
  const [subjects, setSubjects] = useState([])
  const [exportMeta, setExportMeta] = useState(getDefaultExportMeta('', '', ''))
  const [facultyMappings, setFacultyMappings] = useState(() => normalizeFacultyMappings([]))
  const [isFacultyMappingDirty, setIsFacultyMappingDirty] = useState(false)
  const [newSubjectName, setNewSubjectName] = useState('')

  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [showExportMenu, setShowExportMenu] = useState(false)
  const [slotStartTime, setSlotStartTime] = useState('')
  const [slotEndTime, setSlotEndTime] = useState('')
  const [editingSlotIndex, setEditingSlotIndex] = useState(-1)
  const [editSlotStartTime, setEditSlotStartTime] = useState('')
  const [editSlotEndTime, setEditSlotEndTime] = useState('')

  useEffect(() => {
    let savedSections = null

    try {
      savedSections = window.localStorage.getItem('timetable-section-options')
    } catch {
      return
    }

    if (!savedSections) return

    try {
      const parsedSections = JSON.parse(savedSections)
      if (Array.isArray(parsedSections) && parsedSections.length) {
        setSectionOptions(parsedSections)
      }
    } catch {
      try {
        window.localStorage.removeItem('timetable-section-options')
      } catch {
        // Ignore storage errors and keep the default section list.
      }
    }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem('timetable-section-options', JSON.stringify(sectionOptions))
    } catch {
      // Ignore storage errors so the timetable page stays usable.
    }
  }, [sectionOptions])

  const [editorState, setEditorState] = useState({
    open: false,
    day: '',
    slotIndex: -1,
    rows: [createEditorRow()],
  })

  const canLoadTimetable = Boolean(year && department && section)

  useEffect(() => {
    if (!canLoadTimetable) {
      setDocRef(null)
      setEntries({})
      setTimeSlots(DEFAULT_TIME_SLOTS)
      setSubjects([])
      setExportMeta(getDefaultExportMeta(year, department, section))
      setFacultyMappings(normalizeFacultyMappings([]))
      setIsFacultyMappingDirty(false)
      return
    }

    setIsLoading(true)
    setError('')

    const selectedDocRef = doc(db, 'timetable', timetableDocId(year, department, section))

    const unsubscribe = onSnapshot(
      selectedDocRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setDocRef(selectedDocRef)
          setEntries({})
          setTimeSlots(DEFAULT_TIME_SLOTS)
          setSubjects([])
          setExportMeta(getDefaultExportMeta(year, department, section))
          setFacultyMappings(normalizeFacultyMappings([]))
          setIsFacultyMappingDirty(false)
          setIsLoading(false)
          return
        }

        const data = snapshot.data()
        const incomingEntries = data.entries ?? {}
        const incomingSlots = data.timeSlots?.length ? data.timeSlots : DEFAULT_TIME_SLOTS
        const { sortedSlots, sortedEntries } = sortSlotsAndReindexEntries(incomingSlots, incomingEntries)

        setDocRef(selectedDocRef)
        setEntries(sortedEntries)
        setTimeSlots(sortedSlots)
        setSubjects(data.subjects?.length ? data.subjects : [])
        setExportMeta({
          ...getDefaultExportMeta(year, department, section),
          ...(data.exportMeta ?? {}),
          classLabel:
            data.exportMeta?.classLabel || `${year || '-'} ${department || '-'} ${section || '-'}`,
          departmentName:
            data.exportMeta?.departmentName || DEPARTMENT_LABELS[department] || 'Department',
        })
        setFacultyMappings(normalizeFacultyMappings(data.facultyMappings))
        setIsFacultyMappingDirty(false)
        setIsLoading(false)
      },
      (snapshotError) => {
        setError(snapshotError.message)
        setIsLoading(false)
      },
    )

    return () => unsubscribe()
  }, [canLoadTimetable, year, department, section])

  useEffect(() => {
    if (!canLoadTimetable || !isFacultyMappingDirty || isLoading) {
      return
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        await persistTimetable(entries, timeSlots, subjects, exportMeta, facultyMappings)
        setIsFacultyMappingDirty(false)
      } catch (mappingError) {
        setError(mappingError.message)
      }
    }, 700)

    return () => window.clearTimeout(timeoutId)
  }, [
    canLoadTimetable,
    isFacultyMappingDirty,
    isLoading,
    entries,
    timeSlots,
    subjects,
    exportMeta,
    facultyMappings,
  ])

  const selectedLabel = useMemo(() => {
    if (!canLoadTimetable) return 'Select Year, Department and Section to start'
    return `${year} • ${department} • ${section}`
  }, [canLoadTimetable, year, department, section])

  const openEditor = (day, slotIndex) => {
    const key = cellKey(day, slotIndex)
    const currentItems = normalizeCellEntries(entries[key])
    const rows = currentItems.length
      ? currentItems.map((item) => createEditorRow(item))
      : [createEditorRow()]

    setEditorState({
      open: true,
      day,
      slotIndex,
      rows,
    })
  }

  const closeEditor = () => {
    setEditorState({
      open: false,
      day: '',
      slotIndex: -1,
      rows: [createEditorRow()],
    })
  }

  const updateEditorRow = (rowId, updates) => {
    setEditorState((prev) => ({
      ...prev,
      rows: prev.rows.map((row) => (row.rowId === rowId ? { ...row, ...updates } : row)),
    }))
  }

  const onAddEditorRow = () => {
    setEditorState((prev) => ({
      ...prev,
      rows: [...prev.rows, createEditorRow()],
    }))
  }

  const onRemoveEditorRow = (rowId) => {
    setEditorState((prev) => {
      if (prev.rows.length === 1) {
        return {
          ...prev,
          rows: [createEditorRow()],
        }
      }

      return {
        ...prev,
        rows: prev.rows.filter((row) => row.rowId !== rowId),
      }
    })
  }

  const addSubjectToBank = async (rawSubjectName, options = { persist: true }) => {
    const subjectName = rawSubjectName.trim()
    if (!subjectName || !canLoadTimetable) {
      return { nextSubjects: subjects, added: false }
    }

    const normalized = subjectName.toLowerCase()
    const alreadyExists = subjects.some((item) => item.toLowerCase() === normalized)
    if (alreadyExists) {
      return { nextSubjects: subjects, added: false }
    }

    const nextSubjects = [...subjects, subjectName].sort((a, b) => a.localeCompare(b))

    if (options.persist) {
      await persistTimetable(entries, timeSlots, nextSubjects)
    }

    return { nextSubjects, added: true }
  }

  const persistTimetable = async (
    nextEntries,
    nextSlots = timeSlots,
    nextSubjects = subjects,
    nextExportMeta = exportMeta,
    nextFacultyMappings = facultyMappings,
  ) => {
    const selectedDocRef = doc(db, 'timetable', timetableDocId(year, department, section))
    const basePayload = {
      year,
      department,
      section,
      entries: nextEntries,
      timeSlots: nextSlots,
      subjects: nextSubjects,
      exportMeta: nextExportMeta,
      facultyMappings: serializeFacultyMappings(nextFacultyMappings),
      updatedBy: user.uid,
      updatedAt: new Date().toISOString(),
    }

    const existingSnapshot = await getDoc(selectedDocRef)

    if (existingSnapshot.exists()) {
      await updateDoc(selectedDocRef, basePayload)
      return
    }

    await setDoc(selectedDocRef, {
      ...basePayload,
      createdBy: user.uid,
      createdAt: new Date().toISOString(),
    })
  }

  const onSaveCell = async (event) => {
    event.preventDefault()

    if (!canLoadTimetable) {
      setError('Please select Year, Department and Section first.')
      return
    }

    const parsedRows = editorState.rows.map((row) => ({
      type: row.type,
      subjectName: row.subjectName.trim(),
      batch: row.batch,
    }))

    if (parsedRows.some((row) => !row.subjectName)) {
      setError('Each entry must have subject name.')
      return
    }

    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      const subjectNames = parsedRows.map((row) => row.subjectName)
      const nextSubjects = mergeSubjects(subjects, subjectNames)
      const key = cellKey(editorState.day, editorState.slotIndex)
      const nextEntries = {
        ...entries,
        [key]: parsedRows.map((row) => ({
          type: row.type,
          subjectName: row.subjectName,
          batch: row.batch,
          updatedBy: user.uid,
          updatedAt: new Date().toISOString(),
        })),
      }

      await persistTimetable(nextEntries, timeSlots, nextSubjects)
      setSuccess('Timetable slot saved.')
      closeEditor()
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setIsSaving(false)
    }
  }

  const onClearCell = async () => {
    if (!canLoadTimetable) return

    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      const key = cellKey(editorState.day, editorState.slotIndex)
      const nextEntries = { ...entries }
      delete nextEntries[key]
      await persistTimetable(nextEntries)
      setSuccess('Cell entries cleared.')
      closeEditor()
    } catch (clearError) {
      setError(clearError.message)
    } finally {
      setIsSaving(false)
    }
  }

  const onClearSpecificCell = async (day, slotIndex) => {
    if (!canLoadTimetable) {
      return
    }

    const confirmed = window.confirm(`Clear all entries for ${day} at ${timeSlots[slotIndex]}?`)
    if (!confirmed) {
      return
    }

    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      const key = cellKey(day, slotIndex)
      const nextEntries = { ...entries }
      delete nextEntries[key]
      await persistTimetable(nextEntries)
      setSuccess('Selected cell cleared.')
    } catch (clearError) {
      setError(clearError.message)
    } finally {
      setIsSaving(false)
    }
  }

  const onStartEditSlot = (slotIndex) => {
    const slot = timeSlots[slotIndex]
    const [rawStart = '', rawEnd = ''] = String(slot).split('-')
    const parsedStart = parseTimeToken(rawStart)
    const parsedEnd = parseTimeToken(rawEnd)

    let startTimeValue = ''
    let endTimeValue = ''

    if (parsedStart) {
      const hours = String(parsedStart.hour).padStart(2, '0')
      const minutes = String(parsedStart.minute).padStart(2, '0')
      startTimeValue = `${hours}:${minutes}`
    }

    if (parsedEnd) {
      const hours = String(parsedEnd.hour).padStart(2, '0')
      const minutes = String(parsedEnd.minute).padStart(2, '0')
      endTimeValue = `${hours}:${minutes}`
    }

    setEditingSlotIndex(slotIndex)
    setEditSlotStartTime(startTimeValue)
    setEditSlotEndTime(endTimeValue)
  }

  const onCancelEditSlot = () => {
    setEditingSlotIndex(-1)
    setEditSlotStartTime('')
    setEditSlotEndTime('')
  }

  const onSaveEditSlot = async (slotIndex) => {
    if (!editSlotStartTime || !editSlotEndTime) {
      setError('Select both start and end time.')
      return
    }

    if (editSlotEndTime <= editSlotStartTime) {
      setError('End time must be after start time.')
      return
    }

    const nextSlot = `${formatTimeForDisplay(editSlotStartTime)} - ${formatTimeForDisplay(editSlotEndTime)}`

    if (nextSlot === timeSlots[slotIndex]) {
      onCancelEditSlot()
      return
    }

    if (timeSlots.some((slot, idx) => idx !== slotIndex && slot === nextSlot)) {
      setError('This time slot already exists.')
      return
    }

    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      const nextSlots = [...timeSlots]
      nextSlots[slotIndex] = nextSlot
      const { sortedSlots, sortedEntries } = sortSlotsAndReindexEntries(nextSlots, entries)
      await persistTimetable(sortedEntries, sortedSlots)
      setSuccess('Time slot updated.')
      onCancelEditSlot()
    } catch (editError) {
      setError(editError.message)
    } finally {
      setIsSaving(false)
    }
  }

  const onAddSlotAfter = async (slotIndex) => {
    setEditingSlotIndex(-1)
    setError('')
    setSuccess('')
    setIsSaving(true)

    try {
      // Create a new empty slot with default time
      const defaultStartTime = '00:00'
      const defaultEndTime = '00:01'
      const newSlot = `${formatTimeForDisplay(defaultStartTime)} - ${formatTimeForDisplay(defaultEndTime)}`

      // Check if slot already exists
      if (timeSlots.includes(newSlot)) {
        setError('This time slot already exists.')
        setIsSaving(false)
        return
      }

      // Insert the new slot at the correct position
      const insertIndex = slotIndex + 1
      const nextSlots = [...timeSlots.slice(0, insertIndex), newSlot, ...timeSlots.slice(insertIndex)]
      
      // Sort and reindex
      const { sortedSlots, sortedEntries } = sortSlotsAndReindexEntries(nextSlots, entries)
      
      // Update local state immediately
      setTimeSlots(sortedSlots)
      setEntries(sortedEntries)
      
      // Save to Firestore
      await persistTimetable(sortedEntries, sortedSlots)
      
      // Put the newly added slot into edit mode
      const newSlotIndex = sortedSlots.indexOf(newSlot)
      setEditingSlotIndex(newSlotIndex)
      setEditSlotStartTime(defaultStartTime)
      setEditSlotEndTime(defaultEndTime)
      
      setSuccess('New time slot added. Edit the times and click Save.')
    } catch (addError) {
      setError(addError.message)
    } finally {
      setIsSaving(false)
    }
  }

  const onDeleteRow = async (slotIndex) => {
    if (!canLoadTimetable) {
      return
    }

    const slotLabel = timeSlots[slotIndex]
    const confirmed = window.confirm(`Delete entire row for ${slotLabel}?`)
    if (!confirmed) {
      return
    }

    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      const nextSlots = timeSlots.filter((_, index) => index !== slotIndex)
      const nextEntries = {}

      DAYS.forEach((day) => {
        nextSlots.forEach((_, nextIndex) => {
          const oldIndex = nextIndex >= slotIndex ? nextIndex + 1 : nextIndex
          const oldKey = cellKey(day, oldIndex)
          const value = entries[oldKey]

          if (value) {
            nextEntries[cellKey(day, nextIndex)] = value
          }
        })
      })

      await persistTimetable(nextEntries, nextSlots)
      setSuccess('Time slot row deleted.')
    } catch (deleteError) {
      setError(deleteError.message)
    } finally {
      setIsSaving(false)
    }
  }

  const onAddTimeSlot = async () => {
    if (!slotStartTime || !slotEndTime) {
      setError('Select both start and end time.')
      return
    }

    if (slotEndTime <= slotStartTime) {
      setError('End time must be after start time.')
      return
    }

    const nextSlot = `${formatTimeForDisplay(slotStartTime)} - ${formatTimeForDisplay(slotEndTime)}`

    if (timeSlots.includes(nextSlot)) {
      setError('This time slot already exists.')
      return
    }

    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      const nextSlots = [...timeSlots, nextSlot]
      const { sortedSlots, sortedEntries } = sortSlotsAndReindexEntries(nextSlots, entries)
      await persistTimetable(sortedEntries, sortedSlots)
      setSlotStartTime('')
      setSlotEndTime('')
      setSuccess('New time slot added.')
    } catch (slotError) {
      setError(slotError.message)
    } finally {
      setIsSaving(false)
    }
  }

  const onAddSubject = async () => {
    if (!canLoadTimetable) {
      setError('Please select Year, Department and Section first.')
      return
    }

    const subjectName = newSubjectName.trim()
    if (!subjectName) {
      setError('Enter subject name first.')
      return
    }

    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      const { added } = await addSubjectToBank(subjectName)
      setNewSubjectName('')
      setSuccess(added ? 'Subject added to Subject Bank.' : 'Subject already exists in Subject Bank.')
    } catch (subjectError) {
      setError(subjectError.message)
    } finally {
      setIsSaving(false)
    }
  }

  const onRemoveSubject = async (subjectName) => {
    if (!canLoadTimetable) {
      setError('Please select Year, Department and Section first.')
      return
    }

    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      const nextSubjects = subjects.filter((item) => item !== subjectName)
      await persistTimetable(entries, timeSlots, nextSubjects)
      setSuccess('Subject removed from Subject Bank.')
    } catch (removeError) {
      setError(removeError.message)
    } finally {
      setIsSaving(false)
    }
  }

  const onExportMetaChange = (event) => {
    const { name, value } = event.target
    setExportMeta((prev) => ({ ...prev, [name]: value }))
  }

  const onSaveExportMeta = async () => {
    if (!canLoadTimetable) {
      setError('Please select Year, Department and Section first.')
      return
    }

    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      await persistTimetable(entries, timeSlots, subjects, exportMeta)
      setSuccess('Export header details saved.')
    } catch (metaError) {
      setError(metaError.message)
    } finally {
      setIsSaving(false)
    }
  }

  const onFacultyMappingChange = (rowId, field, value) => {
    setFacultyMappings((prev) =>
      prev.map((row) => (row.rowId === rowId ? { ...row, [field]: value } : row)),
    )
    setIsFacultyMappingDirty(true)
  }

  const onAddFacultyMappingRow = () => {
    setFacultyMappings((prev) => [...prev, createFacultyMappingRow()])
    setIsFacultyMappingDirty(true)
  }

  const onRemoveFacultyMappingRow = (rowId) => {
    setFacultyMappings((prev) => {
      if (prev.length === 1) {
        setIsFacultyMappingDirty(true)
        return [createFacultyMappingRow()]
      }
      setIsFacultyMappingDirty(true)
      return prev.filter((row) => row.rowId !== rowId)
    })
  }

  const onSaveFacultyMappings = async () => {
    if (!canLoadTimetable) {
      setError('Please select Year, Department and Section first.')
      return
    }

    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      await persistTimetable(entries, timeSlots, subjects, exportMeta, facultyMappings)
      setIsFacultyMappingDirty(false)
      setSuccess('Faculty mapping saved.')
    } catch (mappingError) {
      setError(mappingError.message)
    } finally {
      setIsSaving(false)
    }
  }

  const buildExportMatrix = () => {
    const header = ['Time', ...DAYS]
    const rows = timeSlots.map((slot, slotIndex) => {
      const cells = DAYS.map((day) => {
        const cellItems = normalizeCellEntries(entries[cellKey(day, slotIndex)])
        if (!cellItems.length) return ''

        return cellItems
          .map((item) => `${item.subjectName} (${item.type}${item.batch ? ` - Batch ${item.batch}` : ''})`)
          .join(' | ')
      })
      return [slot, ...cells]
    })

    return [header, ...rows]
  }

  const exportFileBase = `timetable-${year || 'na'}-${department || 'na'}-${section || 'na'}`

  const escapeHtml = (value) =>
    String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')

  const buildStyledExportHtml = (options = {}) => {
    const { wordSafe = false, logoSrcOverride = '' } = options
    const safeMeta = {
      ...getDefaultExportMeta(year, department, section),
      ...exportMeta,
    }
    const logoSrc = logoSrcOverride || `${window.location.origin}${STATIC_LOGO_SRC}`
    const generatedOn = new Date().toLocaleDateString('en-GB')
    const mappingRows = serializeFacultyMappings(facultyMappings)

    const headerCells = ['Time', ...DAYS]
      .map(
        (cell) =>
          `<th style="border:1px solid #9ca3af;padding:8px 6px;text-align:center;background:#f3f4f6;font-size:13px;">${escapeHtml(cell)}</th>`,
      )
      .join('')

    const bodyRows = timeSlots
      .map((slot, slotIndex) => {
        const dayCells = DAYS.map((day) => {
          const cellItems = normalizeCellEntries(entries[cellKey(day, slotIndex)])
          const content = cellItems.length
            ? cellItems
                .map(
                  (item) =>
                    `<div style="margin-bottom:4px;"><strong>${escapeHtml(item.subjectName)}</strong><br />${escapeHtml(
                      item.type === 'practical' ? 'Practical' : 'Theory',
                    )}<br />Batch ${escapeHtml(item.batch ?? 'ALL')}</div>`,
                )
                .join('')
            : '-'

          return `<td style="border:1px solid #9ca3af;padding:6px;vertical-align:top;font-size:12px;">${content}</td>`
        }).join('')

        return `
          <tr>
            <td style="border:1px solid #9ca3af;padding:6px;font-weight:700;font-size:12px;white-space:nowrap;">${escapeHtml(slot)}</td>
            ${dayCells}
          </tr>
        `
      })
      .join('')

    const mappingTableRows = (mappingRows.length ? mappingRows : [{}])
      .map((row) => {
        const theoryCourse = row.theoryCourse || '-'
        const theoryTeacher = row.theoryTeacher || '-'
        const practicalCourse = row.practicalCourse || '-'
        const lab = row.lab || '-'
        const practicalTeacher = row.practicalTeacher || '-'

        return `
          <tr>
            <td style="border:1px solid #9f8570;padding:5px 6px;font-size:12px;">${escapeHtml(theoryCourse)}</td>
            <td style="border:1px solid #9f8570;padding:5px 6px;font-size:12px;">${escapeHtml(theoryTeacher)}</td>
            <td style="border:1px solid #9f8570;padding:5px 6px;font-size:12px;">${escapeHtml(practicalCourse)}</td>
            <td style="border:1px solid #9f8570;padding:5px 6px;font-size:12px;">${escapeHtml(lab)}</td>
            <td style="border:1px solid #9f8570;padding:5px 6px;font-size:12px;">${escapeHtml(practicalTeacher)}</td>
          </tr>
        `
      })
      .join('')

    const logoBlock = logoSrc
      ? `<img src="${escapeHtml(logoSrc)}" alt="Logo" width="72" height="72" style="display:block;width:54pt;height:54pt;mso-width-source:userset;" />`
      : `<div style="width:72px;height:72px;border:1px solid #9f8570;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;">PICT</div>`

    const headerCardStyle = wordSafe
      ? 'border:1px solid #9f8570; padding:10px; margin-bottom:12px;'
      : 'border:1px solid #9f8570; background:#fff9ef; padding:10px; margin-bottom:12px; box-shadow:0 2px 8px rgba(120,91,66,0.12);'

    const headerBg = wordSafe ? '#f3ece2' : '#efe1d1'
    const subHeaderBg = wordSafe ? '#f8f2e8' : '#f7ecdf'

    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>${escapeHtml(exportFileBase)}</title>
        </head>
        <body style="font-family: 'Times New Roman', serif; color:#2b2118; padding:18px; background:#fffdf8;">
          <div style="${headerCardStyle}">
            <table style="width:100%; border-collapse:collapse; margin-bottom:6px;">
              <tr>
                <td style="width:90px; vertical-align:middle;">
                  ${logoBlock}
                </td>
                <td style="text-align:center; vertical-align:middle;">
                  <div style="font-size:28px; font-weight:700; line-height:1.15; color:#3d2f21;">${escapeHtml(safeMeta.instituteName)}</div>
                  <div style="font-size:16px; margin-top:2px; color:#4f3b29;">Department of ${escapeHtml(safeMeta.departmentName)}</div>
                </td>
              </tr>
            </table>

            <table style="width:100%; border-collapse:collapse; margin-bottom:4px;">
              <tr>
                <td style="font-size:15px; font-weight:700; color:#513c2a;">${escapeHtml(safeMeta.academicYear)}</td>
                <td style="font-size:17px; font-weight:700; text-align:center; color:#2f2318;">CLASS TIME TABLE</td>
                <td style="font-size:15px; font-weight:700; text-align:right; color:#513c2a;">${escapeHtml(safeMeta.semester)}</td>
              </tr>
              <tr>
                <td></td>
                <td style="font-size:15px; font-weight:700; text-align:center; color:#2f2318;">w.e.f. ${escapeHtml(safeMeta.effectiveFrom)}</td>
                <td></td>
              </tr>
            </table>

            <table style="width:100%; border-collapse:collapse; border-top:1px solid #4b3a2a; border-bottom:1px solid #4b3a2a; margin-bottom:6px;">
              <tr>
                <td style="font-size:14px; padding:5px 0;"><strong>Class:</strong> ${escapeHtml(safeMeta.classLabel)}</td>
                <td style="font-size:14px; padding:5px 0; text-align:right;"><strong>Room No.:</strong> ${escapeHtml(safeMeta.roomNumbers)}</td>
              </tr>
            </table>

            <div style="font-size:14px; text-align:center;"><strong>Class Coordinator:</strong> ${escapeHtml(safeMeta.coordinator)}</div>
          </div>

          <table style="width:100%; border-collapse:collapse; table-layout:fixed; border:1px solid #9f8570;">
            <thead>
              <tr>${headerCells}</tr>
            </thead>
            <tbody>
              ${
                bodyRows ||
                `<tr><td colspan="7" style="border:1px solid #9ca3af;padding:10px;text-align:center;font-size:12px;">No timetable rows available.</td></tr>`
              }
            </tbody>
          </table>

          <table style="width:100%; border-collapse:collapse; margin-top:14px; border:1px solid #9f8570;">
            <thead>
              <tr>
                <th colspan="2" style="border:1px solid #9f8570;padding:6px;background:${headerBg};font-size:13px;">Theory</th>
                <th colspan="3" style="border:1px solid #9f8570;padding:6px;background:${headerBg};font-size:13px;">Practical/ Tutorial</th>
              </tr>
              <tr>
                <th style="border:1px solid #9f8570;padding:6px;background:${subHeaderBg};font-size:12px;">Course</th>
                <th style="border:1px solid #9f8570;padding:6px;background:${subHeaderBg};font-size:12px;">Name of Teacher</th>
                <th style="border:1px solid #9f8570;padding:6px;background:${subHeaderBg};font-size:12px;">Course</th>
                <th style="border:1px solid #9f8570;padding:6px;background:${subHeaderBg};font-size:12px;">Lab</th>
                <th style="border:1px solid #9f8570;padding:6px;background:${subHeaderBg};font-size:12px;">Name of Teacher</th>
              </tr>
            </thead>
            <tbody>
              ${mappingTableRows}
            </tbody>
          </table>
          <div style="margin-top:8px; font-size:11px; text-align:right;">Generated On: ${escapeHtml(generatedOn)}</div>
        </body>
      </html>
    `
  }

  const buildExcelExportHtml = () => {
    const safeMeta = {
      ...getDefaultExportMeta(year, department, section),
      ...exportMeta,
    }
    const logoSrc = `${window.location.origin}${STATIC_LOGO_SRC}`
    const generatedOn = new Date().toLocaleDateString('en-GB')
    const mappingRows = serializeFacultyMappings(facultyMappings)

    const toCellContent = (slotIndex, day) => {
      const cellItems = normalizeCellEntries(entries[cellKey(day, slotIndex)])
      if (!cellItems.length) return '-'

      return cellItems
        .map(
          (item) =>
            `${escapeHtml(item.subjectName)}<br/>${escapeHtml(
              item.type === 'practical' ? 'Practical' : 'Theory',
            )}<br/>Batch ${escapeHtml(item.batch ?? 'ALL')}`,
        )
        .join('<br/><br/>')
    }

    const timetableRows = timeSlots
      .map(
        (slot, index) => `
          <tr>
            <td style="border:1px solid #9f8570;padding:6px;font-weight:700;white-space:nowrap;">${escapeHtml(
              slot,
            )}</td>
            ${DAYS.map(
              (day) =>
                `<td style="border:1px solid #9f8570;padding:6px;vertical-align:top;">${toCellContent(index, day)}</td>`,
            ).join('')}
          </tr>
        `,
      )
      .join('')

    const mappingTableRows = (mappingRows.length ? mappingRows : [{}])
      .map((row) => {
        const theoryCourse = row.theoryCourse || '-'
        const theoryTeacher = row.theoryTeacher || '-'
        const practicalCourse = row.practicalCourse || '-'
        const lab = row.lab || '-'
        const practicalTeacher = row.practicalTeacher || '-'

        return `
          <tr>
            <td style="border:1px solid #9f8570;padding:5px 6px;">${escapeHtml(theoryCourse)}</td>
            <td style="border:1px solid #9f8570;padding:5px 6px;">${escapeHtml(theoryTeacher)}</td>
            <td style="border:1px solid #9f8570;padding:5px 6px;">${escapeHtml(practicalCourse)}</td>
            <td style="border:1px solid #9f8570;padding:5px 6px;">${escapeHtml(lab)}</td>
            <td style="border:1px solid #9f8570;padding:5px 6px;">${escapeHtml(practicalTeacher)}</td>
          </tr>
        `
      })
      .join('')

    return `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:x="urn:schemas-microsoft-com:office:excel"
            xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="UTF-8" />
          <meta name="ProgId" content="Excel.Sheet" />
          <meta name="Generator" content="Microsoft Excel 15" />
          <title>${escapeHtml(exportFileBase)}</title>
          <style>
            body { font-family: Calibri, Arial, sans-serif; font-size: 12px; }
            table { border-collapse: collapse; }
            .center { text-align: center; }
          </style>
        </head>
        <body>
          <table style="margin-bottom:10px; width:1280px;">
            <tr>
              <td style="width:90px; vertical-align:top;">
                <img src="${escapeHtml(logoSrc)}" alt="Logo" width="72" height="72" style="display:block;" />
              </td>
              <td class="center" style="vertical-align:top;">
                <div style="font-family:'Times New Roman',serif;font-size:20px;font-weight:700;">${escapeHtml(
                  safeMeta.instituteName,
                )}</div>
                <div style="font-family:'Times New Roman',serif;font-size:14px;">Department of ${escapeHtml(
                  safeMeta.departmentName,
                )}</div>
              </td>
            </tr>
          </table>

          <table style="width:1280px; margin-bottom:4px; font-family:'Times New Roman',serif;">
            <tr>
              <td style="font-size:14px; font-weight:700;">${escapeHtml(safeMeta.academicYear)}</td>
              <td class="center" style="font-size:16px; font-weight:700;">CLASS TIME TABLE</td>
              <td style="font-size:14px; font-weight:700; text-align:right;">${escapeHtml(safeMeta.semester)}</td>
            </tr>
            <tr>
              <td></td>
              <td class="center" style="font-size:14px; font-weight:700;">w.e.f. ${escapeHtml(
                safeMeta.effectiveFrom,
              )}</td>
              <td></td>
            </tr>
          </table>

          <table style="width:1280px; margin-bottom:4px; border-top:1px solid #9f8570; border-bottom:1px solid #9f8570;">
            <tr>
              <td style="padding:4px 0;"><strong>Class:</strong> ${escapeHtml(safeMeta.classLabel)}</td>
              <td style="padding:4px 0; text-align:right;"><strong>Room No.:</strong> ${escapeHtml(
                safeMeta.roomNumbers,
              )}</td>
            </tr>
          </table>
          <div style="width:1280px; text-align:center; margin-bottom:8px;"><strong>Class Coordinator:</strong> ${escapeHtml(
            safeMeta.coordinator,
          )}</div>

          <table style="width:1280px; table-layout:fixed; margin-bottom:10px;">
            <colgroup>
              <col style="width:170px;" />
              <col style="width:185px;" />
              <col style="width:185px;" />
              <col style="width:185px;" />
              <col style="width:185px;" />
              <col style="width:185px;" />
              <col style="width:185px;" />
            </colgroup>
            <thead>
              <tr>
                <th style="border:1px solid #9f8570; background:#f3ece2; padding:6px;">Time</th>
                ${DAYS.map(
                  (day) => `<th style="border:1px solid #9f8570; background:#f3ece2; padding:6px;">${escapeHtml(day)}</th>`,
                ).join('')}
              </tr>
            </thead>
            <tbody>
              ${
                timetableRows ||
                `<tr><td colspan="7" style="border:1px solid #9f8570;padding:8px;text-align:center;">No timetable rows available.</td></tr>`
              }
            </tbody>
          </table>

          <table style="width:1280px; table-layout:fixed;">
            <colgroup>
              <col style="width:130px;" />
              <col style="width:290px;" />
              <col style="width:130px;" />
              <col style="width:130px;" />
              <col style="width:600px;" />
            </colgroup>
            <thead>
              <tr>
                <th colspan="2" style="border:1px solid #9f8570;padding:6px;background:#efe1d1;">Theory</th>
                <th colspan="3" style="border:1px solid #9f8570;padding:6px;background:#efe1d1;">Practical/ Tutorial</th>
              </tr>
              <tr>
                <th style="border:1px solid #9f8570;padding:6px;background:#f7ecdf;">Course</th>
                <th style="border:1px solid #9f8570;padding:6px;background:#f7ecdf;">Name of Teacher</th>
                <th style="border:1px solid #9f8570;padding:6px;background:#f7ecdf;">Course</th>
                <th style="border:1px solid #9f8570;padding:6px;background:#f7ecdf;">Lab</th>
                <th style="border:1px solid #9f8570;padding:6px;background:#f7ecdf;">Name of Teacher</th>
              </tr>
            </thead>
            <tbody>
              ${mappingTableRows}
            </tbody>
          </table>

          <div style="width:1280px; margin-top:8px; font-size:11px; text-align:right;">Generated On: ${escapeHtml(
            generatedOn,
          )}</div>
        </body>
      </html>
    `
  }

  const onExportCsv = () => {
    const matrix = buildExportMatrix()
    const csv = matrix
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${exportFileBase}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    setShowExportMenu(false)
  }

  const onExportExcel = () => {
    const html = buildExcelExportHtml()
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${exportFileBase}.xls`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    setShowExportMenu(false)
  }

  const onExportDoc = async () => {
    let embeddedLogo = ''

    try {
      const response = await fetch(STATIC_LOGO_SRC, { cache: 'no-store' })
      if (response.ok) {
        const blob = await response.blob()
        const dataUrl = await buildWordSafeSquareLogo(blob, 96)
        embeddedLogo = typeof dataUrl === 'string' ? dataUrl : ''
      }
    } catch {
      embeddedLogo = ''
    }

    const html = buildStyledExportHtml({
      wordSafe: true,
      logoSrcOverride: embeddedLogo || `${window.location.origin}${STATIC_LOGO_SRC}`,
    })

    const blob = new Blob([html], { type: 'application/msword;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${exportFileBase}.doc`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    setShowExportMenu(false)
  }

  const onExportPdf = () => {
    const html = buildStyledExportHtml()

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      setError('Allow popups to export PDF.')
      setShowExportMenu(false)
      return
    }

    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
    setShowExportMenu(false)
  }

  const onSectionChange = (event) => {
    const nextValue = event.target.value

    if (nextValue === '__add_section__') {
      const nextSection = window.prompt('Enter new section name')?.trim()
      if (!nextSection) {
        return
      }

      const normalizedNextSection = nextSection.toLowerCase()
      const alreadyExists = sectionOptions.some((item) => item.toLowerCase() === normalizedNextSection)
      if (alreadyExists) {
        setError('Section already exists.')
        return
      }

      setSectionOptions((prev) => [...prev, nextSection].sort((a, b) => a.localeCompare(b)))
      setSection(nextSection)
      setError('')
      setSuccess('Section added successfully.')
      return
    }

    if (nextValue === '__edit_section__') {
      if (!section) {
        setError('Select a section first.')
        return
      }

      const nextSection = window.prompt('Rename selected section', section)?.trim()
      if (!nextSection || nextSection === section) {
        return
      }

      const normalizedNextSection = nextSection.toLowerCase()
      const alreadyExists = sectionOptions.some((item) => item.toLowerCase() === normalizedNextSection)
      if (alreadyExists) {
        setError('Section already exists.')
        return
      }

      setSectionOptions((prev) =>
        prev.map((item) => (item === section ? nextSection : item)).sort((a, b) => a.localeCompare(b)),
      )
      setSection(nextSection)
      setError('')
      setSuccess('Section updated successfully.')
      return
    }

    setSection(nextValue)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <select
            value={year}
            onChange={(event) => setYear(event.target.value)}
            className="min-w-[140px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-slate-400 focus:outline-none"
          >
            <option value="">Year</option>
            {YEARS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
            className="min-w-[160px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-slate-400 focus:outline-none"
          >
            <option value="">Department</option>
            {DEPARTMENTS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            value={section}
            onChange={onSectionChange}
            className="min-w-[140px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-slate-400 focus:outline-none"
          >
            <option value="">Section</option>
            {sectionOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
            <option value="__add_section__">+ Add new section</option>
            <option value="__edit_section__">Edit selected section</option>
          </select>

          <div className="relative ml-auto">
            <button
              type="button"
              onClick={() => setShowExportMenu((prev) => !prev)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              Export
            </button>

            {showExportMenu ? (
              <div className="absolute right-0 z-20 mt-2 w-40 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                <button
                  type="button"
                  onClick={onExportCsv}
                  className="mb-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  CSV
                </button>
                <button
                  type="button"
                  onClick={onExportPdf}
                  className="mb-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  PDF
                </button>
                <button
                  type="button"
                  onClick={onExportExcel}
                  className="mb-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Excel
                </button>
                <button
                  type="button"
                  onClick={onExportDoc}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  DOC
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <p className="text-sm text-slate-600">{selectedLabel}</p>
        {error ? <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        {success ? <p className="mt-3 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{success}</p> : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Export Header Details</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <label className="block text-sm font-medium text-slate-700">
            Institute Name
            <input
              type="text"
              name="instituteName"
              value={exportMeta.instituteName}
              onChange={onExportMetaChange}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-slate-400 focus:outline-none"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Department Name
            <input
              type="text"
              name="departmentName"
              value={exportMeta.departmentName}
              onChange={onExportMetaChange}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-slate-400 focus:outline-none"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Academic Year (AY)
            <input
              type="text"
              name="academicYear"
              value={exportMeta.academicYear}
              onChange={onExportMetaChange}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-slate-400 focus:outline-none"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Semester
            <input
              type="text"
              name="semester"
              value={exportMeta.semester}
              onChange={onExportMetaChange}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-slate-400 focus:outline-none"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Effective From (w.e.f)
            <input
              type="text"
              name="effectiveFrom"
              value={exportMeta.effectiveFrom}
              onChange={onExportMetaChange}
              placeholder="DD/MM/YYYY"
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-slate-400 focus:outline-none"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Class Label
            <input
              type="text"
              name="classLabel"
              value={exportMeta.classLabel}
              onChange={onExportMetaChange}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-slate-400 focus:outline-none"
            />
          </label>
          <label className="text-sm text-slate-700">
            Room No.
            <input
              type="text"
              name="roomNumbers"
              value={exportMeta.roomNumbers}
              onChange={onExportMetaChange}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm text-slate-700">
            Class Coordinator
            <input
              type="text"
              name="coordinator"
              value={exportMeta.coordinator}
              onChange={onExportMetaChange}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={onSaveExportMeta}
          disabled={isSaving || !canLoadTimetable}
          className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 disabled:opacity-60"
        >
          Save Header Details
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Theory / Practical Faculty Mapping
          </p>
          <button
            type="button"
            onClick={onAddFacultyMappingRow}
            className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-slate-800"
          >
            + Add Row
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100">
                <th colSpan={2} className="border border-slate-200 px-3 py-2 text-center font-semibold text-slate-700">
                  Theory
                </th>
                <th colSpan={3} className="border border-slate-200 px-3 py-2 text-center font-semibold text-slate-700">
                  Practical / Tutorial
                </th>
                <th className="border border-slate-200 px-3 py-2 text-center font-semibold text-slate-700">Action</th>
              </tr>
              <tr className="bg-slate-50">
                <th className="border border-slate-200 px-3 py-2 text-left font-medium text-slate-700">Course</th>
                <th className="border border-slate-200 px-3 py-2 text-left font-medium text-slate-700">Name of Teacher</th>
                <th className="border border-slate-200 px-3 py-2 text-left font-medium text-slate-700">Course</th>
                <th className="border border-slate-200 px-3 py-2 text-left font-medium text-slate-700">Lab</th>
                <th className="border border-slate-200 px-3 py-2 text-left font-medium text-slate-700">Name of Teacher</th>
                <th className="border border-slate-200 px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {facultyMappings.map((row) => (
                <tr key={row.rowId}>
                  <td className="border border-slate-200 p-2">
                    <input
                      type="text"
                      value={row.theoryCourse}
                      onChange={(event) => onFacultyMappingChange(row.rowId, 'theoryCourse', event.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 shadow-sm transition focus:border-slate-400 focus:outline-none"
                    />
                  </td>
                  <td className="border border-slate-200 p-2">
                    <input
                      type="text"
                      value={row.theoryTeacher}
                      onChange={(event) => onFacultyMappingChange(row.rowId, 'theoryTeacher', event.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 shadow-sm transition focus:border-slate-400 focus:outline-none"
                    />
                  </td>
                  <td className="border border-slate-200 p-2">
                    <input
                      type="text"
                      value={row.practicalCourse}
                      onChange={(event) => onFacultyMappingChange(row.rowId, 'practicalCourse', event.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 shadow-sm transition focus:border-slate-400 focus:outline-none"
                    />
                  </td>
                  <td className="border border-slate-200 p-2">
                    <input
                      type="text"
                      value={row.lab}
                      onChange={(event) => onFacultyMappingChange(row.rowId, 'lab', event.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 shadow-sm transition focus:border-slate-400 focus:outline-none"
                    />
                  </td>
                  <td className="border border-slate-200 p-2">
                    <input
                      type="text"
                      value={row.practicalTeacher}
                      onChange={(event) => onFacultyMappingChange(row.rowId, 'practicalTeacher', event.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 shadow-sm transition focus:border-slate-400 focus:outline-none"
                    />
                  </td>
                  <td className="border border-slate-200 p-2 text-center">
                    <button
                      type="button"
                      onClick={() => onRemoveFacultyMappingRow(row.rowId)}
                      className="rounded-lg border border-red-300 px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          onClick={onSaveFacultyMappings}
          disabled={isSaving || !canLoadTimetable}
          className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 disabled:opacity-60"
        >
          Save Faculty Mapping
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {isLoading ? (
          <div className="mb-4 animate-pulse rounded-xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="h-4 w-44 rounded bg-slate-200" />
            <div className="mt-4 flex flex-wrap gap-3">
              <div className="h-10 w-72 rounded-lg bg-slate-200" />
              <div className="h-10 w-36 rounded-lg bg-slate-200" />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <div className="h-6 w-16 rounded-full bg-slate-200" />
              <div className="h-6 w-24 rounded-full bg-slate-200" />
              <div className="h-6 w-20 rounded-full bg-slate-200" />
              <div className="h-6 w-16 rounded-full bg-slate-200" />
            </div>
          </div>
        ) : null}

        <div className={`mb-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4 ${isLoading ? 'pointer-events-none opacity-70' : ''}`}>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Subject Bank</p>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={newSubjectName}
              onChange={(event) => setNewSubjectName(event.target.value)}
              placeholder="Add subject for selected class"
              className="w-full max-w-sm rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-slate-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={onAddSubject}
              disabled={isSaving || !canLoadTimetable}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 disabled:opacity-60"
            >
              + Add Subject
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            {subjects.length ? (
              subjects.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm"
                >
                  <span className="text-xs font-medium text-slate-700">{item}</span>
                  <button
                    type="button"
                    onClick={() => onRemoveSubject(item)}
                    disabled={isSaving}
                    className="ml-1 rounded-full p-1 text-slate-400 transition-colors hover:bg-red-100 hover:text-red-600 disabled:opacity-60"
                    title="Remove subject"
                  >
                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))
            ) : (
              <span className="text-sm text-slate-500">No saved subjects for this selection yet.</span>
            )}
          </div>
        </div>

        <div className={`overflow-x-auto rounded-xl border border-slate-200 ${isLoading ? 'pointer-events-none opacity-70' : ''}`}>
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="min-w-[160px] border border-slate-200 px-4 py-3 text-left font-semibold text-slate-700">Time</th>
                {DAYS.map((day) => (
                  <th key={day} className="min-w-[180px] border border-slate-200 px-4 py-3 text-left font-semibold text-slate-700">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((slot, slotIndex) => {
                const { startTime, endTime } = extractTimeValuesFromSlot(slot)
                const isEditing = editingSlotIndex === slotIndex
                const displayStartTime = isEditing ? editSlotStartTime : startTime
                const displayEndTime = isEditing ? editSlotEndTime : endTime

                return (
                  <>
                    <tr key={`${slot}-${slotIndex}`}>
                    <td className="border border-slate-200 px-3 py-3">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={displayStartTime}
                            onChange={(event) => {
                              if (!isEditing) {
                                onStartEditSlot(slotIndex)
                              }
                              setEditSlotStartTime(event.target.value)
                            }}
                            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs shadow-sm transition focus:border-slate-400 focus:outline-none"
                          />
                          <span className="text-xs text-slate-500">to</span>
                          <input
                            type="time"
                            value={displayEndTime}
                            onChange={(event) => {
                              if (!isEditing) {
                                onStartEditSlot(slotIndex)
                              }
                              setEditSlotEndTime(event.target.value)
                            }}
                            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs shadow-sm transition focus:border-slate-400 focus:outline-none"
                          />
                        </div>
                        <div className="flex gap-1">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => onSaveEditSlot(slotIndex)}
                                disabled={isSaving || !canLoadTimetable}
                                className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-green-700 disabled:opacity-60"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={onCancelEditSlot}
                                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => onDeleteRow(slotIndex)}
                                disabled={isSaving || !canLoadTimetable}
                                className="rounded-lg border border-red-300 px-2 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
                              >
                                Delete Row
                              </button>
                              <button
                                type="button"
                                onClick={() => onAddSlotAfter(slotIndex)}
                                disabled={isSaving || !canLoadTimetable}
                                className="rounded-lg bg-slate-900 px-2 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-slate-800 disabled:opacity-60"
                              >
                                + Add Slot
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                      {DAYS.map((day) => {
                        const key = cellKey(day, slotIndex)
                        const cellItems = normalizeCellEntries(entries[key])
                        return (
                          <td key={key} className="border border-slate-200 p-2 align-top">
                            <button
                              type="button"
                              onClick={() => openEditor(day, slotIndex)}
                              disabled={!canLoadTimetable}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-left text-xs shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {cellItems.length ? (
                                <div className="space-y-1">
                                  {cellItems.map((item, index) => (
                                    <div key={`${key}-${index}`} className="rounded border border-slate-200 px-2 py-1">
                                      <p className="font-semibold text-slate-800">{item.subjectName}</p>
                                      <p className="text-slate-600">{item.type === 'practical' ? 'Practical' : 'Theory'}</p>
                                      <p className="text-slate-500">Batch {item.batch ?? 'ALL'}</p>
                                    </div>
                                  ))}
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      onClearSpecificCell(day, slotIndex)
                                    }}
                                    disabled={isSaving}
                                    className="rounded-lg border border-red-300 px-2 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
                                  >
                                    Clear Cell
                                  </button>
                                </div>
                              ) : (
                                <span className="text-slate-500">ADD</span>
                              )}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  </>
                )
              })}
              {timeSlots.length === 0 && (
                <tr className="bg-slate-50">
                  <td className="border border-slate-200 px-3 py-4">
                    <button
                      type="button"
                      onClick={() => onAddSlotAfter(-1)}
                      disabled={isSaving || !canLoadTimetable}
                      className="rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white disabled:opacity-60"
                    >
                      + Add Time Slot
                    </button>
                  </td>
                  {DAYS.map((day) => (
                    <td key={day} className="border border-slate-200 p-2 bg-slate-50"></td>
                  ))}
                </tr>
              )}
              </tbody>
            </table>
        </div>
      </div>

      {editorState.open ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                Edit Slot • {editorState.day} • {timeSlots[editorState.slotIndex]}
              </h3>
              <button
                type="button"
                onClick={closeEditor}
                className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600"
              >
                X
              </button>
            </div>

            <form onSubmit={onSaveCell} className="space-y-3">
              {editorState.rows.map((row, index) => (
                <div key={row.rowId} className="rounded-md border border-slate-200 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Entry {index + 1}
                    </p>
                    <button
                      type="button"
                      onClick={() => onRemoveEditorRow(row.rowId)}
                      className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="mb-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => updateEditorRow(row.rowId, { type: 'theory' })}
                      className={`rounded-md border px-3 py-1.5 text-sm ${
                        row.type === 'theory' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 text-slate-700'
                      }`}
                    >
                      Theory
                    </button>
                    <button
                      type="button"
                      onClick={() => updateEditorRow(row.rowId, { type: 'practical' })}
                      className={`rounded-md border px-3 py-1.5 text-sm ${
                        row.type === 'practical' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 text-slate-700'
                      }`}
                    >
                      Practical
                    </button>
                  </div>

                  <label className="mb-2 block text-sm text-slate-700">
                    Subject (Saved List)
                    <select
                      value={row.selectedSubject}
                      onChange={(event) => {
                        const selected = event.target.value
                        updateEditorRow(row.rowId, {
                          selectedSubject: selected,
                          subjectName: selected || row.subjectName,
                        })
                      }}
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                    >
                      <option value="">Select saved subject</option>
                      {subjects.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="mb-2 block text-sm text-slate-700">
                    Subject Name
                    <input
                      type="text"
                      value={row.subjectName}
                      onChange={(event) =>
                        updateEditorRow(row.rowId, {
                          selectedSubject: '',
                          subjectName: event.target.value,
                        })
                      }
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                      placeholder="Enter subject"
                    />
                  </label>

                  <label className="block text-sm text-slate-700">
                    Batch
                    <select
                      value={row.batch}
                      onChange={(event) => updateEditorRow(row.rowId, { batch: event.target.value })}
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                    >
                      {BATCH_OPTIONS.map((item) => (
                        <option key={item} value={item}>
                          Batch {item}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ))}

              <button
                type="button"
                onClick={onAddEditorRow}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
              >
                + Add Entry In This Cell
              </button>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={closeEditor}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onClearCell}
                  disabled={isSaving}
                  className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 disabled:opacity-60"
                >
                  Clear Cell
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default TimetablePage
