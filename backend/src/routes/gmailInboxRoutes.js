import express from "express";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/authMiddleware.js";
import {
  connectGmail,
  disconnectAccount,
  getMessage,
  gmailCallback,
  listAccounts,
  listMessages,
  syncInbox,
} from "../controllers/gmailInboxController.js";

const router = express.Router();

const oauthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many Gmail authorization attempts" },
});

router.get("/gmail/callback", oauthLimiter, gmailCallback);

router.use(protect);

router.get("/accounts", listAccounts);
router.get("/gmail/connect", oauthLimiter, connectGmail);
router.get("/messages", listMessages);
router.get("/messages/:id", getMessage);
router.post("/sync", syncInbox);
router.delete("/accounts/:id", disconnectAccount);

export default router;
