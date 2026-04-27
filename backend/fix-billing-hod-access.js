import { readFileSync, writeFileSync } from "fs";

const files = [
  "src/routes/billRoutes.js",
  "src/routes/invoiceRoutes.js",
  "src/routes/paymentRoutes.js",
  "src/routes/planRoutes.js",
  "src/routes/serviceRoutes.js",
  "src/routes/subscriptionRoutes.js",
  "src/routes/addOnRoutes.js",
  "src/routes/clientDashboardRoutes.js",
];

for (const f of files) {
  try {
    let content = readFileSync(f, "utf8");
    const original = content;

    // Add hod to routes that have accounts+manager (read access)
    content = content.replaceAll(
      `authorizeRoles("admin", "superadmin", "accounts", "manager")`,
      `authorizeRoles("admin", "superadmin", "accounts", "manager", "hod")`
    );
    content = content.replaceAll(
      `authorizeRoles("admin", "superadmin", "accounts")`,
      `authorizeRoles("admin", "superadmin", "accounts", "hod")`
    );

    if (content !== original) {
      writeFileSync(f, content);
      console.log("✅ Updated:", f);
    } else {
      console.log("— No change:", f);
    }
  } catch (e) {
    console.log("Skip:", f, e.message);
  }
}
