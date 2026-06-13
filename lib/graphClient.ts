import { logger } from '@/lib/logger';

const GRAPH_ME_ENDPOINT = 'https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName,onPremisesSamAccountName,employeeId,department,jobTitle,officeLocation,mobilePhone';

export interface GraphMeProfile {
  id: string;
  displayName?: string;
  mail?: string;
  userPrincipalName?: string;
  onPremisesSamAccountName?: string; // maps directly to employeeId in NDC
  employeeId?: string;               // Entra employeeId attribute
  department?: string;
  jobTitle?: string;
  officeLocation?: string;
  mobilePhone?: string;
}

/**
 * Fetch the signed-in user's profile from Microsoft Graph.
 * Uses the delegated access token obtained during Entra sign-in.
 * Returns null on any failure — callers must handle the null case.
 */
export async function fetchGraphMe(accessToken: string): Promise<GraphMeProfile | null> {
  try {
    const response = await fetch(GRAPH_ME_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      logger.warn('Graph /me request failed', { status: response.status });
      return null;
    }

    return (await response.json()) as GraphMeProfile;
  } catch (err) {
    logger.warn('Graph /me fetch error', { error: String(err) });
    return null;
  }
}
