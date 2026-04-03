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
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import { protect } from "./middleware/authMiddleware.js";
import { authorizeRoles } from "./middleware/roleMiddleware.js";
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
import workCalendarRoutes from "./routes/workCalendarRoutes.js";
import fixRoutes from "./routes/fixRoutes.js";
import feedbackRoutes from "./routes/feedbackRoutes.js";
import salaryStructureRoutes from "./routes/salaryStructureRoutes.js";
import salarySlipRoutes from "./routes/salarySlipRoutes.js";
import salaryPreviewRoutes from "./routes/salaryPreviewRoutes.js";
import salaryTemplateRoutes from "./routes/salaryTemplateRoutes.js";
import emailRoutes from "./routes/emailRoutes.js";
import wfhRoutes from "./routes/wfhRoutes.js";
import workLogRoutes from "./routes/workLogRoutes.js";
import workOnLeaveDayRoutes from "./routes/workOnLeaveDayRoutes.js";
import todoRoutes from "./routes/todoRoutes.js";
import expenseRoutes from "./routes/expenseRoutes.js";
import rawDataRoutes from "./routes/rawDataRoutes.js";
// Legacy routes removed - use workItemRoutes instead
// Old: taskRoutes, slotRoutes, workRoutes → New: workItemRoutes
import { initializeCronJobs } from "./config/cronJobs.js";
import { apiLimiter, sanitizeInput } from "./middleware/securityMiddleware.js";
import { auditMiddleware } from "./utils/auditLogger.js";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import realTimeUpdateService from "./services/realTimeUpdateService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
connectDB();

const app = express();

// Security Middlewares
app.use(helmet()); // Set security headers

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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400, // 24 hours - cache preflight requests
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" })); // Limit payload size
app.use(sanitizeInput); // Sanitize MongoDB queries
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
app.get("/api/fix-hr-now", protect, authorizeRoles("admin", "superadmin"), async (_req, res) => {
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
app.use("/api/workload", apiLimiter, workloadRoutes);
app.use("/api/work-items", apiLimiter, workItemRoutes);
app.use("/api/calendar", apiLimiter, calendarRoutes);
app.use("/api/work-calendar", apiLimiter, workCalendarRoutes);
app.use("/api/fix", apiLimiter, fixRoutes);
app.use("/api/feedback", apiLimiter, feedbackRoutes);
app.use("/api/salary-structures", apiLimiter, salaryStructureRoutes);
app.use("/api/salary-slips", apiLimiter, salarySlipRoutes);
app.use("/api/salary-preview", apiLimiter, salaryPreviewRoutes);
app.use("/api/salary-templates", apiLimiter, salaryTemplateRoutes);
app.use("/api/emails", apiLimiter, emailRoutes);
app.use("/api/wfh", apiLimiter, wfhRoutes);
app.use("/api/worklogs", apiLimiter, workLogRoutes);
app.use("/api/work-on-leave-day", apiLimiter, workOnLeaveDayRoutes);
app.use("/api/todos", apiLimiter, todoRoutes);
app.use("/api/expenses", apiLimiter, expenseRoutes);
app.use("/api/raw-data", apiLimiter, rawDataRoutes);

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

// ✅ MongoDB connection
mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log("✅ MongoDB connected successfully");
    
    // Wait a moment for connection to be fully established
    setTimeout(() => {
      const dbName = mongoose.connection.db?.databaseName || "crm-database";
      console.log(`📊 Database: ${dbName}`);
    }, 100);
    
    console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);

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
