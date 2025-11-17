# Requirements Document: Admin Billing Interface

## Introduction

This document outlines the requirements for the Admin Billing Interface, which enables administrators to manage the dual-company billing system (We Alll & Kolkata Digital). The interface provides tools for company switching, service management, plan building, invoice creation, and payment verification.

## Glossary

- **Admin Interface**: The web-based user interface accessible only to administrators and accountants
- **Company Switcher**: A UI component that allows admins to toggle between "We Alll" and "Kolkata Digital" contexts
- **Service**: An individual billable offering (e.g., SEO Optimization, Social Media Management)
- **Plan**: A package composed of multiple services with calculated or overridden pricing
- **Plan Builder**: A visual interface for creating plans by selecting services
- **Payment Verification Queue**: A list of pending payment submissions awaiting admin verification
- **Invoice**: A billing document manually created by admin for a subscription
- **Payment Proof**: A file (screenshot/photo) uploaded by client showing payment confirmation
- **Subscription**: A client's active or pending service agreement based on a plan
- **Extra Service**: An additional service added to a subscription beyond the base plan

---

## Requirements

### Requirement 1: Company Context Management

**User Story:** As an admin, I want to switch between "We Alll" and "Kolkata Digital" company contexts, so that I can manage services and plans for each company independently.

#### Acceptance Criteria

1. WHEN THE Admin Interface loads, THE System SHALL display a company switcher component in the global header
2. THE Company Switcher SHALL display two options: "We Alll" and "Kolkata Digital" in a capsule-style toggle format
3. WHEN the admin selects a company, THE System SHALL update all data displays to show only information for the selected company
4. THE System SHALL persist the selected company context across page navigation within the admin session
5. WHEN the company context changes, THE System SHALL reload all data tables and lists to reflect the new company filter

---

### Requirement 2: Service Management Interface

**User Story:** As an admin, I want to create, view, edit, and organize services by category, so that I can maintain the service catalog for plan building.

#### Acceptance Criteria

1. THE Admin Interface SHALL display a service management page showing services grouped by category
2. WHEN viewing services, THE System SHALL display service name, base price, billing cycles, and active status for each service
3. WHEN the admin clicks "Add Service", THE System SHALL display a modal form with fields for name, category, description, base price, billing cycles, features, and specifications
4. WHEN the admin submits a valid service form, THE System SHALL create the service and associate it with the currently selected company
5. WHEN the admin clicks "Edit" on a service, THE System SHALL populate the form with existing service data and allow modifications
6. THE System SHALL provide drag-and-drop functionality to reorder services within each category
7. WHEN the admin clicks "Delete" on a service, THE System SHALL check if the service is used in any plans and prevent deletion if true
8. THE System SHALL display an active/inactive toggle for each service to control visibility

---

### Requirement 3: Plan Builder Interface

**User Story:** As an admin, I want to create plans by selecting multiple services and setting pricing rules, so that I can offer service packages to clients.

#### Acceptance Criteria

1. THE Admin Interface SHALL display a plan builder page with a list of existing plans and a "Create Plan" button
2. WHEN the admin clicks "Create Plan", THE System SHALL display a multi-step wizard interface
3. THE Plan Builder SHALL display all active services for the selected company, organized by category with checkboxes
4. WHEN the admin selects services, THE System SHALL calculate and display the auto-calculated price as the sum of selected service base prices
5. THE System SHALL allow the admin to set custom prices for individual services within the plan
6. THE System SHALL allow the admin to override the total plan price with a custom amount
7. THE System SHALL calculate and display allowed billing cycles as the intersection of all selected services' billing cycles
8. THE System SHALL allow the admin to apply discounts (fixed amount or percentage) to the plan
9. WHEN the admin saves the plan, THE System SHALL create service snapshots preserving current service details
10. THE Plan Builder SHALL display a preview showing plan name, included services, pricing breakdown, and final price before saving

---

### Requirement 4: Plan Management Interface

**User Story:** As an admin, I want to view, edit, and manage existing plans, so that I can maintain accurate pricing and service offerings.

#### Acceptance Criteria

