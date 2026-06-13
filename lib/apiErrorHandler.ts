import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AppError } from '@/errors/customErrors';
import { logger } from '@/lib/logger';

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      logger.error(error.message, { errorCode: error.errorCode, details: error.details });
    }
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error.message,
          code: error.errorCode,
          ...(error.details !== undefined && { details: error.details }),
        },
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.issues.map((e) => ({ field: e.path.map(String).join('.'), message: e.message })),
        },
      },
      { status: 400 }
    );
  }

  const message = error instanceof Error ? error.message : 'An unexpected error occurred';
  logger.error(message, { raw: String(error) });
  return NextResponse.json(
    { success: false, error: { message, code: 'INTERNAL_SERVER_ERROR' } },
    { status: 500 }
  );
}
