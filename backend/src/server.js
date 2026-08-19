import "./config/env.js";

// Suppress Node.js deprecation warnings
process.removeAllListeners('warning');
process.on('warning', (warning) => {
  if (warning.name === 'DeprecationWarning' && warning.code === 'DEP0040') {
    return; // Suppress punycode deprecation warning
  }
  console.warn(warning);
});

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import { protect } from "./middleware/authMiddleware.js";
import { requireModulePermission } from "./authz/authzMiddleware.js";
import userRoutes from "./routes/userRoutes.js";
import connectDB from "./config/db.js";
// Firebase Admin is initialized via firebaseAdmin.js (imported by notificationService)
import adminRoutes from "./routes/adminRoutes.js";
import clientRoutes from "./routes/clientRoutes.js";
import clientWorkRoutes from "./routes/clientWorkRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import departmentRoutes from "./routes/departmentRoutes.js";
import leaveRoutes from "./routes/leaveRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import billRoutes from "./routes/billRoutes.js";
import leadRoutes from "./routes/leadRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import planRoutes from "./routes/planRoutes.js";
import addOnRoutes from "./routes/addOnRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import invoiceRoutes from "./routes/invoiceRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import clientDashboardRoutes from "./routes/clientDashboardRoutes.js";
import adminDashboardRoutes from "./routes/adminDashboardRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import announcementRoutes from "./routes/announcementRoutes.js";
import meetingRoutes from "./routes/meetingRoutes.js";
import holidayRoutes from "./routes/holidayRoutes.js";
import activityRoutes from "./routes/activityRoutes.js";
import policyRoutes from "./routes/policyRoutes.js";
import documentRoutes from "./routes/documentRoutes.js";
import workloadRoutes from "./routes/workloadRoutes.js";
import workItemRoutes from "./routes/workItemRoutes.js";
import calendarRoutes from "./routes/calendarRoutes.js";
import reportsRoutes from "./routes/reportsRoutes.js";
import workCalendarRoutes from "./routes/workCalendarRoutes.js";
import fixRoutes from "./routes/fixRoutes.js";
import feedbackRoutes from "./routes/feedbackRoutes.js";
import salaryStructureRoutes from "./routes/salaryStructureRoutes.js";
import salarySlipRoutes from "./routes/salarySlipRoutes.js";
import salaryPreviewRoutes from "./routes/salaryPreviewRoutes.js";
import salaryTemplateRoutes from "./routes/salaryTemplateRoutes.js";
import payrollPeriodRoutes from "./routes/payrollPeriodRoutes.js";
import salaryComponentRoutes from "./routes/salaryComponentRoutes.js";
import payrollRunRoutes from "./routes/payrollRunRoutes.js";
import payrollApprovalRoutes from "./routes/payrollApprovalRoutes.js";
import payrollReportRoutes from "./routes/payrollReportRoutes.js";
import payrollJobRoutes from "./routes/payrollJobRoutes.js";
import payrollAdjustmentRoutes from "./routes/payrollAdjustmentRoutes.js";
import payrollSimplePreviewRoutes from "./routes/payrollSimplePreviewRoutes.js";
import emailRoutes from "./routes/emailRoutes.js";
import wfhRoutes from "./routes/wfhRoutes.js";
import workLogRoutes from "./routes/workLogRoutes.js";
import workOnLeaveDayRoutes from "./routes/workOnLeaveDayRoutes.js";
import todoRoutes from "./routes/todoRoutes.js";
import expenseRoutes from "./routes/expenseRoutes.js";
import rawDataRoutes from "./routes/rawDataRoutes.js";
import assetRoutes from "./routes/assetRoutes.js";
import softwareLicenseRoutes from "./routes/softwareLicenseRoutes.js";
import supportRoutes from "./routes/supportRoutes.js";
import importantPersonRoutes from "./routes/importantPersonRoutes.js";
import offerRoutes from "./routes/offerRoutes.js";
import hiringRequestRoutes from "./routes/hiringRequestRoutes.js";
import applicantRoutes from "./routes/applicantRoutes.js";
import hiringApplicationRoutes from "./routes/hiringApplicationRoutes.js";
// Procurement routes
import purchaseRequestRoutes from "./routes/purchaseRequestRoutes.js";
import purchaseOrderRoutes from "./routes/purchaseOrderRoutes.js";
import goodsReceiptRoutes from "./routes/goodsReceiptRoutes.js";
import vendorRoutes from "./routes/vendorRoutes.js";
import procurementInvoiceRoutes from "./routes/procurementInvoiceRoutes.js";
import procurementPaymentRoutes from "./routes/procurementPaymentRoutes.js";
import procurementDashboardRoutes from "./routes/procurementDashboardRoutes.js";
import authzRoutes from "./routes/authzRoutes.js";
import { runStartupAuthzValidation } from "./authz/startupValidation.js";
// Legacy routes removed - use workItemRoutes instead
// Old: taskRoutes, slotRoutes, workRoutes → New: workItemRoutes
import { initializeCronJobs } from "./config/cronJobs.js";
import { apiLimiter, sanitizeInput } from "./middleware/securityMiddleware.js";
import { s3ProxyMiddleware } from "./middleware/s3ProxyMiddleware.js";
import { auditMiddleware } from "./utils/auditLogger.js";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import realTimeUpdateService from "./services/realTimeUpdateService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

