export const ROLES = {
  SUPERADMIN: 'superadmin',
  NOTICE_ADMIN: 'notice_admin',
  TNP_ADMIN: 'tnp_admin',
  EVENT_ADMIN: 'event_admin',
  TIMETABLE_ADMIN: 'timetable_admin',
}

export const NOTICE_CATEGORIES = ['academic', 'holiday', 'scholarship']

export const ROLE_LABELS = {
  [ROLES.SUPERADMIN]: 'Super Admin',
  [ROLES.NOTICE_ADMIN]: 'Notice Admin',
  [ROLES.TNP_ADMIN]: 'TNP Admin',
  [ROLES.EVENT_ADMIN]: 'Event Admin',
  [ROLES.TIMETABLE_ADMIN]: 'Timetable Admin',
}

export const ASSIGNABLE_ADMIN_ROLES = [
  ROLES.NOTICE_ADMIN,
  ROLES.TNP_ADMIN,
  ROLES.EVENT_ADMIN,
  ROLES.TIMETABLE_ADMIN,
]
