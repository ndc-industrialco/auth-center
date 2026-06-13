import { z } from 'zod';

export const localLoginSchema = z.object({
  employeeId: z.string().min(1).max(50),
  password: z.string().min(5).max(128),
  appId: z.string().min(1).max(50).optional(),
});

export const refreshSchema = z.object({
  sessionId: z.string().uuid(),
  appId: z.string().min(1).max(50).optional(),
});

export const logoutSchema = z.object({
  sessionId: z.string().uuid(),
});

export const meQuerySchema = z.object({
  appId: z.string().min(1).max(50).optional(),
});

export const entraLinkSchema = z.object({
  entraObjectId: z.string().uuid('Invalid Entra Object ID'),
  entraUpn: z.string().email().optional(),
});

export type LocalLoginInput = z.infer<typeof localLoginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type EntraLinkInput = z.infer<typeof entraLinkSchema>;
