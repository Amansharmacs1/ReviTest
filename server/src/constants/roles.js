export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN', // Platform operator (multi-tenant oversight)
  ORG_ADMIN: 'ORG_ADMIN', // Institutional owner / Department head
  PROCTOR: 'PROCTOR', // Examiner / Invigilator / Faculty
  CANDIDATE: 'CANDIDATE', // Student / Examinee / Job Applicant
};

export const ROLE_HIERARCHY = {
  [ROLES.SUPER_ADMIN]: 4,
  [ROLES.ORG_ADMIN]: 3,
  [ROLES.PROCTOR]: 2,
  [ROLES.CANDIDATE]: 1,
};

export const hasMinimumRole = (userRole, requiredRole) => {
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
  return userLevel >= requiredLevel;
};
