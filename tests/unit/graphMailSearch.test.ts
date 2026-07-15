import { beforeEach, describe, expect, it, vi } from 'vitest';
import { searchGraphUserMail } from '@/lib/graphAdminClient';

describe('searchGraphUserMail', () => {
  beforeEach(() => {
    vi.stubEnv('AZURE_AD_TENANT_ID', 'tenant');
    vi.stubEnv('AZURE_AD_CLIENT_ID', 'client');
    vi.stubEnv('AZURE_AD_CLIENT_SECRET', 'secret');
  });

  it('builds a user-scoped folder search and follows Graph pagination', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'token', expires_in: 3600 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        value: [{ id: 'message-1', subject: 'Invoice' }],
        '@odata.nextLink': 'https://graph.microsoft.com/v1.0/next-page',
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ value: [{ id: 'message-2', subject: 'Invoice 2' }] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await searchGraphUserMail({
      userUpn: 'user@example.com',
      folder: 'inbox',
      fromEmail: 'customer@example.com',
      keyword: 'invoice',
      fromDate: '2026-01-01T00:00:00Z',
      limit: 2,
    });

    const firstGraphUrl = String(fetchMock.mock.calls[1][0]);
    expect(firstGraphUrl).toContain('/users/user%40example.com/mailFolders/inbox/messages?');
    expect(firstGraphUrl).toContain('%24search=%22from%3Acustomer%40example.com%22+AND+%22invoice%22');
    expect(firstGraphUrl).toContain('receivedDateTime+ge+2026-01-01T00%3A00%3A00Z');
    expect(result.messages.map((message) => message.id)).toEqual(['message-1', 'message-2']);
    expect(result.hasMore).toBe(false);
  });
});
