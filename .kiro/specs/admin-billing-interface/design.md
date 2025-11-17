# Design Document: Admin Billing Interface

## Overview

The Admin Billing Interface is a React-based web application that provides administrators with comprehensive tools to manage the dual-company billing system. The interface follows a modern, component-based architecture using React, React Router, and Bootstrap for styling.

### Technology Stack

- **Frontend Framework**: React 18+
- **Routing**: React Router v6
- **State Management**: React Context API + Custom Hooks
- **UI Framework**: React Bootstrap
- **HTTP Client**: Axios
- **Form Handling**: React Hook Form
- **Notifications**: React Toastify
- **Icons**: React Icons
- **Date Handling**: date-fns
- **File Upload**: React Dropzone

---

## Architecture

### Component Hierarchy

```
App
├── AdminLayout
│   ├── Header
│   │   ├── CompanySwitcher
│   │   ├── NotificationBell
│   │   └── UserMenu
│   ├── Sidebar
│   └── MainContent
│       ├── Dashboard
│       ├── ServiceManagement
│       │   ├── ServiceList
│       │   ├── ServiceModal
│       │   └── ServiceCategoryGroup
│       ├── PlanManagement
│       │   ├── PlanList
│       │   ├── PlanBuilder
│       │   ├── PlanDetailView
│       │   └── ServiceSelector
│       ├── InvoiceManagement
│       │   ├── InvoiceList
│       │   ├── InvoiceForm
│       │   └── InvoicePDFViewer
│       ├── PaymentVerification
│       │   ├── PaymentQueue
│       │   ├── PaymentVerificationModal
│       │   └── PaymentProofViewer
│       └── NotificationCenter
└── Shared Components
    ├── DataTable
    ├── SearchBar
    ├── FilterDropdown
    ├── Pagination
    ├── LoadingSpinner
    ├── ConfirmDialog
    └── Toast
```

### State Management Architecture


**Context Providers:**

1. **CompanyContext** - Manages selected company state
2. **AuthContext** - Manages user authentication and permissions
3. **NotificationContext** - Manages notification state and unread count
4. **ThemeContext** - Manages UI theme preferences (optional)

**Custom Hooks:**

1. **useCompany()** - Access and update company context
2. **useAuth()** - Access authentication state and methods
3. **useNotifications()** - Fetch and manage notifications
4. **useServices()** - CRUD operations for services
5. **usePlans()** - CRUD operations for plans
6. **useInvoices()** - CRUD operations for invoices
7. **usePayments()** - Payment verification operations
8. **useDataTable()** - Reusable table state management

---

## Components and Interfaces

### 1. Company Switcher Component

**Purpose**: Toggle between "We Alll" and "Kolkata Digital" company contexts

**Props**: None (uses CompanyContext)

**State**:
- `selectedCompany`: string ("We Alll" | "Kolkata Digital")

**UI Design**:
```jsx
<div className="company-switcher">
  <button 
    className={selectedCompany === "We Alll" ? "active" : ""}
    onClick={() => setCompany("We Alll")}
  >
    We Alll
  </button>
  <button 
    className={selectedCompany === "Kolkata Digital" ? "active" : ""}
    onClick={() => setCompany("Kolkata Digital")}
  >
    Kolkata Digital
  </button>
</div>
```

**Styling**: Capsule-style toggle with smooth transitions

---

### 2. Service Management Components

#### ServiceList Component

**Purpose**: Display services grouped by category

**Props**:
- `company`: string

**State**:
- `services`: Service[]
- `loading`: boolean
- `selectedCategory`: string | null

**Key Features**:
- Accordion-style category groups
- Drag-and-drop reordering within categories
- Inline edit/delete actions
- Active/inactive toggle

#### ServiceModal Component

**Purpose**: Create or edit service

**Props**:
- `service`: Service | null (null for create)
- `onSave`: (service: Service) => void
- `onClose`: () => void

