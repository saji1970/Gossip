import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { conversationLimiter } from '../middleware/rate-limit.js';
import { validateChatRequest } from '../validators/chat.validator.js';
import {
  handleChat,
  handleAcceptInvite,
  handleGetContext,
  handleClearContext,
} from '../controllers/conversation.controller.js';

const router = Router();

// Main conversation endpoint
router.post(
  '/chat',
  authenticate,
  conversationLimiter,
  validateChatRequest,
  handleChat,
);

// Invite acceptance (public — no auth needed, token is the proof)
router.get('/invite/accept', handleAcceptInvite);

// Context management (for debugging / admin)
router.get('/context/:userId', authenticate, handleGetContext);
router.delete('/context/:userId', authenticate, handleClearContext);

export default router;
