import { z } from 'zod';

export const sessionIdSchema = z.object({
  sessionId: z.string().uuid(),
});

export const sessionQuerySchema = z.object({
  userId: z.string().cuid().optional(),
  status: z.enum(['ACTIVE', 'REVOKED', 'EXPIRED']).optional(),
});
