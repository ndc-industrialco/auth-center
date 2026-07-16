import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchGraphMailFolders } from '@/lib/graphAdminClient';

describe('fetchGraphMailFolders', () => {
  beforeEach(() => {
    vi.stubEnv('AZURE_AD_TENANT_ID', 'tenant');
    vi.stubEnv('AZURE_AD_CLIENT_ID', 'client');
    vi.stubEnv('AZURE_AD_CLIENT_SECRET', 'secret');
  });

  it('lists folders and tags well-known ids with their short name', async () => {
    const fetchMock = vi.fn(async (url: string | URL) => {
      const href = String(url);
      if (href.includes('/oauth2/v2.0/token')) {
        return new Response(JSON.stringify({ access_token: 'token', expires_in: 3600 }), { status: 200 });
      }
      if (href.includes('/mailFolders/inbox')) {
        return new Response(JSON.stringify({ id: 'opaque-inbox-id' }), { status: 200 });
      }
      if (/\/mailFolders\/(sentitems|archive|deleteditems|drafts|junkemail)/.test(href)) {
        return new Response('not found', { status: 404 });
      }
      if (href.includes('/mailFolders?')) {
        return new Response(
          JSON.stringify({
            value: [
              { id: 'opaque-inbox-id', displayName: 'Inbox', totalItemCount: 12 },
              { id: 'opaque-custom-id', displayName: 'Customer Escalations', totalItemCount: 3 },
            ],
          }),
          { status: 200 }
        );
      }
      throw new Error(`unexpected fetch: ${href}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const folders = await fetchGraphMailFolders('user@example.com');

    expect(folders).toEqual([
      { id: 'opaque-inbox-id', displayName: 'Inbox', totalItemCount: 12, wellKnownName: 'inbox' },
      { id: 'opaque-custom-id', displayName: 'Customer Escalations', totalItemCount: 3, wellKnownName: null },
    ]);
  });
});