connectDB();

runStartupAuthzValidation({ verbose: process.env.AUTHZ_VALIDATE_VERBOSE === "true" });

const app = express();
app.set("trust proxy", 1);

// Security Middlewares
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// CORS Configuration - Mobile-friendly for iOS Safari
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, or direct IP access)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',').map(url => url.trim())
      : ['http://localhost:3000']; // Development fallback
    
    // Check if origin is allowed
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      // Log rejected origin for debugging
      console.warn(`CORS rejected origin: ${origin}`);
      callback(null, true); // Allow anyway for mobile compatibility
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Cache-Control', 'Pragma'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400, // 24 hours - cache preflight requests
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "25mb" })); // Limit payload size
app.use(sanitizeInput); // Sanitize MongoDB queries
app.use(s3ProxyMiddleware); // Serve profile pictures via /api/upload/profile-picture/:fileName
app.use(auditMiddleware); // Audit logging for authenticated requests

// Prevent search engine indexing (internal office use only)
app.use((req, res, next) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  next();
});

// Service worker must not be cached on Windows/Chrome
app.use((req, res, next) => {
  if (req.path === '/firebase-messaging-sw.js' || req.path.endsWith('firebase-messaging-sw.js')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    console.log('[SW] Service worker requested - cache headers set');
  }
  next();
});

// Never cache API responses — stale GET data was causing updates (salary, attendance, etc.) to appear broken
app.use((req, res, next) => {
  const apiPath = (req.originalUrl || req.url || req.path || "").split("?")[0];
  if (apiPath.startsWith("/api")) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");
  }
  next();
});

// Global request logger for debugging (disabled in production)
// app.use((req, res, next) => {
//   console.log(`🌐 GLOBAL REQUEST: ${req.method} ${req.path}`);
//   console.log(`🌐 GLOBAL REQUEST: Headers:`, req.headers.authorization ? 'Auth token present' : 'No auth token');
//   console.log(`🌐 GLOBAL REQUEST: Body:`, req.method === 'POST' ? JSON.stringify(req.body, null, 2) : 'N/A');
//   next();
// });

// Serve static files from uploads folder
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "OK",
    message: "CRM API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Quick fix for HR attendance (requires admin authentication)
