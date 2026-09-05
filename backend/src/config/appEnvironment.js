/**
 * Application environment helpers (development | uat | production).
 * APP_ENV takes precedence over NODE_ENV for deploy-target semantics.
 */

export const APP_ENV =
  process.env.APP_ENV || process.env.NODE_ENV || "development";

/** @returns {boolean} */
export const isUat = () => APP_ENV === "uat";

/** @returns {boolean} */
export const isProduction = () =>
  APP_ENV === "production" ||
  (APP_ENV !== "uat" &&
    String(process.env.NODE_ENV || "").toLowerCase() === "production");

/** @returns {boolean} */
export const isDevelopment = () =>
  !isUat() && !isProduction();
