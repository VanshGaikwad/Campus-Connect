import { ROLES } from './constants'

export const roleHomeRoute = {
  [ROLES.SUPERADMIN]: '/dashboard',
  [ROLES.NOTICE_ADMIN]: '/notices',
  [ROLES.TNP_ADMIN]: '/placements',
  [ROLES.EVENT_ADMIN]: '/events',
  [ROLES.TIMETABLE_ADMIN]: '/timetable',
}

export const roleModules = {
  [ROLES.SUPERADMIN]: ['admin-management', 'notices', 'placements', 'events', 'timetable'],
  [ROLES.NOTICE_ADMIN]: ['notices'],
  [ROLES.TNP_ADMIN]: ['placements'],
  [ROLES.EVENT_ADMIN]: ['events'],
  [ROLES.TIMETABLE_ADMIN]: ['timetable'],
}
