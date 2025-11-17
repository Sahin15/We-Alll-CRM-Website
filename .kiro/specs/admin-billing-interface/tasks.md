# Implementation Plan: Admin Billing Interface

## Overview
This implementation plan breaks down the Admin Billing Interface into discrete, manageable tasks. All code will be written in JavaScript (not TypeScript). Each task builds incrementally on previous work.

---

## Task List

- [x] 1. Set up project structure and core infrastructure



  - Create folder structure for admin interface components
  - Set up React Router configuration for admin routes
  - Create base layout components (AdminLayout, Header, Sidebar)
  - Configure axios instance with interceptors
  - _Requirements: 1.1, 8.1_

- [x] 1.1 Create CompanyContext and provider

  - Implement CompanyContext with selected company state
  - Create useCompany custom hook
  - Add localStorage persistence for company selection
  - _Requirements: 1.1, 1.4_

- [x] 1.2 Create Company Switcher component

  - Build capsule-style toggle UI component
  - Connect to CompanyContext
  - Add smooth transition animations
  - Test company switching updates context
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 1.3 Create NotificationContext and provider

  - Implement NotificationContext with notification state
  - Create useNotifications custom hook
  - Add real-time notification fetching
  - Implement unread count tracking
  - _Requirements: 10.3, 10.4_

- [x] 1.4 Create Notification Bell component

  - Build notification bell icon with badge
  - Create dropdown notification list
  - Implement mark as read functionality
  - Add navigation to relevant records
  - _Requirements: 10.3, 10.4, 10.5, 10.6, 10.7_

- [x] 2. Build shared/reusable components
  - Create DataTable component with sorting and pagination
  - Create SearchBar component with debounced search
  - Create FilterDropdown component
  - Create LoadingSpinner component
  - Create ConfirmDialog component
  - Create Toast notification wrapper
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 10.1, 10.2, 10.8, 10.10_

- [x] 2.1 Create API service layer
  - Set up axios instance with base configuration
  - Implement serviceAPI methods (getAll, create, update, delete, etc.)
  - Implement planAPI methods
  - Implement invoiceAPI methods
  - Implement paymentAPI methods
  - Implement notificationAPI methods
  - Add request/response interceptors for auth and errors
  - _Requirements: All API-related requirements_

- [x] 3. Implement Service Management feature
  - Create ServiceManagement page component
  - Implement service list with category grouping
  - Add company filter integration
  - _Requirements: 2.1, 2.2_

- [x] 3.1 Create ServiceModal component
  - Build form with all service fields (name, category, price, etc.)
  - Implement form validation
  - Add billing cycles multi-select
  - Add dynamic features list input
  - Add specifications fields
  - Connect to serviceAPI for create/update
  - _Requirements: 2.3, 2.4, 2.5_

- [x] 3.2 Add service management actions
  - Implement edit service functionality
  - Implement delete service with validation (check if used in plans)
  - Implement toggle active/inactive status
  - Add drag-and-drop reordering within categories
  - _Requirements: 2.5, 2.6, 2.7, 2.8_

- [x] 4. Implement Plan Management feature
  - Create PlanManagement page component
  - Implement plan list with filtering (by type, status)
  - Add company filter integration
  - Display plan cards with key information
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 4.1 Create PlanBuilder component (multi-step wizard)
  - Build step 1: Basic information form (name, description, type)
  - Build step 2: Service selection with checkboxes by category
  - Build step 3: Pricing configuration (custom prices, override, discount)
  - Build step 4: Review and save
  - Add step navigation with progress indicator
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 4.2 Implement plan pricing logic
  - Calculate auto-calculated price from selected services
  - Implement custom price per service
  - Implement total price override
  - Calculate and display billing cycle intersection
  - Apply discount (fixed or percentage)
  - Display final price calculation breakdown
  - _Requirements: 3.4, 3.5, 3.6, 3.7, 3.8, 3.10_

- [x] 4.3 Create PlanDetailView component
  - Display plan details with all included services
  - Show pricing breakdown
  - Add edit plan functionality
  - Add/remove services from existing plan
  - Update custom service prices
  - Toggle popular status
  - _Requirements: 4.4, 4.5, 4.6, 4.7, 4.8, 4.9_

- [x] 4.4 Implement plan management actions
  - Delete plan with validation (check subscriptions)
  - Toggle active/inactive status
  - Update display order
  - _Requirements: 4.10_

- [x] 5. Implement Invoice Management feature



  - Create InvoiceManagement page component
  - Implement invoice list with status filters
  - Add date range filtering
  - Display invoice cards with key information
  - _Requirements: 5.1, 5.2_

- [x] 5.1 Create InvoiceForm component

  - Build subscription selection dropdown
  - Auto-populate invoice items from subscription
  - Implement custom line item addition
  - Calculate subtotal, tax, and total automatically
  - Add issue date and due date pickers
  - Add notes and terms fields
  - _Requirements: 5.3, 5.4, 5.5, 5.6, 5.7_

