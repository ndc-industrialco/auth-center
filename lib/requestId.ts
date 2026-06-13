import { randomUUID } from 'crypto';
import type { NextRequest } from 'next/server';

const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Returns the request ID from the incoming header, or generates a new UUID.
 * Consuming apps should set x-request-id on every request for end-to-end tracing.
 */
export function getRequestId(request: NextRequest): string {
  return request.headers.get(REQUEST_ID_HEADER) ?? randomUUID();
}
