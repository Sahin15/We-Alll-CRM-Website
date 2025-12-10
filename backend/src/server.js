import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import userRoutes from "./routes/userRoutes.js";
import connectDB from "./config/db.js";
import adminRoutes from "./routes/adminRoutes.js";
import clientRoutes from "./routes/clientRoutes.js";
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
import activityRoutes from "./routes/activityRoutes.js";
import policyRoutes from "./routes/policyRoutes.js";
import documentRoutes from "./routes/documentRoutes.js";
import workloadRoutes from "./routes/workloadRoutes.js";
import workItemRoutes from "./routes/workItemRoutes.js";
import calendarRoutes from "./routes/calendarRoutes.js";
// Legacy routes removed - use workItemRoutes instead
// Old: taskRoutes, slotRoutes, workRoutes → New: workItemRoutes
import { initializeCronJobs } from "./config/cronJobs.js";
import { apiLimiter, sanitizeInput } from "./middleware/securityMiddleware.js";
import { auditMiddleware } from "./utils/auditLogger.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
connectDB();

const app = express();

// Security Middlewares
app.use(helmet()); // Set security headers
app.use(cors());
app.use(express.json({ limit: "10mb" })); // Limit payload size
app.use(sanitizeInput); // Sanitize MongoDB queries
app.use(auditMiddleware); // Audit logging for authenticated requests

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

// API Routes (with rate limiting)
app.use("/api/users", apiLimiter, userRoutes);
app.use("/api/admin", apiLimiter, adminRoutes);
app.use("/api/clients", apiLimiter, clientRoutes);
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
app.use("/api/activities", apiLimiter, activityRoutes);
app.use("/api/policies", apiLimiter, policyRoutes);
app.use("/api/documents", apiLimiter, documentRoutes);
app.use("/api/workload", apiLimiter, workloadRoutes);
app.use("/api/work-items", apiLimiter, workItemRoutes);
app.use("/api/calendar", apiLimiter, calendarRoutes);
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
  .then(() => {
    console.log("✅ MongoDB connected successfully");
    
    // Wait a moment for connection to be fully established
    setTimeout(() => {
      const dbName = mongoose.connection.db?.databaseName || "crm-database";
      console.log(`📊 Database: ${dbName}`);
    }, 100);
    
    console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);

    // Initialize cron jobs after DB connection
    initializeCronJobs();

    app.listen(PORT, () => {
      console.log(`✅ Server is running on port ${PORT}`);
      console.log(`🔗 API Health Check: http://localhost:${PORT}/api/health`);
      console.log(`📦 AWS S3 Bucket: ${process.env.AWS_S3_BUCKET_NAME || "Not configured"}`);
      console.log(`🌐 AWS Region: ${process.env.AWS_REGION || "Not configured"}`);
    });
  })
  .catch((error) => {
    console.error("❌ MongoDB connection failed:", error.message);
    console.error("💡 Check your MONGO_URI in .env file");
    process.exit(1);
  });
