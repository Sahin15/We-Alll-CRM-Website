---
Purpose: Guide human developers and AI assistants on coding conventions, folder architecture, and backend/frontend coding standards.
Scope: Node.js, Express, React, and Database interaction coding style.
Owner: Chief Software Architect
Update Trigger: Addition of new framework layers or major tool upgrades.
Dependencies: None
Related Documents: docs/CORE/AI_DEVELOPMENT_GUIDE.md, docs/CORE/UI_DESIGN_SYSTEM.md
Status: Active
Version: v1.0.0
Last Updated: 2026-07-17
---

# Coding Standards: We Alll Office

This document specifies the code styling guidelines, patterns, and quality standards for backend, frontend, and database development. All developers and AI coding agents must enforce these rules strictly.

---

## 1. General Principles

* **Self-Documenting Code:** Write clean variable, function, and component names. Avoid redundant comments that explain *what* the code does; write comments only to explain *why* non-obvious architecture was chosen.
* **Keep Code DRY (Don't Repeat Yourself):** Extract common logic (e.g., date formats, attendance hour calculations) into utility functions.
* **Single Responsibility Principle (SRP):** Controllers handle routing inputs/outputs, models define schemas/methods, and services/helpers handle heavy calculations or external APIs.

---

## 2. Backend Coding Standards (Node.js & Express)

### 2.1 ESM Import Syntax
The backend operates strictly using **ES Modules (ESM)**. Always specify file extensions when importing local modules:
```javascript
// Correct
import User from "../models/userModel.js";
import { protect } from "../middleware/authMiddleware.js";

// Incorrect - missing .js extension
import User from "../models/userModel";
```

### 2.2 Controller Error Handling
Always wrap controller logic in `try-catch` blocks. Standardize response payload checks:
* Never return raw database stack errors to the client.
* Log backend failures with context details using Winston or standard logs.
* Use status code `400` for validation issues, `401` for unauthenticated sessions, `403` for unauthorized permissions, and `500` for system crashes.

```javascript
export const createDepartment = async (req, res) => {
  try {
    const { name, head } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: "Department name is required" });
    }
    
    const newDept = await Department.create({ name, head });
    res.status(201).json({ success: true, data: newDept });
  } catch (error) {
    console.error("Error in createDepartment:", error);
    res.status(500).json({ success: false, message: "Server error creating department" });
  }
};
```

### 2.3 Database Queries & Transaction safety
* **Lean Queries:** For read-only operations, append `.lean()` to Mongoose queries to speed up execution by returning plain JSON objects instead of heavy Mongoose documents.
* **Schema Validation:** Enforce database consistency at the schema level using enum types, default settings, and matching regexes (e.g., email validation).

---

## 3. Frontend Coding Standards (React & Vite)

### 3.1 Component Architecture
* **Functional Components:** All components must use React hooks (no legacy class components).
* **State Management:** Keep state as local as possible. Move shared variables to global Context providers (e.g., AuthContext, NotificationContext) only when multiple non-adjacent pages must read/write them.
* **Lazy Loading:** For dashboard sub-pages, configure chunk-based loading in `src/routes/lazyPages.js` to ensure the core bundle loads quickly.

### 3.2 API Interactions & Axios Interceptors
* **No Inline Axios Calls:** All requests must pass through the configured wrapper files (e.g., `src/api/`) or the base `api` Axios interceptor.
* **Loader States:** Always display loader indicators (`Spinner`) during asynchronous API execution to keep the user interface responsive.

---

## 4. Naming Conventions

| Entity | Case | Example |
| :--- | :--- | :--- |
| **Backend File Names** | camelCase | `userController.js`, `growthTrackModel.js` |
| **Frontend Page/Component Files** | PascalCase | `EmployeeDashboard.jsx`, `GreetingBanner.jsx` |
| **Variables & Functions** | camelCase | `isActive`, `calculateWorkHours()` |
| **Database Collections** | plural, lowercase | `users`, `departments`, `growthtracks` |
| **CSS Classes** | kebab-case | `.pip-banner`, `.dashboard-card` |
| **Environment Variables** | UPPER_SNAKE_CASE | `MONGODB_URI`, `VITE_API_URL` |