**Form Fields**:
- Name (text, required)
- Category (select/text, required)
- Description (textarea)
- Base Price (number, required)
- Allowed Billing Cycles (multi-select checkboxes)
- Features (dynamic list)
- Specifications (nested object)
- Tags (tag input)
- Is Popular (checkbox)

**Validation**:
- Name: 3-100 characters
- Base Price: > 0
- At least one billing cycle selected

---

### 3. Plan Builder Components

#### PlanBuilder Component

**Purpose**: Multi-step wizard for creating plans

**Steps**:
1. Basic Information (name, description, plan type)
2. Service Selection (checkboxes by category)
3. Pricing Configuration (custom prices, override, discount)
4. Review & Save

**State**:
- `currentStep`: number
- `planData`: Partial<Plan>
- `selectedServices`: string[]
- `customPrices`: Record<string, number>
- `autoCalculatedPrice`: number
- `finalPrice`: number

**Key Features**:
- Step navigation with progress indicator
- Real-time price calculation
- Service preview cards
- Billing cycle intersection display
- Discount calculator

#### ServiceSelector Component

**Purpose**: Display services with checkboxes for selection

**Props**:
- `services`: Service[]
- `selectedIds`: string[]
- `onSelectionChange`: (ids: string[]) => void
- `customPrices`: Record<string, number>
- `onPriceChange`: (serviceId: string, price: number) => void

**UI Design**:
- Services grouped by category
- Checkbox + service card layout
- Inline custom price input
- Visual indication of selected services

---

### 4. Invoice Management Components

#### InvoiceForm Component

**Purpose**: Create or edit invoice

**Props**:
- `invoice`: Invoice | null
- `onSave`: (invoice: Invoice) => void

**Form Sections**:
1. Subscription Selection (dropdown)
2. Invoice Details (issue date, due date)
3. Line Items (auto-populated + custom)
4. Pricing (subtotal, tax, total)
5. Notes & Terms

**Key Features**:
- Auto-populate from subscription
- Add custom line items
- Tax calculation
- PDF preview
- Save as draft or send

---

### 5. Payment Verification Components

#### PaymentQueue Component

**Purpose**: List pending payments

**Props**: None (fetches data)

**Columns**:
- Client Name
- Invoice Number
- Amount
- Payment Date
- Payment Method
- Submission Date
- Actions (View button)

**Features**:
- Badge showing pending count
- Sort by submission date
- Filter by payment method
- Quick view modal

#### PaymentVerificationModal Component

**Purpose**: Review and verify/reject payment

**Props**:
- `payment`: Payment
- `onVerify`: (notes: string) => void
- `onReject`: (reason: string) => void
- `onClose`: () => void

**Sections**:
1. Payment Details (amount, method, date)
2. Payment Proof (image viewer with zoom)
3. Client Notes (read-only)
4. Admin Notes (textarea)
5. Actions (Verify / Reject buttons)

**Key Features**:
- Zoomable image viewer
- Copy transaction ID
- Rejection reason required
- Confirmation before action

---

### 6. Dashboard Components

#### Dashboard Component

**Purpose**: Display key metrics and analytics

**Widgets**:
1. Revenue Cards (current month, previous month, YTD)
2. Quick Stats (active subscriptions, pending payments, overdue invoices)
3. Revenue Chart (12-month trend)
4. Popular Services (top 5)
5. Popular Plans (top 5)
6. Recent Activity Feed

**Data Fetching**:
- Separate API calls for each widget
- Loading states per widget
- Error handling per widget
- Refresh button

---

## Data Models

### Frontend TypeScript Interfaces

