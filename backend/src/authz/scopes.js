/**
 * Authorization V2 — Access scope registry.
 * Scope answers: "On which data can the user perform the action?"
 */

export const SCOPES = {
  SELF: 'SELF',
  TEAM: 'TEAM',
  OWN_DEPARTMENT: 'OWN_DEPARTMENT',
  ASSIGNED_DEPARTMENTS: 'ASSIGNED_DEPARTMENTS',
  PROJECT: 'PROJECT',
  CLIENT_PORTFOLIO: 'CLIENT_PORTFOLIO',
  BRANCH: 'BRANCH',
  COMPANY: 'COMPANY',
  PLATFORM: 'PLATFORM',
};

/** @typedef {{ permission: string, scope: string }} PermissionGrant */