1. THE Admin Interface SHALL display a plan list page showing all plans for the selected company
2. WHEN viewing plans, THE System SHALL display plan name, plan type, final price, number of services, and active status
3. THE System SHALL provide filtering options by plan type (basic, standard, premium, enterprise) and active status
4. WHEN the admin clicks on a plan, THE System SHALL display detailed view showing all included services with individual prices
5. THE System SHALL allow the admin to add services to an existing plan through a service selection modal
6. THE System SHALL allow the admin to remove services from a plan, preventing removal if it is the last service
7. THE System SHALL allow the admin to update custom prices for services within a plan
8. WHEN plan services or pricing change, THE System SHALL recalculate the final price automatically
9. THE System SHALL provide a toggle to mark plans as "popular" for client-facing displays
10. WHEN the admin attempts to delete a plan, THE System SHALL check for active subscriptions and prevent deletion if any exist

---

### Requirement 5: Invoice Management Interface

**User Story:** As an admin, I want to manually create and manage invoices for client subscriptions, so that I can bill clients according to their subscription terms.

#### Acceptance Criteria

1. THE Admin Interface SHALL display an invoice management page with a list of all invoices
2. THE System SHALL provide filters for invoice status (draft, sent, paid, overdue) and date range
3. WHEN the admin clicks "Create Invoice", THE System SHALL display a form to select a subscription and set invoice details
4. THE System SHALL auto-populate invoice items from the subscription's plan and extra services
5. THE System SHALL calculate subtotal, tax amount (based on configurable tax percentage), and total amount automatically
6. THE System SHALL allow the admin to add custom line items to the invoice
7. THE System SHALL allow the admin to set issue date and due date for the invoice
8. WHEN the admin saves an invoice, THE System SHALL generate a unique invoice number in format "INV-YYYY-####"
9. THE System SHALL provide a "Send Invoice" action that marks the invoice as sent and triggers a notification to the client
10. THE System SHALL generate a PDF version of the invoice with company-specific branding based on the selected company

---

### Requirement 6: Payment Verification Queue

**User Story:** As an accountant, I want to review and verify payment submissions from clients, so that I can activate subscriptions after confirming payment receipt.

#### Acceptance Criteria

1. THE Admin Interface SHALL display a payment verification queue showing all pending payment submissions
2. WHEN viewing the queue, THE System SHALL display client name, invoice number, amount, payment date, payment method, and submission date
3. THE System SHALL provide a visual indicator (badge or icon) showing the number of pending verifications
4. WHEN the accountant clicks "View" on a payment, THE System SHALL display a verification modal with full payment details
5. THE Verification Modal SHALL display the uploaded payment proof image in a zoomable viewer
6. THE System SHALL display payment method details (bank account, transaction ID, UPI ID, etc.) based on the payment method
7. THE System SHALL display client notes explaining the payment submission
8. THE System SHALL provide a text field for accountant to add admin notes during verification
9. WHEN the accountant clicks "Verify Payment", THE System SHALL mark the payment as verified, activate the associated subscription, and send a notification to the client
10. WHEN the accountant clicks "Reject Payment", THE System SHALL require a rejection reason, mark the payment as rejected, and send a notification to the client with the reason
11. THE System SHALL update the invoice status to "paid" when a payment is verified
12. THE System SHALL record the verifying user and verification timestamp for audit purposes

---

### Requirement 7: Dashboard and Analytics

**User Story:** As an admin, I want to view key metrics and analytics for the billing system, so that I can monitor business performance and identify trends.

#### Acceptance Criteria

1. THE Admin Interface SHALL display a dashboard page as the default landing page
2. THE Dashboard SHALL display total revenue for the selected company for current month, previous month, and year-to-date
3. THE System SHALL display counts of active subscriptions, pending payments, and overdue invoices
4. THE Dashboard SHALL display a chart showing revenue trends over the last 12 months
5. THE System SHALL display a list of most popular services based on subscription count
6. THE Dashboard SHALL display a list of most popular plans based on subscription count
7. THE System SHALL display recent activity feed showing latest subscriptions, payments, and invoices
8. THE System SHALL allow filtering dashboard data by date range
9. THE Dashboard SHALL display separate metrics when company context is switched

