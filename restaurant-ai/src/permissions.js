// Define what each role can access
export const ROLE_PERMISSIONS = {
  owner: {
    pages:      ['/', '/menu', '/inventory', '/orders', '/sales', '/forecast', '/reviews', '/pricing', '/alerts', '/settings'],
    canEdit:    true,
    canDelete:  true,
    canManageUsers: true,
    label:      'Owner',
    color:      'text-orange-400 bg-orange-500/10 border-orange-500/20',
  },
  manager: {
    pages:      ['/', '/menu', '/inventory', '/orders', '/sales', '/forecast', '/reviews', '/pricing', '/alerts'],
    canEdit:    true,
    canDelete:  false,
    canManageUsers: false,
    label:      'Manager',
    color:      'text-blue-400 bg-blue-500/10 border-blue-500/20',
  },
  staff: {
    pages:      ['/orders', '/menu'],
    canEdit:    false,
    canDelete:  false,
    canManageUsers: false,
    label:      'Staff',
    color:      'text-green-400 bg-green-500/10 border-green-500/20',
  },
  kitchen: {
    pages:      ['/orders'],
    canEdit:    false,
    canDelete:  false,
    canManageUsers: false,
    label:      'Kitchen',
    color:      'text-purple-400 bg-purple-500/10 border-purple-500/20',
  },
}

export function canAccess(role, path) {
  const perms = ROLE_PERMISSIONS[role]
  if (!perms) return false
  return perms.pages.includes(path)
}

export function getPermissions(role) {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.staff
}