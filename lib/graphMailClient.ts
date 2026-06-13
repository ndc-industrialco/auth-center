import { logger } from '@/lib/logger';

const TENANT_ID = process.env.AZURE_AD_TENANT_ID ?? '';
const CLIENT_ID  = process.env.AZURE_AD_CLIENT_ID ?? '';
const CLIENT_SECRET = process.env.AZURE_AD_CLIENT_SECRET ?? '';
const TOKEN_ENDPOINT = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

// In-memory app token cache — refreshed 60 s before expiry
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAppToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.value;
  }

  const body = new URLSearchParams({
    grant_type:    'client_credentials',
    client_id:     CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope:         'https://graph.microsoft.com/.default',
  });

  const res = await fetch(TOKEN_ENDPOINT, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    body.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to acquire Graph app token: ${res.status} ${text}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    value:     data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.value;
}

export interface MailMessage {
  toEmail:  string;
  toName?:  string;
  subject:  string;
  htmlBody: string;
}

/**
 * Send mail as a specific user via Microsoft Graph using application-level permissions.
 * Requires Mail.Send application permission on the Azure AD app registration.
 * `senderUpn` is the Entra UPN (or email) of the user to send as.
 */
export async function sendMailAsUser(
  senderUpn: string,
  message: MailMessage
): Promise<void> {
  const token = await getAppToken();

  const payload = {
    message: {
      subject: message.subject,
      body: {
        contentType: 'HTML',
        content: message.htmlBody,
      },
      toRecipients: [
        {
          emailAddress: {
            address: message.toEmail,
            name: message.toName ?? message.toEmail,
          },
        },
      ],
    },
    saveToSentItems: false,
  };

  const res = await fetch(
    `${GRAPH_BASE}/users/${encodeURIComponent(senderUpn)}/sendMail`,
    {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    logger.warn('Graph sendMail failed', { senderUpn, status: res.status, body: text });
    throw new Error(`Graph sendMail returned ${res.status}`);
  }
}
