import type { AuthMethod } from '@/types/auth';

// JWT claims contract issued by Auth Center to consuming apps.
// Consuming apps validate this token with the Auth Center public key.
export interface AuthCenterTokenClaims {
  sub: string;
  userId: string;
  employeeId: string;
  authMethod: AuthMethod;
  m365Linked: boolean;
  canSendDelegatedMail: boolean;
  departmentId: string | null;
  appRoles: string[];
  roleVersion: string;
  sessionId: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
}

export interface TokenIssueResult {
  accessToken: string;
  expiresAt: number;
  sessionId: string;
}

export interface LocalLoginInput {
  employeeId: string;
  password: string;
}