```typescript
interface Service {
  _id: string;
  name: string;
  company: "We Alll" | "Kolkata Digital";
  category: string;
  description?: string;
  basePrice: number;
  allowedBillingCycles: BillingCycle[];
  features: string[];
  specifications?: {
    deliveryTime?: string;
    revisions?: number;
    supportType?: string;
    teamSize?: string;
  };
  tags?: string[];
  isActive: boolean;
  isPopular: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface Plan {
  _id: string;
  name: string;
  company: "We Alll" | "Kolkata Digital";
  description?: string;
  includedServices: IncludedService[];
  autoCalculatedPrice: number;
  overridePrice?: number;
  finalPrice: number;
  allowedBillingCycles: BillingCycle[];
  planType: "basic" | "standard" | "premium" | "enterprise" | "custom";
  discount: number;
  discountType: "percentage" | "fixed";
  additionalFeatures: string[];
  isActive: boolean;
  isPopular: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface IncludedService {
  service: string | Service;
  name: string;
  basePrice: number;
  customPrice?: number;
  features: string[];
}

interface Invoice {
  _id: string;
  invoiceNumber: string;
  client: string | Client;
  subscription: string | Subscription;
  company: "We Alll" | "Kolkata Digital";
  companyDetails: CompanyDetails;
  clientDetails: ClientDetails;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  taxPercentage: number;
  taxAmount: number;
  totalAmount: number;
  status: "draft" | "sent" | "paid" | "overdue";
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  notes?: string;
  termsAndConditions?: string;
  issuedBy: string | User;
  createdAt: string;
  updatedAt: string;
}

interface Payment {
  _id: string;
  paymentNumber: string;
  client: string | Client;
  invoice: string | Invoice;
  subscription: string | Subscription;
  amount: number;
  paymentMethod: "bank_transfer" | "upi" | "cash";
  bankDetails?: BankDetails;
  upiDetails?: UpiDetails;
  cashDetails?: CashDetails;
  paymentProof?: string;
  paymentDate: string;
  status: "pending" | "verified" | "rejected";
  verifiedBy?: string | User;
  verifiedAt?: string;
  rejectionReason?: string;
  rejectedBy?: string | User;
  rejectedAt?: string;
  clientNotes?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

type BillingCycle = "monthly" | "quarterly" | "half-yearly" | "yearly" | "one-time";
```

---

## API Integration

### API Service Layer

**Structure**: Centralized API service with method grouping

```typescript
// services/api.ts
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const serviceAPI = {
  getAll: (params) => api.get('/services', { params }),
  getById: (id) => api.get(`/services/${id}`),
  getByCategory: (params) => api.get('/services/by-category', { params }),
  getCategories: (params) => api.get('/services/categories', { params }),
  create: (data) => api.post('/services', data),
  update: (id, data) => api.put(`/services/${id}`, data),
  delete: (id) => api.delete(`/services/${id}`),
  toggleStatus: (id) => api.patch(`/services/${id}/toggle-status`),
  updateDisplayOrder: (data) => api.post('/services/display-order', data),
};

export const planAPI = {
  getAll: (params) => api.get('/plans', { params }),
  getById: (id) => api.get(`/plans/${id}`),
  getForComparison: (params) => api.get('/plans/comparison', { params }),
  create: (data) => api.post('/plans', data),
  update: (id, data) => api.put(`/plans/${id}`, data),
  delete: (id) => api.delete(`/plans/${id}`),
  toggleStatus: (id) => api.put(`/plans/${id}/toggle-status`),
  addService: (id, data) => api.post(`/plans/${id}/services`, data),
  removeService: (id, serviceId) => api.delete(`/plans/${id}/services/${serviceId}`),
  updateServicePrice: (id, serviceId, data) => api.patch(`/plans/${id}/services/${serviceId}/price`, data),
};

export const invoiceAPI = {
  getAll: (params) => api.get('/invoices', { params }),
  getById: (id) => api.get(`/invoices/${id}`),
  create: (data) => api.post('/invoices', data),
  update: (id, data) => api.put(`/invoices/${id}`, data),
  delete: (id) => api.delete(`/invoices/${id}`),
  send: (id) => api.post(`/invoices/${id}/send`),
  generatePDF: (id) => api.get(`/invoices/${id}/pdf`, { responseType: 'blob' }),
};

export const paymentAPI = {
  getAll: (params) => api.get('/payments', { params }),
  getById: (id) => api.get(`/payments/${id}`),
  verify: (id, data) => api.patch(`/payments/${id}/verify`, data),
  reject: (id, data) => api.patch(`/payments/${id}/reject`, data),
};

export const notificationAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
};
```

