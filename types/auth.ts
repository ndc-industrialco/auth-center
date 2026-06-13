export type AuthMethod = 'ENTRA' | 'LOCAL_PASSWORD' | 'LOCAL_OTP';
export type EmploymentStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'TERMINATED';
export type SessionStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED';
export type IdentityType = 'ENTRA' | 'LOCAL';

export type LoginOutcome =
  | 'SUCCESS'
  | 'FAILED_CREDENTIALS'
  | 'FAILED_RATE_LIMIT'
  | 'FAILED_ACCOUNT_LOCKED'
  | 'FAILED_NOT_FOUND'
  | 'FAILED_ENTRA_ERROR';

export interface AuthUser {
  id: string;
  employeeId: string;
  email?: string | null;
  displayName?: string | null;
  m365Linked: boolean;
  canSendDelegatedMail: boolean;
  employmentStatus: EmploymentStatus;
  defaultAuthMethod: AuthMethod;
  authMethod: AuthMethod;
  departmentId?: string | null;
}

export interface EntraProfile {
  sub: string;             // entra objectId
  email?: string;
  name?: string;
  preferred_username?: string;
  employeeId?: string;     // from Graph onPremisesSamAccountName or extension attribute
  department?: string;     // from Graph department field — used for DefaultRolePolicy matching
  jobTitle?: string;
  officeLocation?: string;
  mobilePhone?: string;
}
