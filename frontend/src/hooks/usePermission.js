import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import authzApi from '../api/authzApi.js';

/**
 * Authorization V2 — Permission hook (foundation).
 * Falls back to legacy checkPermission(roles) until effective API is loaded.
 *
 * @param {{ enabled?: boolean }} [options]
 */
export function usePermission(options = {}) {
  const { enabled = true } = options;
  const { user, isAuthenticated, checkPermission: legacyCheck } = useAuth();
  const [effective, setEffective] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setEffective(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await authzApi.getEffective();
      setEffective(data);
    } catch (err) {
      setError(err);
      setEffective(null);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (enabled && isAuthenticated) {
      refresh();
    }
  }, [enabled, isAuthenticated, refresh]);

  /**
   * @param {string} permission
   * @param {string[]} [legacyRoles] - fallback role allowlist
   */
  const can = useCallback(
    (permission, legacyRoles = null) => {
      if (effective?.permissions?.includes(permission)) {
        return true;
      }
      if (effective?.permissions?.includes('platform.admin')) {
        return true;
      }
      if (legacyRoles?.length) {
        return legacyCheck(legacyRoles);
      }
      return false;
    },
    [effective, legacyCheck]
  );

  const getScope = useCallback(
    (permission) => effective?.scopes?.[permission] ?? null,
    [effective]
  );

  return {
    effective,
    loading,
    error,
    refresh,
    can,
    getScope,
    permissions: effective?.permissions ?? [],
    accessRoles: effective?.accessRoles ?? [],
    legacyRole: effective?.legacyRole ?? user?.role,
  };
}

export default usePermission;
