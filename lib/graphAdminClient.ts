import { logger } from '@/lib/logger';

const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';
const TOKEN_ENDPOINT = (tenantId: string) =>
  `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

const globalForGraphToken = globalThis as unknown as {
  graphAdminToken?: CachedToken;
};

export interface GraphDirectoryUser {
  id: string;
  displayName?: string;
  mail?: string;
  userPrincipalName?: string;
  onPremisesSamAccountName?: string;
  employeeId?: string;
  department?: string;
  jobTitle?: string;
  officeLocation?: string;
  mobilePhone?: string;
  accountEnabled?: boolean;
}

export interface GraphDirectoryGroup {
  id: string;
  displayName?: string;
  mail?: string;
  description?: string;
  securityEnabled?: boolean;
  mailEnabled?: boolean;
  groupTypes?: string[];
}

export interface GraphDirectoryMember {
  id: string;
  displayName?: string;
  mail?: string;
  userPrincipalName?: string;
  '@odata.type'?: string;
}

function getGraphAppConfig() {
  const tenantId = process.env.AZURE_AD_TENANT_ID;
  const clientId = process.env.AZURE_AD_CLIENT_ID;
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error('Azure AD app credentials are not fully configured');
  }

  return { tenantId, clientId, clientSecret };
}

export async function getGraphAdminAccessToken(): Promise<string> {
  const cached = globalForGraphToken.graphAdminToken;
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.accessToken;
  }

  const { tenantId, clientId, clientSecret } = getGraphAppConfig();

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });

  const response = await fetch(TOKEN_ENDPOINT(tenantId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    logger.error('Failed to obtain Graph application token', { status: response.status, text });
    throw new Error('Failed to obtain Microsoft Graph application token');
  }

  const json = await response.json() as { access_token: string; expires_in: number };
  const token = {
    accessToken: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };

  globalForGraphToken.graphAdminToken = token;
  return token.accessToken;
}

async function graphRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getGraphAdminAccessToken();
  const response = await fetch(`${GRAPH_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    logger.error('Graph API request failed', { path, status: response.status, text });
    throw new Error(`Graph API request failed for ${path}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

async function graphPagedRequest<T>(path: string): Promise<T[]> {
  const token = await getGraphAdminAccessToken();
  const items: T[] = [];
  let nextUrl: string | null = `${GRAPH_BASE_URL}${path}`;

  while (nextUrl) {
    const response = await fetch(nextUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      logger.error('Graph paged request failed', { path: nextUrl, status: response.status, text });
      throw new Error(`Graph paged request failed for ${path}`);
    }

    const json = await response.json() as { value: T[]; '@odata.nextLink'?: string };
    items.push(...json.value);
    nextUrl = json['@odata.nextLink'] ?? null;
  }

  return items;
}

export async function fetchGraphDirectoryUsers(): Promise<GraphDirectoryUser[]> {
  return graphPagedRequest<GraphDirectoryUser>(
    '/users?$select=id,displayName,mail,userPrincipalName,onPremisesSamAccountName,employeeId,department,jobTitle,officeLocation,mobilePhone,accountEnabled'
  );
}

export async function fetchGraphUserById(userId: string): Promise<GraphDirectoryUser> {
  return graphRequest<GraphDirectoryUser>(
    `/users/${userId}?$select=id,displayName,mail,userPrincipalName,onPremisesSamAccountName,employeeId,department,jobTitle,officeLocation,mobilePhone,accountEnabled`
  );
}

export async function fetchGraphMailEnabledGroups(): Promise<GraphDirectoryGroup[]> {
  return graphPagedRequest<GraphDirectoryGroup>(
    "/groups?$filter=mailEnabled eq true&$select=id,displayName,mail,description,securityEnabled,mailEnabled,groupTypes"
  );
}

export async function fetchGraphGroupById(groupId: string): Promise<GraphDirectoryGroup> {
  return graphRequest<GraphDirectoryGroup>(
    `/groups/${groupId}?$select=id,displayName,mail,description,securityEnabled,mailEnabled,groupTypes`
  );
}

export async function fetchGraphGroupMembers(groupId: string): Promise<GraphDirectoryMember[]> {
  return graphPagedRequest<GraphDirectoryMember>(
    `/groups/${groupId}/members?$select=id,displayName,mail,userPrincipalName`
  );
}

export async function updateGraphUserProfile(
  entraObjectId: string,
  input: {
    displayName?: string | null;
    department?: string | null;
    jobTitle?: string | null;
    officeLocation?: string | null;
    mobilePhone?: string | null;
  }
): Promise<void> {
  await graphRequest<void>(`/users/${entraObjectId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      displayName: input.displayName ?? null,
      department: input.department ?? null,
      jobTitle: input.jobTitle ?? null,
      officeLocation: input.officeLocation ?? null,
      mobilePhone: input.mobilePhone ?? null,
    }),
  });
}

export async function addGraphGroupMember(groupId: string, entraObjectId: string): Promise<void> {
  await graphRequest<void>(`/groups/${groupId}/members/$ref`, {
    method: 'POST',
    body: JSON.stringify({
      '@odata.id': `${GRAPH_BASE_URL}/directoryObjects/${entraObjectId}`,
    }),
  });
}

export async function removeGraphGroupMember(groupId: string, entraObjectId: string): Promise<void> {
  await graphRequest<void>(`/groups/${groupId}/members/${entraObjectId}/$ref`, {
    method: 'DELETE',
  });
}
