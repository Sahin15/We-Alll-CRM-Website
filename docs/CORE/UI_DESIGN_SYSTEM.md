---
Purpose: Define visual assets, styling tokens, responsive grids, and design themes for We Alll Office.
Scope: Frontend CSS overrides, bootstrap variables, and theme transitions.
Owner: Frontend Lead / UI Designer
Update Trigger: Major branding upgrades or dashboard visual overhaul.
Dependencies: docs/CORE/CODING_STANDARDS.md
Related Documents: docs/CORE/PROJECT_ARCHITECTURE.md
Status: Active
Version: v1.0.0
Last Updated: 2026-07-17
---

# UI Design System: We Alll Office

This document specifies the design parameters, color tokens, responsive grids, and custom styling overrides implemented across the We Alll Office ERP frontend client.

---

## 1. Color Palette Tokens

The UI maintains a premium, cohesive layout utilizing variables inside `src/index.css`.

| Variable | HEX / HSL Value | Purpose |
| :--- | :--- | :--- |
| `--primary-color` | `#667eea` (Indigo) | Primary buttons, active sidebar items, header accents. |
| `--primary-dark` | `#5a67d8` (Deep Indigo) | Buttons hover state, active elements. |
| `--primary-light`| `#764ba2` (Purple) | Gradients and top bar highlights. |
| `--secondary-color` | `#6c757d` (Muted Grey) | Cancel actions, sub-headers, and borders. |
| `--success-color` | `#10b981` (Emerald Green) | Active states, successful clock-in, verified items. |
| `--warning-color` | `#f59e0b` (Amber Orange) | Late clock-in alerts, pending approvals, Concern alerts. |
| `--danger-color` | `#ef4444` (Crimson Red) | Clock-out confirm, delete buttons, Critical Review warning. |
| `--bg-light` | `#f8f9fa` | Sidebar and page background. |

---

## 2. Dynamic Theme Override: Critical Stage / PIP Warning

To ensure critical status alerts are visually impactful, the frontend dynamically loads a warning theme if the employee is in **Stage 3 (Critical Review/PIP)**:

* **Trigger:** The root app or employee dashboard adds the class `.pip-active` to the `<body>` element.
* **Style Sheet:** `src/styles/pip-theme.css`.
* **Behavior:** Transitions the standard indigo/purple variables to caution colors (soft orange-red gradients, warning banner highlights).

```css
/* Isolated override inside src/styles/pip-theme.css */
body.pip-active {
  --primary-color: #f59e0b; /* Amber */
  --primary-dark: #d97706;
  --primary-light: #b45309;
  --bg-light: #fffbeb;      /* Warning light yellow tint */
}
```

This guarantees the employee is visually aware of their performance review stage instantly, without breaking other modules' internal layouts.

---

## 3. Grid & Responsive Breakpoints

We Alll Office uses **React Bootstrap 5** for grid styling. All views must be fully responsive across these standard device widths:

* **Mobile (Extra Small & Small):** `< 576px` / `< 768px`. The navigation sidebar collapses into a slide-out hamburger menu (`collapsed` state toggled in MobileAppShell). Columns stack vertically (`xs={12}`).
* **Tablet (Medium):** `768px - 992px`. Sidebar collapses to icon-only. Cards shift to 2-column layouts (`md={6}`).
* **Desktop (Large & Extra Large):** `> 992px` / `> 1200px`. Sidebar remains locked open. Full metrics dashboard displayed.

---

## 4. Component Styling Rules

* **Vanilla CSS Controls:** Standard customization must be placed inside local stylesheet overrides (e.g. `src/styles/dashboard-mobile.css`). Avoid writing extensive inline styles.
* **Modals:** Always use Bootstrap `<Modal>` with standard headers and footers. The confirm button should be on the right, and the cancel option on the left.
* **Typography:** Enforce the modern system font stack (Inter, Outfit, or standard browser defaults) for optimal readability. Never use generic serif fallback styles.
