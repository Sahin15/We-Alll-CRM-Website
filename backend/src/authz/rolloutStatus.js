/**
 * Authorization V2 — Runtime rollout status from environment flags.
 */

import {
  AUTHZ_MODULE_NAMES,
  AUTHZ_ROLLOUT_WAVES,
  authzModuleEnvKey,
  authzFrontendModuleEnvKey,
} from './rolloutManifest.js';
import {
  isAuthzModuleEnabled,
  isAuthzEnforceEnabled,
  isAuthzShadowEnabled,
} from './moduleFlags.js';

/**
 * @returns {{
 *   enforce: boolean,
 *   shadowMode: boolean,
 *   enabledModuleCount: number,
 *   totalModules: number,
 *   modules: Array<{ name: string, enabled: boolean, backendEnvKey: string, frontendEnvKey: string }>,
 *   waves: Array<{ id: number, name: string, modules: string[], complete: boolean, enabledCount: number }>,
 *   currentWave: number | null,
 *   nextWave: { id: number, name: string, modules: string[] } | null
 * }}
 */
export function getAuthzRolloutStatus() {
  const modules = AUTHZ_MODULE_NAMES.map((name) => ({
    name,
    enabled: isAuthzModuleEnabled(name),
    backendEnvKey: authzModuleEnvKey(name),
    frontendEnvKey: authzFrontendModuleEnvKey(name),
  }));

  const enabledModuleCount = modules.filter((m) => m.enabled).length;

  const waves = AUTHZ_ROLLOUT_WAVES.map((wave) => {
    const enabledCount = wave.modules.filter((name) => isAuthzModuleEnabled(name)).length;
    return {
      id: wave.id,
      name: wave.name,
      modules: [...wave.modules],
      enabledCount,
      complete: enabledCount === wave.modules.length,
    };
  });

  const currentWave =
    waves.find((wave) => wave.enabledCount > 0 && !wave.complete)?.id ??
    (waves.every((wave) => wave.complete) ? waves[waves.length - 1]?.id ?? null : null);

  const nextWaveEntry = waves.find((wave) => !wave.complete) ?? null;
  const nextWave = nextWaveEntry
    ? { id: nextWaveEntry.id, name: nextWaveEntry.name, modules: nextWaveEntry.modules }
    : null;

  return {
    enforce: isAuthzEnforceEnabled(),
    shadowMode: isAuthzShadowEnabled(),
    enabledModuleCount,
    totalModules: AUTHZ_MODULE_NAMES.length,
    modules,
    waves,
    currentWave,
    nextWave,
  };
}