---

### Requirement 8: Responsive Design and Accessibility

**User Story:** As an admin, I want the interface to work seamlessly on different devices and be accessible, so that I can manage the system from anywhere.

#### Acceptance Criteria

1. THE Admin Interface SHALL be responsive and functional on desktop screens (1920x1080 and above)
2. THE System SHALL be functional on tablet screens (768px and above) with adapted layouts
3. THE System SHALL provide appropriate touch targets (minimum 44x44px) for mobile interactions
4. THE System SHALL use semantic HTML elements for proper screen reader support
5. THE System SHALL provide keyboard navigation for all interactive elements
6. THE System SHALL maintain color contrast ratios of at least 4.5:1 for text content
7. THE System SHALL provide loading states for all asynchronous operations
8. THE System SHALL display error messages in an accessible and user-friendly manner

---

### Requirement 9: Data Tables and Filtering

**User Story:** As an admin, I want to search, filter, and sort data in tables, so that I can quickly find specific records.

#### Acceptance Criteria

1. THE System SHALL provide a search input for each data table (services, plans, invoices, payments)
2. WHEN the admin types in the search field, THE System SHALL filter table rows in real-time based on searchable columns
3. THE System SHALL provide column sorting (ascending/descending) for all data tables
4. THE System SHALL provide pagination controls when table data exceeds 20 rows per page
5. THE System SHALL allow the admin to change the number of rows displayed per page (10, 20, 50, 100)
6. THE System SHALL display the total count of records and current page range
7. THE System SHALL provide filter dropdowns for categorical data (status, type, category)
8. THE System SHALL persist table state (sort, filter, page) when navigating away and returning

---

### Requirement 10: Notifications and Feedback

**User Story:** As an admin, I want to receive immediate feedback on my actions and see system notifications, so that I know when operations succeed or fail.

#### Acceptance Criteria

1. WHEN an admin action succeeds, THE System SHALL display a success toast notification for 3 seconds
2. WHEN an admin action fails, THE System SHALL display an error toast notification with a clear error message
3. THE System SHALL display a notification bell icon in the header showing unread notification count
4. WHEN the admin clicks the notification bell, THE System SHALL display a dropdown list of recent notifications
5. THE System SHALL display different notification types with appropriate icons (payment submitted, subscription activated, etc.)
6. THE System SHALL allow the admin to mark notifications as read individually or all at once
7. THE System SHALL provide a link in each notification to navigate to the relevant record
8. THE System SHALL display loading spinners during asynchronous operations
9. THE System SHALL disable action buttons during processing to prevent duplicate submissions
10. THE System SHALL provide confirmation dialogs for destructive actions (delete service, delete plan, reject payment)

---

## Non-Functional Requirements

### Performance
- Page load time SHALL NOT exceed 2 seconds on standard broadband connection
- Data table filtering and sorting SHALL respond within 200 milliseconds
- API calls SHALL complete within 3 seconds or display a timeout message

### Security
- All admin routes SHALL require authentication
- Service and plan management SHALL require admin or superadmin role
- Payment verification SHALL require accountant, admin, or superadmin role
- Session SHALL expire after 8 hours of inactivity

### Usability
- Interface SHALL follow consistent design patterns across all pages
- Forms SHALL provide inline validation with clear error messages
- Critical actions SHALL require confirmation before execution
- Interface SHALL provide contextual help tooltips where needed

### Browser Support
- Interface SHALL support Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- Interface SHALL gracefully degrade on older browsers with a warning message

---

## Success Metrics

1. Admin can switch between companies and see filtered data within 1 second
2. Admin can create a new service in under 2 minutes
3. Admin can create a plan with 3 services in under 3 minutes
4. Accountant can verify a payment in under 1 minute
5. Admin can create and send an invoice in under 2 minutes
6. 95% of admin actions complete successfully without errors
7. Zero data integrity issues (orphaned records, incorrect calculations)

---

## Out of Scope

- Client-facing interface (covered in Phase 3)
- Email template customization (covered in Phase 4)
- Advanced reporting and analytics (covered in Phase 4)
- Bulk operations (import/export services, plans)
- Multi-language support
- Mobile app version
