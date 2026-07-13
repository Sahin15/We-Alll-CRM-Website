import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import authzApi from '../api/authzApi.js';
import { isAuthzV2AnyModuleEnabled, isAuthzV2ModuleEnabled } from '../utils/authzFlags.js';

/**
 * Authorization V2 — Permission hook.
 * Prefers AuthContext effective permissions when loaded.
 *
 * @param {{ enabled?: boolean }} [options]
 */
export function usePermission(options = {}) {
  const { enabled = true } = options;
  const {
    user,
    isAuthenticated,
    checkPermission: legacyCheck,
    authzEffective,
    authzLoading,
    loadAuthzEffective,
    canPermission: contextCanPermission,
  } = useAuth();
  const [localEffective, setLocalEffective] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const effective = authzEffective || localEffective;

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setLocalEffective(null);
      return null;
    }
    if (authzEffective) {
      return authzEffective;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await authzApi.getEffective();
      setLocalEffective(data);
      return data;
    } catch (err) {
      setError(err);
      setLocalEffective(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, authzEffective]);

  useEffect(() => {
    if (enabled && isAuthenticated && isAuthzV2AnyModuleEnabled() && !authzEffective) {
      refresh();
    }
  }, [enabled, isAuthenticated, authzEffective, refresh]);

  const can = useCallback(
    (permission, legacyRoles = null, moduleName = 'profile') => {
      if (isAuthzV2ModuleEnabled(moduleName)) {
        return contextCanPermission(permission);
      }
      if (legacyRoles?.length) {
        return legacyCheck(legacyRoles);
      }
      return effective?.permissions?.includes(permission) ?? false;
    },
    [contextCanPermission, effective, legacyCheck]
  );

  const getScope = useCallback(
    (permission) => effective?.scopes?.[permission] ?? null,
    [effective]
  );

  return {
    effective,
    loading: loading || authzLoading,
    error,
    refresh: loadAuthzEffective || refresh,
    can,
    getScope,
    permissions: effective?.permissions ?? [],
    accessRoles: effective?.accessRoles ?? [],
    legacyRole: effective?.legacyRole ?? user?.role,
  };
}

export default usePermission;
