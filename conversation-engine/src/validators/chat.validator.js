import { z } from 'zod';

const chatSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
  message: z.string().min(1, 'message is required').max(2000, 'message too long'),
});

export function validateChatRequest(req, res, next) {
  const result = chatSchema.safeParse(req.body);

  if (!result.success) {
    const errors = result.error.issues.map((i) => i.message);
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  req.validatedBody = result.data;
  next();
}
