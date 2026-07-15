import { describe, expect, it } from 'vitest';
import { searchMailSchema } from '@/schemas/mailSchema';

describe('searchMailSchema', () => {
  it('accepts scoped mailbox search criteria and applies safe defaults', () => {
    const result = searchMailSchema.parse({
      appId: 'crm',
      folder: 'inbox',
      fromEmail: 'customer@example.com',
      keyword: 'invoice',
    });

    expect(result).toMatchObject({ appId: 'crm', folder: 'inbox', limit: 100 });
  });

  it('rejects unsupported folders and invalid date ranges', () => {
    expect(() => searchMailSchema.parse({ appId: 'crm', folder: 'allmail' })).toThrow();
    expect(() => searchMailSchema.parse({
      appId: 'crm',
      fromDate: '2026-07-15T00:00:00Z',
      toDate: '2026-07-01T00:00:00Z',
    })).toThrow();
  });

  it('caps the requested page size', () => {
    expect(() => searchMailSchema.parse({ appId: 'crm', limit: 1001 })).toThrow();
  });
});
