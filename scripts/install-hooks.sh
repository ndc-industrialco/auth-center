#!/usr/bin/env bash
# Install git hooks for this repo
set -euo pipefail

HOOKS_DIR="$(git rev-parse --show-toplevel)/.git/hooks"

cat > "$HOOKS_DIR/pre-push" << 'EOF'
#!/usr/bin/env bash
# Pre-push: run lint + tests (skip build to keep it fast)
set -euo pipefail
echo "⏳ Pre-push CI: lint + test..."
npx prisma generate --silent 2>/dev/null || npx prisma generate
npm run lint && npm test
echo "✅ Pre-push CI passed"
EOF

chmod +x "$HOOKS_DIR/pre-push"
echo "✅ pre-push hook installed → $HOOKS_DIR/pre-push"
