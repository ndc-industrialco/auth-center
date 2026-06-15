import { z } from 'zod';

const isoDatetime = z.string().datetime();

export const consumerSessionRegisterSchema = z.object({
  appId: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, 'appId must be lowercase alphanumeric with hyphens'),
  authUserId: z.string().cuid(),
  employeeId: z.string().min(1).max(50).optional().nullable(),
  appRoles: z.array(z.string().min(1).max(100)).max(20),
  effectiveRole: z.string().min(1).max(100),
  sessionId: z.string().min(1).max(200),
  loginAt: isoDatetime,
  lastSeenAt: isoDatetime,
  expiresAt: isoDatetime.optional().nullable(),
  ipAddress: z.string().max(100).optional().nullable(),
  userAgent: z.string().max(1000).optional().nullable(),
});

export const consumerSessionHeartbeatSchema = z.object({
  appId: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, 'appId must be lowercase alphanumeric with hyphens'),
  sessionId: z.string().min(1).max(200),
  lastSeenAt: isoDatetime,
});

export const consumerSessionRevokeSchema = z.object({
  appId: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, 'appId must be lowercase alphanumeric with hyphens'),
  sessionId: z.string().min(1).max(200),
  revokedAt: isoDatetime,
  reason: z.string().min(1).max(100),
});

export type ConsumerSessionRegisterInput = z.infer<typeof consumerSessionRegisterSchema>;
export type ConsumerSessionHeartbeatInput = z.infer<typeof consumerSessionHeartbeatSchema>;
export type ConsumerSessionRevokeInput = z.infer<typeof consumerSessionRevokeSchema>;
