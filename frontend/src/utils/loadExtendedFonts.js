/** @type {boolean} */
let extendedFontsLoaded = false;

/**
 * Load additional Inter weights after login (not on login critical path).
 * Login uses 400 + 600 from main.jsx; dashboard headings may use 300/500/700/800.
 */
export function loadExtendedInterFonts() {
  if (extendedFontsLoaded) return;
  extendedFontsLoaded = true;
  import("@fontsource/inter/300.css");
  import("@fontsource/inter/500.css");
  import("@fontsource/inter/700.css");
  import("@fontsource/inter/800.css");
}
