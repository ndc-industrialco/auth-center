import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all dependencies before importing the service
vi.mock('@/repositories/userRepository', () => ({
  userRepository: {
    findByEmployeeId: vi.fn(),
    findWithProfile: vi.fn(),
  },
}));
vi.mock('@/repositories/localCredentialRepository', () => ({
  localCredentialRepository: {
    findByUserId: vi.fn(),
    incrementFailedAttempts: vi.fn(),
    lockAccount: vi.fn(),
    resetFailedAttempts: vi.fn(),
  },
}));
vi.mock('@/repositories/loginAuditRepository', () => ({
  loginAuditRepository: {
    record: vi.fn(),
  },
}));
vi.mock('@/services/sessionService', () => ({
  sessionService: {
    createSession: vi.fn().mockResolvedValue({ sessionId: 'mock-session-id' }),
  },
}));
vi.mock('@/services/tokenService', () => ({
  tokenService: {
    issueAccessToken: vi.fn().mockResolvedValue({
      accessToken: 'mock-access-token',
      expiresAt: 9999999999,
      sessionId: 'mock-session-id',
    }),
  },
}));
vi.mock('@/lib/rateLimit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 9, resetAt: 0 }),
}));
vi.mock('@/lib/db', () => ({
  db: {
    $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn({})),
  },
}));

import { localAuthService } from '@/services/localAuthService';
import { userRepository } from '@/repositories/userRepository';
import { localCredentialRepository } from '@/repositories/localCredentialRepository';
import { loginAuditRepository } from '@/repositories/loginAuditRepository';
import bcrypt from 'bcryptjs';

const MOCK_HASH = bcrypt.hashSync('Password1234', 10);

const mockUser = {
  id: 'user-id-001',
  employeeId: 'EMP001',
  email: 'emp001@ndc.co.th',
  displayName: 'Test User',
  m365Linked: false,
  canSendDelegatedMail: false,
  employmentStatus: 'ACTIVE',
  defaultAuthMethod: 'LOCAL_PASSWORD',
};

const mockCredential = {
  id: 'cred-001',
  userId: 'user-id-001',
  passwordHash: MOCK_HASH,
  failedAttempts: 0,
  lockedUntil: null,
  lastChangedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('LocalAuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(userRepository.findByEmployeeId).mockResolvedValue(mockUser as never);
    vi.mocked(userRepository.findWithProfile).mockResolvedValue({ ...mockUser, profile: null } as never);
    vi.mocked(localCredentialRepository.findByUserId).mockResolvedValue(mockCredential as never);
    vi.mocked(localCredentialRepository.resetFailedAttempts).mockResolvedValue(mockCredential as never);
  });

  it('returns a token result on valid credentials', async () => {
    const result = await localAuthService.login(
      { employeeId: 'EMP001', password: 'Password1234' },
      '127.0.0.1',
      'test-agent'
    );

    expect(result.accessToken).toBe('mock-access-token');
    expect(result.sessionId).toBe('mock-session-id');
    expect(loginAuditRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'SUCCESS' })
    );
  });

  it('throws UnauthorizedError on wrong password', async () => {
    vi.mocked(localCredentialRepository.incrementFailedAttempts).mockResolvedValue({
      ...mockCredential,
      failedAttempts: 1,
    } as never);

    await expect(
      localAuthService.login({ employeeId: 'EMP001', password: 'WrongPassword1' }, '127.0.0.1', 'ua')
    ).rejects.toThrow('Invalid credentials');

    expect(loginAuditRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'FAILED_CREDENTIALS' }),
      expect.anything()
    );
  });

  it('throws UnauthorizedError when user not found (no enumeration)', async () => {
    vi.mocked(userRepository.findByEmployeeId).mockResolvedValue(null);

    await expect(
      localAuthService.login({ employeeId: 'GHOST', password: 'Password1234' }, '127.0.0.1', 'ua')
    ).rejects.toThrow('Invalid credentials');
  });

  it('throws AccountLockedError when account is locked', async () => {
    vi.mocked(localCredentialRepository.findByUserId).mockResolvedValue({
      ...mockCredential,
      lockedUntil: new Date(Date.now() + 60_000),
    } as never);

    await expect(
      localAuthService.login({ employeeId: 'EMP001', password: 'Password1234' }, '127.0.0.1', 'ua')
    ).rejects.toThrow('Account is temporarily locked');
  });

  it('throws UnauthorizedError when user is INACTIVE', async () => {
    vi.mocked(userRepository.findByEmployeeId).mockResolvedValue({
      ...mockUser,
      employmentStatus: 'INACTIVE',
    } as never);

    await expect(
      localAuthService.login({ employeeId: 'EMP001', password: 'Password1234' }, '127.0.0.1', 'ua')
    ).rejects.toThrow('Invalid credentials');
  });
});
