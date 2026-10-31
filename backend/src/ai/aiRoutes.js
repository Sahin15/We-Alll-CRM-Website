import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { aiChatLimiter, aiSpeechLimiter } from './aiRateLimit.js';
import { chat, speak, voiceMode } from './aiController.js';

const router = express.Router();

router.post('/chat', protect, aiChatLimiter, chat);
router.get('/voice', protect, voiceMode);
router.post('/speech', protect, aiSpeechLimiter, speak);

export default router;