app.get(
  "/api/fix-hr-now",
  protect,
  requireModulePermission("attendance", "attendance.record.manage", {
    legacyRoles: ["admin", "superadmin"],
  }),
  async (_req, res) => {
  try {
    const { default: Attendance } = await import('./models/attendanceModel.js');
    const { default: User } = await import('./models/userModel.js');
    
    console.log('[FIX-HR-NOW] Starting immediate HR attendance fix...');
    
    // Get all HR users
    const hrUsers = await User.find({ role: 'hr' }).select('_id name email');
    console.log(`[FIX-HR-NOW] Found ${hrUsers.length} HR users`);
    
    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    let fixedCount = 0;
    const fixedRecords = [];
    
    for (const hrUser of hrUsers) {
      const attendanceRecords = await Attendance.find({
        employee: hrUser._id,
        date: { $gte: today, $lt: tomorrow },
        clockIn: { $exists: true }
      });
      
      for (const record of attendanceRecords) {
        const clockInTime = new Date(record.clockIn);
        const clockInHour = clockInTime.getHours();
        const clockInMinute = clockInTime.getMinutes();
        const totalMinutes = clockInHour * 60 + clockInMinute;
        
        let correctStatus;
        if (totalMinutes >= 720) {
          correctStatus = "half-day"; // 12:00 PM or later
        } else if (totalMinutes > 630) {
          correctStatus = "late"; // 10:31 AM to 11:59 AM
        } else {
          correctStatus = "present"; // 00:00 to 10:30 AM
        }
        
        if (record.status !== correctStatus) {
          const oldStatus = record.status;
          record.status = correctStatus;
          await record.save();
          fixedCount++;
          
          fixedRecords.push({
            employee: hrUser.name,
            email: hrUser.email,
            clockIn: clockInTime.toLocaleString(),
            oldStatus: oldStatus,
            newStatus: correctStatus
          });
          
          console.log(`[FIX-HR-NOW] Fixed: ${hrUser.name} - ${clockInTime.toLocaleString()} - ${oldStatus} → ${correctStatus}`);
        }
      }
    }
    
    res.status(200).json({
      success: true,
      message: `Fixed ${fixedCount} HR attendance records for today`,
      hrUsersChecked: hrUsers.length,
      fixedCount: fixedCount,
      fixedRecords: fixedRecords,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[FIX-HR-NOW] Error:', error);
    res.status(500).json({
      success: false,
      message: "Error fixing HR attendance",
      error: error.message
    });
  }
});

// API Routes (with rate limiting)
app.use("/api/users", apiLimiter, userRoutes);
app.use("/api/v1/authz", apiLimiter, authzRoutes);
app.use("/api/admin", apiLimiter, adminRoutes);
app.use("/api/clients", apiLimiter, clientRoutes);
app.use("/api/clients", apiLimiter, clientWorkRoutes);
app.use("/api/projects", apiLimiter, projectRoutes);
app.use("/api/departments", apiLimiter, departmentRoutes);
app.use("/api/leaves", apiLimiter, leaveRoutes);
app.use("/api/attendance", apiLimiter, attendanceRoutes);
app.use("/api/payments", apiLimiter, paymentRoutes);
app.use("/api/bills", apiLimiter, billRoutes);
app.use("/api/notifications", apiLimiter, notificationRoutes);
app.use("/api/leads", apiLimiter, leadRoutes);
app.use("/api/plans", apiLimiter, planRoutes);
app.use("/api/addons", apiLimiter, addOnRoutes);
app.use("/api/subscriptions", apiLimiter, subscriptionRoutes);
app.use("/api/invoices", apiLimiter, invoiceRoutes);
app.use("/api/services", apiLimiter, serviceRoutes);
app.use("/api/client-dashboard", apiLimiter, clientDashboardRoutes);
app.use("/api/admin-dashboard", apiLimiter, adminDashboardRoutes);
app.use("/api/upload", apiLimiter, uploadRoutes);
app.use("/api/announcements", apiLimiter, announcementRoutes);
app.use("/api/meetings", apiLimiter, meetingRoutes);
app.use("/api/holidays", apiLimiter, holidayRoutes);
app.use("/api/activities", apiLimiter, activityRoutes);
app.use("/api/policies", apiLimiter, policyRoutes);
app.use("/api/documents", apiLimiter, documentRoutes);
app.use("/api/offers", apiLimiter, offerRoutes);
app.use("/api/hiring-requests", apiLimiter, hiringRequestRoutes);
app.use("/api/applicants", apiLimiter, applicantRoutes);
app.use("/api/hiring-applications", apiLimiter, hiringApplicationRoutes);
app.use("/api/workload", apiLimiter, workloadRoutes);
app.use("/api/work-items", apiLimiter, workItemRoutes);
app.use("/api/calendar", apiLimiter, calendarRoutes);
app.use("/api/reports", apiLimiter, reportsRoutes);
app.use("/api/work-calendar", apiLimiter, workCalendarRoutes);
app.use("/api/fix", apiLimiter, fixRoutes);
app.use("/api/feedback", apiLimiter, feedbackRoutes);
app.use("/api/salary-structures", apiLimiter, salaryStructureRoutes);
app.use("/api/salary-slips", apiLimiter, salarySlipRoutes);
app.use("/api/salary-preview", apiLimiter, salaryPreviewRoutes);
app.use("/api/salary-templates", apiLimiter, salaryTemplateRoutes);
app.use("/api/payroll/periods", apiLimiter, payrollPeriodRoutes);
app.use("/api/payroll/components", apiLimiter, salaryComponentRoutes);
app.use("/api/payroll/runs", apiLimiter, payrollRunRoutes);
app.use("/api/payroll/approvals", apiLimiter, payrollApprovalRoutes);
app.use("/api/payroll/reports", apiLimiter, payrollReportRoutes);
app.use("/api/payroll/jobs", apiLimiter, payrollJobRoutes);
app.use("/api/payroll/adjustments", apiLimiter, payrollAdjustmentRoutes);
app.use("/api/payroll/simple-preview", apiLimiter, payrollSimplePreviewRoutes);
app.use("/api/emails", apiLimiter, emailRoutes);
app.use("/api/wfh", apiLimiter, wfhRoutes);
app.use("/api/worklogs", apiLimiter, workLogRoutes);
app.use("/api/work-on-leave-day", apiLimiter, workOnLeaveDayRoutes);
app.use("/api/todos", apiLimiter, todoRoutes);
app.use("/api/expenses", apiLimiter, expenseRoutes);
app.use("/api/raw-data", apiLimiter, rawDataRoutes);
app.use("/api/assets", apiLimiter, assetRoutes);
app.use("/api/software-licenses", apiLimiter, softwareLicenseRoutes);
app.use("/api/support-contacts", apiLimiter, supportRoutes);
app.use("/api/important-persons", apiLimiter, importantPersonRoutes);

// Procurement routes
app.use("/api/procurement/purchase-requests", apiLimiter, purchaseRequestRoutes);
app.use("/api/procurement/purchase-orders", apiLimiter, purchaseOrderRoutes);
app.use("/api/procurement/goods-receipts", apiLimiter, goodsReceiptRoutes);
app.use("/api/procurement/vendors", apiLimiter, vendorRoutes);
app.use("/api/procurement/invoices", apiLimiter, procurementInvoiceRoutes);
app.use("/api/procurement/payments", apiLimiter, procurementPaymentRoutes);
app.use("/api/procurement", apiLimiter, procurementDashboardRoutes);

// Diagnostic endpoint to check server status and timezone
app.get("/api/diagnostic", (req, res) => {
  const now = new Date();
  const istTime = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const istDateString = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  
  res.json({
    status: "ok",
    timestamp: now.toISOString(),
    serverTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    serverTime: now.toString(),
    istTime: istTime,
    istDate: istDateString,
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development',
    message: "Server is running with updated timezone logic (Feb 16, 2026)"
  });
});

// Legacy routes removed:
// - /api/tasks → use /api/work-items
// - /api/slots → use /api/work-items
// - /api/work → use /api/work-items

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// Validate environment variables
if (!MONGO_URI) {
  console.error("❌ ERROR: MONGO_URI is not defined in .env file");
  process.exit(1);
}

// ✅ MongoDB connection with reconnection handling
mongoose
  .connect(MONGO_URI, {
    maxPoolSize: 10,
    minPoolSize: 5,
    socketTimeoutMS: 45000,
    serverSelectionTimeoutMS: 5000,
    retryWrites: true,
  })
  .then(async () => {
    console.log("✅ MongoDB connected successfully");
    
    // Wait a moment for connection to be fully established
    setTimeout(() => {
      const dbName = mongoose.connection.db?.databaseName || "crm-database";
      console.log(`📊 Database: ${dbName}`);
    }, 100);
    
    console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);

    try {
      const { getPeriodGatesProductionWarning } = await import(
        "./services/payroll/payrollPeriodGates.js"
      );
      const payrollGateWarn = getPeriodGatesProductionWarning();
      if (payrollGateWarn) console.warn(payrollGateWarn);
    } catch (e) {
      console.warn("[payroll] period gate config check skipped:", e.message);
    }

    try {
      const {
        reclaimStalePayrollJobs,
        schedulePayrollJobRunner,
      } = await import("./services/payroll/payrollJobService.js");
      const { reclaimed } = await reclaimStalePayrollJobs();
      if (reclaimed > 0) {
        console.warn(`[payrollJob] boot reclaim: ${reclaimed} stale running job(s) requeued`);
      }
      schedulePayrollJobRunner();
    } catch (e) {
      console.warn("[payrollJob] boot reclaim skipped:", e.message);
    }

    // Import and check Firebase initialization
    const { firebaseInitialized, messaging } = await import('./config/firebaseAdmin.js');
    
    if (!firebaseInitialized) {
      console.error('❌ Firebase Admin not initialized - push notifications will NOT work');
      console.error('⚠️  Check: 1) Service account file exists, 2) Environment variables are set');
    } else if (!messaging) {
      console.error('❌ Firebase messaging is null - push notifications will NOT work');
    } else {
      console.log('✅ Firebase Admin initialized - push notifications enabled');
    }

    // Initialize cron jobs after DB connection
    initializeCronJobs();

    // Create HTTP server for both Express and WebSocket
    const server = createServer(app);

    // Initialize real-time update service before starting server
    realTimeUpdateService.initialize(server);

    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.error(`❌ Port ${PORT} is already in use. Another backend is still running.`);
        console.error(`   Windows: netstat -ano | findstr :${PORT}`);
        console.error(`   Then:    taskkill /PID <pid> /F`);
        console.error(`   Or run:  npm run dev:clean   (from backend folder)`);
      } else {
        console.error("❌ Server error:", error);
      }
      process.exit(1);
    });

    server.listen(PORT, () => {
      console.log(`✅ Server is running on port ${PORT}`);
      console.log(`🔗 API Health Check: http://localhost:${PORT}/api/health`);
      console.log(`🔌 WebSocket Server: ws://localhost:${PORT}/ws/admin-work-updates`);
      console.log(`📦 AWS S3 Bucket: ${process.env.AWS_S3_BUCKET_NAME || "Not configured"}`);
      console.log(`🌐 AWS Region: ${process.env.AWS_REGION || "Not configured"}`);
    });
  })
  .catch((error) => {
    console.error("❌ MongoDB connection failed:", error.message);
    console.error("💡 Check your MONGO_URI in .env file");
    process.exit(1);
  });

// Handle MongoDB connection events
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected - attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected successfully');
});

mongoose.connection.on('error', (error) => {
  console.error('❌ MongoDB connection error:', error.message);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Gracefully shutdown
  process.exit(1);
});