---

## Error Handling

### Error Handling Strategy

1. **API Level**: Axios interceptors catch HTTP errors
2. **Component Level**: Try-catch blocks with user-friendly messages
3. **Global Level**: Error boundary component for React errors

**Error Display**:
- Toast notifications for operation failures
- Inline form validation errors
- Error states in data tables
- Fallback UI for component errors

---

## Testing Strategy

### Unit Tests
- Custom hooks (useServices, usePlans, etc.)
- Utility functions (price calculations, date formatting)
- Form validation logic

### Component Tests
- Service modal form submission
- Plan builder step navigation
- Payment verification modal actions
- Data table filtering and sorting

### Integration Tests
- Complete service creation flow
- Complete plan building flow
- Payment verification workflow
- Invoice creation and sending

### E2E Tests
- Admin login and company switching
- Create service → Create plan → View plan
- Payment submission → Verification → Subscription activation

---

## Performance Optimization

### Strategies

1. **Code Splitting**: Lazy load routes and heavy components
2. **Memoization**: Use React.memo for expensive components
3. **Virtualization**: Virtual scrolling for large lists
4. **Debouncing**: Search inputs and filter changes
5. **Caching**: Cache API responses with React Query or SWR
6. **Image Optimization**: Lazy load images, use appropriate formats
7. **Bundle Optimization**: Tree shaking, minification

---

## Security Considerations

### Frontend Security

1. **Authentication**: JWT token stored in httpOnly cookie or localStorage
2. **Authorization**: Role-based route protection
3. **XSS Prevention**: Sanitize user inputs, use dangerouslySetInnerHTML carefully
4. **CSRF Protection**: CSRF tokens for state-changing operations
5. **Secure Communication**: HTTPS only in production
6. **Input Validation**: Client-side validation (not relied upon for security)
7. **File Upload**: Validate file types and sizes before upload

---

## Accessibility

### WCAG 2.1 AA Compliance

1. **Keyboard Navigation**: All interactive elements accessible via keyboard
2. **Screen Reader Support**: Proper ARIA labels and roles
3. **Color Contrast**: Minimum 4.5:1 for normal text, 3:1 for large text
4. **Focus Indicators**: Visible focus states for all interactive elements
5. **Form Labels**: Proper label associations
6. **Error Identification**: Clear error messages with suggestions
7. **Responsive Text**: Text resizable up to 200% without loss of functionality

---

## Deployment Considerations

### Build Configuration

- **Development**: Hot reload, source maps, verbose errors
- **Staging**: Minified, source maps, error tracking
- **Production**: Minified, no source maps, error tracking, analytics

### Environment Variables

```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_COMPANY_WE_ALLL_LOGO=/assets/we-alll-logo.png
REACT_APP_COMPANY_KOLKATA_DIGITAL_LOGO=/assets/kolkata-digital-logo.png
REACT_APP_MAX_FILE_SIZE=5242880
REACT_APP_ALLOWED_FILE_TYPES=image/jpeg,image/png,image/jpg
```

---

## Design System

### Color Palette

**We Alll Branding**:
- Primary: #007bff
- Secondary: #6c757d
- Success: #28a745
- Danger: #dc3545
- Warning: #ffc107

**Kolkata Digital Branding**:
- Primary: #6f42c1
- Secondary: #6c757d
- Success: #28a745
- Danger: #dc3545
- Warning: #ffc107

### Typography

- **Headings**: Inter, sans-serif
- **Body**: Inter, sans-serif
- **Monospace**: 'Courier New', monospace

### Spacing Scale

- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- 2xl: 48px

---

## Next Steps

After design approval, proceed to implementation tasks in tasks.md.