- [x] 5.2 Implement invoice actions

  - Save invoice as draft
  - Send invoice (mark as sent, trigger notification)
  - Generate PDF with company branding
  - Display invoice number (auto-generated)
  - _Requirements: 5.8, 5.9, 5.10_

- [x] 6. Implement Payment Verification feature







  - Create PaymentVerification page component
  - Implement payment queue list
  - Display pending payment count badge
  - Add filtering by payment method
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 6.1 Create PaymentVerificationModal component

  - Display full payment details
  - Show payment proof image with zoom functionality
  - Display payment method specific details (bank, UPI, cash)
  - Show client notes
  - Add admin notes textarea
  - _Requirements: 6.4, 6.5, 6.6, 6.7, 6.8_

- [x] 6.2 Implement payment verification actions

  - Verify payment (mark as verified, activate subscription, send notification)
  - Reject payment (require reason, send notification)
  - Update invoice status to paid on verification
  - Record verifying user and timestamp
  - _Requirements: 6.9, 6.10, 6.11, 6.12_

- [x] 7. Implement Dashboard feature
  - Create Dashboard page component
  - Fetch and display revenue cards (current month, previous month, YTD)
  - Display quick stats (active subscriptions, pending payments, overdue invoices)
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 7.1 Add dashboard charts and lists
  - Implement revenue trend chart (12 months)
  - Display popular services list (top 5)
  - Display popular plans list (top 5)
  - Add recent activity feed
  - _Requirements: 7.4, 7.5, 7.6, 7.7_

- [x] 7.2 Add dashboard filtering and company context
  - Implement date range filter
  - Update metrics when company context changes
  - Add refresh functionality
  - _Requirements: 7.8, 7.9_

- [ ] 8. Implement responsive design and accessibility
  - Make all components responsive (desktop, tablet)
  - Add proper ARIA labels and roles
  - Implement keyboard navigation
  - Ensure color contrast ratios
  - Add focus indicators
  - Test with screen readers
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [ ] 8.1 Add loading and error states
  - Implement loading spinners for async operations
  - Add error message displays
  - Disable buttons during processing
  - Add confirmation dialogs for destructive actions
  - _Requirements: 8.7, 8.8, 10.8, 10.9, 10.10_

- [ ] 9. Implement data table enhancements
  - Add real-time search filtering
  - Implement column sorting (ascending/descending)
  - Add pagination controls
  - Implement rows per page selector
  - Display total count and page range
  - Add filter dropdowns for categorical data
  - Persist table state in URL or localStorage
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8_

- [ ] 10. Implement toast notifications and feedback
  - Add success toast for successful operations
  - Add error toast for failed operations
  - Implement toast auto-dismiss (3 seconds)
  - Add different toast types with icons
  - _Requirements: 10.1, 10.2, 10.5_

- [ ] 11. Add routing and navigation
  - Configure React Router with admin routes
  - Implement protected routes with auth check
  - Add sidebar navigation with active states
  - Implement breadcrumb navigation
  - Add 404 page for invalid routes
  - _Requirements: All navigation-related requirements_

- [ ] 12. Integrate with backend APIs
  - Connect all components to backend APIs
  - Test service CRUD operations
  - Test plan CRUD operations
  - Test invoice CRUD operations
  - Test payment verification
  - Test notification fetching
  - Handle API errors gracefully
  - _Requirements: All API integration requirements_

- [ ] 13. Add form validation
  - Implement client-side validation for all forms
  - Display inline validation errors
  - Prevent form submission with invalid data
  - Add helpful error messages
  - _Requirements: All form-related requirements_

- [ ] 14. Implement file upload for payment proofs
  - Add file upload component with drag-and-drop
  - Validate file types (images only)
  - Validate file size (max 5MB)
  - Display upload progress
  - Show preview of uploaded image
  - _Requirements: 6.5_

- [ ] 15. Add company-specific branding
  - Load company logos dynamically
  - Apply company-specific color schemes
  - Update invoice templates with company branding
  - _Requirements: 5.10_

- [ ] 16. Performance optimization
  - Implement code splitting for routes
  - Add React.memo for expensive components
  - Debounce search inputs
  - Optimize image loading
  - _Requirements: Performance requirements_

- [ ] 17. Final testing and bug fixes
  - Test complete service creation flow
  - Test complete plan building flow
  - Test payment verification workflow
  - Test invoice creation and sending
  - Test company switching across all pages
  - Fix any bugs found during testing
  - _Requirements: All requirements_

- [ ] 18. Documentation and deployment preparation
  - Add inline code comments
  - Create component documentation
  - Update README with setup instructions
  - Prepare environment variables
  - Create build configuration
  - _Requirements: Deployment requirements_

---

## Notes

- All tasks should be implemented in JavaScript (not TypeScript)
- Use React functional components with hooks
- Use React Bootstrap for UI components
- Follow existing code style and conventions
- Test each feature after implementation
- Ensure company context filtering works across all features
- Maintain responsive design throughout
- Add proper error handling and loading states
