import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tokenService } from '@/services/tokenService';
import { sessionService } from '@/services/sessionService';
import type { AuthUser } from '@/types/auth';

vi.mock('@/services/permissionService', () => ({
  permissionService: {
    getTokenClaims: vi.fn().mockResolvedValue({
      appRoles: ['QMS_ADMIN'],
      roleVersion: 'abc123',
    }),
  },
}));

vi.mock('@/services/sessionService', () => ({
  sessionService: {
    isSessionValid: vi.fn().mockResolvedValue(true),
  },
}));

const mockUser: AuthUser = {
  id: 'cltest000000000000000000000',
  employeeId: 'EMP001',
  email: 'emp001@ndc.co.th',
  displayName: 'Test User',
  m365Linked: true,
  canSendDelegatedMail: true,
  employmentStatus: 'ACTIVE',
  defaultAuthMethod: 'ENTRA',
  authMethod: 'ENTRA',
  departmentId: 'dept-001',
};

describe('TokenService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(sessionService.isSessionValid).mockResolvedValue(true);
  });

  describe('issueAccessToken', () => {
    it('issues a valid JWT with expected claims', async () => {
      const result = await tokenService.issueAccessToken(mockUser, 'qms', 'session-uuid-001');

      expect(result.accessToken).toBeTruthy();
      expect(result.sessionId).toBe('session-uuid-001');
      expect(result.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('sets canSendDelegatedMail from user when authMethod is ENTRA', async () => {
      const result = await tokenService.issueAccessToken(mockUser, 'qms', 'session-1');
      const claims = await tokenService.verifyAccessToken(result.accessToken, 'qms');

      expect(claims.canSendDelegatedMail).toBe(true);
    });

    it('forces canSendDelegatedMail to false for LOCAL_PASSWORD sessions', async () => {
      const localUser: AuthUser = {
        ...mockUser,
        authMethod: 'LOCAL_PASSWORD',
        defaultAuthMethod: 'LOCAL_PASSWORD',
        m365Linked: false,
        canSendDelegatedMail: true,
      };

      const result = await tokenService.issueAccessToken(localUser, 'qms', 'session-2');
      const claims = await tokenService.verifyAccessToken(result.accessToken, 'qms');

      expect(claims.canSendDelegatedMail).toBe(false);
    });

    it('includes correct role-based claims', async () => {
      const result = await tokenService.issueAccessToken(mockUser, 'qms', 'session-3');
      const claims = await tokenService.verifyAccessToken(result.accessToken, 'qms');

      expect(claims.sub).toBe(mockUser.id);
      expect(claims.userId).toBe(mockUser.id);
      expect(claims.employeeId).toBe('EMP001');
      expect(claims.authMethod).toBe('ENTRA');
      expect(claims.aud).toBe('qms');
      expect(claims.iss).toBe('auth-center');
      expect(claims.sessionId).toBe('session-3');
      expect(claims.appRoles).toEqual(['QMS_ADMIN']);
      expect(claims.roleVersion).toBe('abc123');
    });
  });

  describe('verifyAccessToken', () => {
    it('rejects a tampered token', async () => {
      const result = await tokenService.issueAccessToken(mockUser, 'qms', 'session-4');
      const tampered = result.accessToken.slice(0, -5) + 'XXXXX';

      await expect(tokenService.verifyAccessToken(tampered, 'qms')).rejects.toThrow('Invalid or expired access token');
    });

    it('rejects token with wrong audience', async () => {
      const result = await tokenService.issueAccessToken(mockUser, 'qms', 'session-5');
      await expect(tokenService.verifyAccessToken(result.accessToken, 'hr-center')).rejects.toThrow();
    });

    it('rejects token when session has been revoked', async () => {
      vi.mocked(sessionService.isSessionValid).mockResolvedValue(false);
      const result = await tokenService.issueAccessToken(mockUser, 'qms', 'session-6');

      await expect(tokenService.verifyAccessToken(result.accessToken, 'qms')).rejects.toThrow('Session is no longer valid.');
    });
  });
});
