# Revised Billing System Plan - Service-Based Architecture

## 🎯 Core Concept

**Services → Plans → Subscriptions → Invoices → Payments**

Instead of creating standalone plans, admin creates **services** first, then bundles them into **plans (packages)**. Plan pricing is auto-calculated from included services.

---

## 📊 System Architecture Overview

### **Hierarchy:**
```
Company (We Alll / Kolkata Digital)
  ↓
Service Categories (SEO, Social Media, PPC, Web Development, etc.)
  ↓
Services (Individual services with pricing)
  ↓
Plans (Packages of services)
  ↓
Subscriptions (Client subscribes to plan + optional extra services)
  ↓
Invoices (Accountant issues invoice)
  ↓
Payment (Client pays offline, uploads proof)
  ↓
Verification (Accountant verifies, activates subscription)
```

---

## 🗂️ Database Schema Design

### **1. Service Model** (NEW - Replaces AddOn)
```javascript
{
  name: String,                    // "Keyword Research", "Social Media Posts"
  company: String,                 // "We Alll" or "Kolkata Digital"
  category: String,                // "SEO", "Social Media", "PPC", "Web Development"
  description: String,
  basePrice: Number,               // Base price for this service
  allowedBillingCycles: [String],  // ["monthly", "quarterly", "yearly"]
  priceByBillingCycle: {           // Different prices for different cycles
    monthly: Number,
    quarterly: Number,
    yearly: Number
  },
  unit: String,                    // "per month", "per keyword", "per post"
  isActive: Boolean,
  displayOrder: Number,
  createdBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

### **2. Plan Model** (UPDATED)
```javascript
{
  name: String,                    // "Basic SEO Package", "Premium Marketing"
  company: String,                 // "We Alll" or "Kolkata Digital"
  category: String,                // "SEO Package", "Full Service", etc.
  description: String,
  
  // Services included in this plan
  includedServices: [{
    service: ObjectId,             // Reference to Service
    serviceName: String,           // Snapshot
    quantity: Number,              // How many units (e.g., 10 keywords)
    price: Number                  // Price snapshot
  }],
  
  // Auto-calculated pricing
  calculatedPrice: {
    monthly: Number,
    quarterly: Number,
    yearly: Number
  },
  
  // Admin can override auto-calculated price
  customPrice: {
    monthly: Number,
    quarterly: Number,
    yearly: Number
  },
  
  // Final price (custom if set, otherwise calculated)
  finalPrice: {
    monthly: Number,
    quarterly: Number,
    yearly: Number
  },
  
  allowedBillingCycles: [String],  // Which cycles are available
  isActive: Boolean,
  displayOrder: Number,
  createdBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

### **3. Subscription Model** (UPDATED)
```javascript
{
  subscriptionNumber: String,      // SUB-2024-0001
  client: ObjectId,
  plan: ObjectId,
  
  // Plan snapshot (preserves plan details)
  planSnapshot: {
    name: String,
    includedServices: [{
      serviceName: String,
      quantity: Number,
      price: Number
    }],
    price: Number
  },
  
  // Extra services added by client
  extraServices: [{
    service: ObjectId,
    serviceName: String,
    quantity: Number,
    price: Number
  }],
  
  company: String,
  billingCycle: String,
  status: String,                  // "pending", "awaiting_payment", "active", "cancelled", "expired"
  
  // Pricing
  planAmount: Number,
  extraServicesAmount: Number,
  subtotal: Number,
  taxPercentage: Number,
  taxAmount: Number,
  totalAmount: Number,
  discount: Number,
  
  // Dates
  startDate: Date,
  endDate: Date,
  nextBillingDate: Date,
  
  // Tracking
  createdBy: ObjectId,
  activatedBy: ObjectId,
  activatedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### **4. Invoice Model** (KEEP AS IS)
```javascript
{
  invoiceNumber: String,           // INV-2024-0001
  client: ObjectId,
  subscription: ObjectId,
  payment: ObjectId,
  company: String,
  
  companyDetails: {
    name: String,
    address: String,
    phone: String,
    email: String,
    gst: String,
    logo: String
  },
  
  clientDetails: {
    name: String,
    email: String,
    phone: String,
    address: String,
    gst: String
  },
  
  items: [{
    description: String,
    quantity: Number,
    unitPrice: Number,
    total: Number
  }],
  
  subtotal: Number,
  taxPercentage: Number,
  taxAmount: Number,
  discount: Number,
  totalAmount: Number,
  
  status: String,                  // "draft", "sent", "paid", "overdue"
  issueDate: Date,
  dueDate: Date,
  paidDate: Date,
  
  notes: String,
  termsAndConditions: String,
  pdfPath: String,
  
  createdBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

### **5. Payment Model** (KEEP AS IS)
```javascript
{
  client: ObjectId,
  subscription: ObjectId,
  invoice: ObjectId,
  
  amount: Number,
  paidAmount: Number,
  balanceAmount: Number,
  
  paymentMethod: String,           // "bank_transfer", "upi", "cash"
  transactionId: String,
  
  // Payment proof
  paymentProof: String,            // File path/URL
  paymentProofDetails: {
    fileName: String,
    uploadedAt: Date,
    fileSize: Number
  },
  
  status: String,                  // "pending", "verified", "rejected"
  
  // Verification
  verifiedBy: ObjectId,
  verifiedAt: Date,
  rejectionReason: String,
  rejectedBy: ObjectId,
  rejectedAt: Date,
  
  paymentDate: Date,
  dueDate: Date,
  
  notes: String,
  createdBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

### **6. Notification Model** (NEW)
```javascript
{
  user: ObjectId,                  // Who receives the notification
  type: String,                    // "payment_due", "payment_verified", "invoice_issued"
  title: String,
  message: String,
  link: String,                    // Link to relevant page
  
  relatedTo: {
    model: String,                 // "Subscription", "Invoice", "Payment"
    id: ObjectId
  },
  
  isRead: Boolean,
  readAt: Date,
  priority: String,                // "low", "medium", "high"
  
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🔄 Complete User Flows

### **Admin Flow: Create Services & Plans**

**Step 1: Create Services**
```
Admin → Select Company (We Alll / Kolkata Digital)
     → Navigate to "Services Management"
     → Click "Add Service"
     → Fill form:
        - Name: "Keyword Research"
        - Category: "SEO"
        - Description: "Comprehensive keyword research"
        - Base Price: ₹5,000
        - Allowed Billing Cycles: [monthly, quarterly, yearly]
        - Price by Cycle:
          * Monthly: ₹5,000
          * Quarterly: ₹13,500 (10% discount)
          * Yearly: ₹48,000 (20% discount)
        - Unit: "per month"
     → Save Service
```

**Step 2: Create Plan from Services**
```
Admin → Navigate to "Plans Management"
     → Click "Create Plan"
     → Fill form:
        - Name: "Basic SEO Package"
        - Company: "We Alll"
        - Category: "SEO Package"
        - Description: "Perfect for small businesses"
     → Select Services:
        ☑ Keyword Research (Qty: 1) - ₹5,000
        ☑ On-Page SEO (Qty: 1) - ₹3,000
        ☑ Monthly Report (Qty: 1) - ₹1,000
     → System auto-calculates:
        - Monthly: ₹9,000
        - Quarterly: ₹24,300
        - Yearly: ₹86,400
     → Admin can override (optional):
        - Custom Monthly: ₹8,500 (offer discount)
     → Save Plan
```

---

### **Client Flow: Subscribe to Plan**

**Step 1: Browse Plans**
```
Client → Login
      → Navigate to "Plans & Pricing"
      → Switch Company: [We Alll] [Kolkata Digital]  ← Capsule toggle
      → View plans for selected company
      → See plan details:
         - Name
         - Included services
         - Price (monthly/quarterly/yearly)
         - Features list
```

**Step 2: Select Plan & Add Extra Services**
```
Client → Click "Subscribe" on a plan
      → Modal opens:
         - Plan: Basic SEO Package
         - Billing Cycle: ○ Monthly ● Quarterly ○ Yearly
         - Price: ₹24,300
         
         - Add Extra Services (Optional):
           ☑ Extra Blog Posts (₹2,000/month)
           ☐ Additional Keywords (₹1,500/month)
           
         - Summary:
           Plan: ₹24,300
           Extra Services: ₹2,000
           Subtotal: ₹26,300
           GST (18%): ₹4,734
           Total: ₹31,034
           
      → Click "Request Billing"
```

**Step 3: Subscription Created**
```
System → Creates subscription (status: "pending")
      → Notifies accountant
      → Client sees: "Subscription request submitted. Awaiting invoice."
```

---

### **Accountant Flow: Issue Invoice**

**Step 1: View Pending Subscriptions**
```
Accountant → Navigate to "Pending Subscriptions"
          → See list:
             - Client Name
             - Plan
             - Amount
             - Date Requested
             - [Issue Invoice] button
```

**Step 2: Issue Invoice**
```
Accountant → Click "Issue Invoice"
          → Review details:
             - Client info
             - Plan details
             - Services breakdown
             - Amount
          → Add notes (optional)
          → Click "Generate Invoice"
          
System → Creates invoice (INV-2024-0001)
      → Updates subscription status: "awaiting_payment"
      → Sends notification to client
      → (Optional) Sends email with invoice PDF
```

---

### **Client Flow: Pay Invoice**

**Step 1: View Invoice**
```
Client → Receives notification
      → Navigate to "My Subscriptions"
      → See subscription with "Pay Now" button
      → Click "Pay Now"
```

**Step 2: Make Payment**
```
Client → Modal shows:
         - Invoice details
         - Amount: ₹31,034
         - Payment methods:
           ● Bank Transfer
           ○ UPI
           
         - Bank Details (if Bank Transfer):
           Account Name: We Alll
           Account Number: 1234567890
           IFSC: ABCD0001234
           
         - UPI Details (if UPI):
           UPI ID: wealll@paytm
           [QR Code]
           
      → Client makes payment via their bank/UPI app
      → Returns to CRM
```

**Step 3: Upload Payment Proof**
```
Client → Upload screenshot
      → Enter transaction ID
      → Enter payment date
      → Add notes (optional)
      → Click "Submit Payment Proof"
      
System → Creates payment record (status: "pending")
      → Notifies accountant
      → Client sees: "Payment proof submitted. Awaiting verification."
```

---

### **Accountant Flow: Verify Payment**

**Step 1: View Pending Payments**
```
Accountant → Navigate to "Pending Payments"
          → See list:
             - Client Name
             - Invoice Number
             - Amount
             - Transaction ID
             - Date Submitted
             - [View] button
```

**Step 2: Verify Payment**
```
Accountant → Click "View"
          → Modal shows:
             - Client details
             - Invoice details
             - Payment proof screenshot
             - Transaction ID
             - Amount
             
          → Verify in bank/UPI records
          → Decision:
             ✓ Approve → Click "Verify Payment"
             ✗ Reject → Enter reason → Click "Reject Payment"
```

**Step 3: Activate Subscription (if approved)**
```
System → Updates payment status: "verified"
      → Updates invoice status: "paid"
      → Updates subscription status: "active"
      → Sets subscription start/end dates
      → Sends notification to client
      → (Optional) Sends email with receipt
```

---

## 🎨 UI/UX Design

### **Admin: Company Switcher (Capsule)**
```
┌─────────────────────────────────────────────────────┐
│  Dashboard                                          │
│                                                     │
│  Company: [We Alll] [Kolkata Digital]  ← Capsule  │
│                                                     │
│  All data below filtered by selected company       │
└─────────────────────────────────────────────────────┘
```

### **Admin: Services Management**
```
┌─────────────────────────────────────────────────────┐
│  Services Management - We Alll                      │
│  [+ Add Service]                                    │
├─────────────────────────────────────────────────────┤
│  Category: [All] [SEO] [Social Media] [PPC]       │
├─────────────────────────────────────────────────────┤
│  Service Name          Category    Price    Actions │
│  ─────────────────────────────────────────────────  │
│  Keyword Research      SEO         ₹5,000   [Edit]  │
│  On-Page SEO          SEO         ₹3,000   [Edit]  │
│  Social Media Posts   Social      ₹4,000   [Edit]  │
└─────────────────────────────────────────────────────┘
```

### **Admin: Create Plan**
```
┌─────────────────────────────────────────────────────┐
│  Create Plan                                    [X] │
├─────────────────────────────────────────────────────┤
│  Plan Name: [Basic SEO Package]                    │
│  Company: ● We Alll  ○ Kolkata Digital            │
│  Category: [SEO Package]                           │
│  Description: [Perfect for small businesses...]    │
│                                                     │
│  Select Services:                                   │
│  ☑ Keyword Research (Qty: [1]) - ₹5,000          │
│  ☑ On-Page SEO (Qty: [1]) - ₹3,000               │
│  ☑ Monthly Report (Qty: [1]) - ₹1,000            │
│  ☐ Social Media Posts (Qty: [0]) - ₹4,000        │
│                                                     │
│  Auto-Calculated Price:                            │
│  Monthly: ₹9,000                                   │
│  Quarterly: ₹24,300 (10% discount)                │
│  Yearly: ₹86,400 (20% discount)                   │
│                                                     │
│  Custom Price (Optional):                          │
│  Monthly: [8,500] ← Override                       │
│  Quarterly: [     ]                                │
│  Yearly: [     ]                                   │
│                                                     │
│  Allowed Billing Cycles:                           │
│  ☑ Monthly  ☑ Quarterly  ☑ Yearly                │
│                                                     │
│              [Cancel]  [Save Plan]                 │
└─────────────────────────────────────────────────────┘
```

### **Client: Plans & Pricing**
```
┌─────────────────────────────────────────────────────┐
│  Plans & Pricing                                    │
│  Company: [We Alll] [Kolkata Digital]  ← Toggle   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ BASIC    │  │ STANDARD │  │ PREMIUM  │        │
│  │ ₹8,500/mo│  │ ₹15,000/mo│ │ ₹25,000/mo│      │
│  │          │  │          │  │          │        │
│  │ Includes:│  │ Includes:│  │ Includes:│        │
│  │ • Keyword│  │ • All    │  │ • All    │        │
│  │   Research│  │   Basic  │  │   Standard│      │
│  │ • On-Page│  │ • Social │  │ • PPC    │        │
│  │   SEO    │  │   Media  │  │ • Priority│      │
│  │ • Report │  │ • Content│  │   Support │      │
│  │          │  │          │  │          │        │
│  │[Subscribe]│  │[Subscribe]│  │[Subscribe]│      │
│  └──────────┘  └──────────┘  └──────────┘        │
└─────────────────────────────────────────────────────┘
```

### **Accountant: Pending Payments**
```
┌─────────────────────────────────────────────────────┐
│  Pending Payments (5)                               │
├─────────────────────────────────────────────────────┤
│  Client      Invoice    Amount    Date      Action  │
│  ─────────────────────────────────────────────────  │
│  John Doe    INV-001   ₹31,034   Dec 15    [View]  │
│  Jane Smith  INV-002   ₹18,000   Dec 14    [View]  │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Verify Payment - John Doe                      [X] │
├─────────────────────────────────────────────────────┤
│  Invoice: INV-2024-0001                            │
│  Amount: ₹31,034                                   │
│  Transaction ID: 123456789012                      │
│  Payment Date: Dec 15, 2024                        │
│                                                     │
│  Payment Proof:                                     │
│  [Screenshot showing UPI payment]                   │
│                                                     │
│  Verification Checklist:                           │
│  ☑ Amount matches                                  │
│  ☑ Transaction ID valid                            │
│  ☑ Payment proof clear                             │
│                                                     │
│  Rejection Reason (if rejecting):                  │
│  [_____________________________________________]   │
│                                                     │
│         [Reject Payment]  [Verify Payment]         │
└─────────────────────────────────────────────────────┘
```

---

## 📋 Implementation Plan

### **Phase 1: Database & Backend (Week 1)**
- [ ] Create Service model
- [ ] Update Plan model (service-based)
- [ ] Update Subscription model
- [ ] Keep Invoice & Payment models
- [ ] Create Notification model
- [ ] Create Service controller
- [ ] Update Plan controller
- [ ] Update Subscription controller
- [ ] Create Notification controller
- [ ] Create all routes
- [ ] File upload for payment proofs

### **Phase 2: Admin Features (Week 2)**
- [ ] Company switcher component
- [ ] Services management page
- [ ] Create/edit/delete services
- [ ] Plans management page
- [ ] Create plan with service selection
- [ ] Auto-calculate plan pricing
- [ ] Override pricing option
- [ ] Pending subscriptions dashboard
- [ ] Issue invoice functionality
- [ ] Pending payments dashboard
- [ ] Payment verification interface

### **Phase 3: Client Features (Week 3)**
- [ ] Plans & pricing page with company toggle
- [ ] Plan details modal
- [ ] Extra services selection
- [ ] Request billing
- [ ] My subscriptions page
- [ ] View invoices
- [ ] Payment submission form
- [ ] Upload payment proof
- [ ] View payment status

### **Phase 4: Notifications & Polish (Week 4)**
- [ ] Notification system
- [ ] Email notifications
- [ ] Payment due reminders
- [ ] Invoice PDF generation
- [ ] Receipt generation
- [ ] Dashboard widgets
- [ ] Reports & analytics

---

## 🔔 Notification System

### **Notification Types:**

1. **Payment Due** - 7 days before due date
2. **Payment Overdue** - When payment is overdue
3. **Invoice Issued** - When accountant issues invoice
4. **Payment Submitted** - When client uploads proof
5. **Payment Verified** - When accountant approves
6. **Payment Rejected** - When accountant rejects
7. **Subscription Activated** - When subscription goes live
8. **Subscription Expiring** - 7 days before expiry

---

## ✅ Key Differences from Previous Plan

| Aspect | Previous Plan | New Plan |
|--------|--------------|----------|
| **Structure** | Plans with add-ons | Services → Plans |
| **Pricing** | Fixed plan prices | Auto-calculated from services |
| **Admin Control** | Create plans directly | Create services first, then bundle |
| **Flexibility** | Limited | High - can mix/match services |
| **Price Override** | Not available | Admin can override auto-calc |
| **Company Switch** | Separate pages | Single toggle (capsule) |
| **Payment** | Auto payment gateway | Manual offline payment |
| **Activation** | Auto on payment | Manual verification by accountant |

---

## 🚀 Ready to Proceed?

This plan provides:
- ✅ Service-based architecture
- ✅ Company switcher (capsule)
- ✅ Auto-calculated pricing with override
- ✅ Manual billing workflow
- ✅ Offline payment with proof upload
- ✅ Accountant verification
- ✅ Complete notification system

**Should I proceed with implementation based on this plan?**
Or would you like any modifications?
