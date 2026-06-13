#!/usr/bin/env bash
# Local CI — mirrors GitHub Actions CI job (lint → test → build)
# Usage: bash scripts/ci-local.sh
set -euo pipefail

echo "▶ Generating Prisma client..."
npx prisma generate

echo "▶ Lint..."
npm run lint

echo "▶ Test..."
npm test

echo "▶ Build (with dummy env vars)..."
export DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
export DIRECT_URL="postgresql://dummy:dummy@localhost:5432/dummy"
export AUTH_SECRET="dummy-secret-minimum-32-characters-long"
export AUTH_URL="http://localhost:3001"
export NEXTAUTH_URL="http://localhost:3001"
export AUTH_TRUST_HOST="true"
export AUTH_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\ndummy\n-----END PRIVATE KEY-----"
export AUTH_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\ndummy\n-----END PUBLIC KEY-----"
export AUTH_KEY_ID="dummy-key-id"
export AZURE_AD_TENANT_ID="dummy"
export AZURE_AD_CLIENT_ID="dummy"
export AZURE_AD_CLIENT_SECRET="dummy"
export REDIS_URL="redis://localhost:6379"

npm run build

echo ""
echo "✅ Local CI passed"
