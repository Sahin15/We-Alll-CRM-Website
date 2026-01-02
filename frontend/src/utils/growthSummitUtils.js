// Growth Summit Utility Functions

/**
 * Reset the Growth Summit floating button visibility
 * This will make the button appear again even if it was previously dismissed
 */
export const resetGrowthSummitButton = () => {
  localStorage.removeItem('growthSummitButtonDismissed');
  console.log('Growth Summit button visibility reset - button will appear on next page load');
};

/**
 * Check if Growth Summit button was dismissed
 */
export const isGrowthSummitButtonDismissed = () => {
  return localStorage.getItem('growthSummitButtonDismissed') === 'true';
};

/**
 * Dismiss the Growth Summit button programmatically
 */
export const dismissGrowthSummitButton = () => {
  localStorage.setItem('growthSummitButtonDismissed', 'true');
  console.log('Growth Summit button dismissed programmatically');
};