import { NextResponse } from 'next/server';
import { getPublicJwk } from '@/lib/jwtKeys';

export async function GET() {
  const jwk = await getPublicJwk();

  return NextResponse.json({
    keys: jwk ? [jwk] : [],
  });
}
