import { NextResponse } from 'next/server';

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}

export function sendSuccess<T>(
  data?: T,
  message = 'Success',
  status = 200,
  meta?: PaginationMeta
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      message,
      ...(data !== undefined && { data }),
      ...(meta && { meta }),
    },
    { status }
  );
}
