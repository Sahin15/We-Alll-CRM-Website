// Expense Purpose Constants
export const EXPENSE_PURPOSES = {
  internal_office: "Internal Office",
  existing_client: "Existing Client",
  prospective_client: "Prospective Client",
  seminar: "Seminar",
  expo: "Expo",
  vendor_meeting: "Vendor Meeting",
  recruitment: "Recruitment",
  training: "Training",
  marketing_activity: "Marketing Activity",
  team_activity: "Team Activity",
  travel_visit: "Travel Visit",
};

export const EXPENSE_PURPOSES_ARRAY = Object.entries(EXPENSE_PURPOSES).map(([key, value]) => ({
  value: key,
  label: value,
}));

// Expense Type Constants
export const EXPENSE_TYPES = {
  food: "Food",
  travel: "Travel",
  hotel: "Hotel",
  transport: "Transport",
  materials: "Materials",
  entry_fee: "Entry Fee",
  gift: "Gift",
  printing: "Printing",
  miscellaneous: "Miscellaneous",
};

export const EXPENSE_TYPES_ARRAY = Object.entries(EXPENSE_TYPES).map(([key, value]) => ({
  value: key,
  label: value,
}));

// Color mapping for badges
export const PURPOSE_COLORS = {
  internal_office: "primary",
  existing_client: "success",
  prospective_client: "info",
  seminar: "warning",
  expo: "warning",
  vendor_meeting: "secondary",
  recruitment: "danger",
  training: "info",
  marketing_activity: "primary",
  team_activity: "success",
  travel_visit: "secondary",
};

export const TYPE_COLORS = {
  food: "success",
  travel: "primary",
  hotel: "info",
  transport: "secondary",
  materials: "warning",
  entry_fee: "danger",
  gift: "primary",
  printing: "secondary",
  miscellaneous: "dark",
};

// Helper function to get purpose label
export const getPurposeLabel = (purpose) => {
  return EXPENSE_PURPOSES[purpose] || purpose;
};

// Helper function to get type label
export const getTypeLabel = (type) => {
  return EXPENSE_TYPES[type] || type;
};

// Helper function to get purpose color
export const getPurposeColor = (purpose) => {
  return PURPOSE_COLORS[purpose] || "secondary";
};

// Helper function to get type color
export const getTypeColor = (type) => {
  return TYPE_COLORS[type] || "secondary";
};

// Legacy category mapping (for backward compatibility)
export const LEGACY_CATEGORIES = {
  travel: "Travel",
  food: "Food & Meals",
  accommodation: "Accommodation",
  office_supplies: "Office Supplies",
  client_meeting: "Client Meeting",
  training: "Training",
  other: "Other",
};

// Map old categories to new Purpose/Type
export const CATEGORY_TO_PURPOSE_TYPE = {
  travel: { expensePurpose: "travel_visit", expenseType: "travel" },
  food: { expensePurpose: "internal_office", expenseType: "food" },
  accommodation: { expensePurpose: "travel_visit", expenseType: "hotel" },
  office_supplies: { expensePurpose: "internal_office", expenseType: "materials" },
  client_meeting: { expensePurpose: "existing_client", expenseType: "food" },
  training: { expensePurpose: "training", expenseType: "materials" },
  other: { expensePurpose: "internal_office", expenseType: "miscellaneous" },
};
