#!/bin/bash
# NFC Card Company Deploy Script
# NOTE: Hosting is deployed from BrandaptOS .firebaserc (target: nfc)
# This script builds locally. For hosting deploy, use BrandaptOS/scripts/deploy.sh hosting:nfc
# Usage: ./scripts/deploy.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
  echo -e "${RED}ERROR: Uncommitted changes detected.${NC}"
  echo "Commit your changes before deploying."
  echo ""
  git status --short
  echo ""
  echo -e "${YELLOW}Workflow: build → commit → deploy (from BrandaptOS) → verify → push${NC}"
  exit 1
fi

# 2. Build
echo -e "${GREEN}Building NFC Card Company...${NC}"
npm run build

# 3. Copy dist to BrandaptOS nfc-dist
echo -e "${GREEN}Copying dist to BrandaptOS/nfc-dist...${NC}"
rm -rf ../BrandaptOS/nfc-dist
cp -r dist ../BrandaptOS/nfc-dist

echo ""
echo -e "${GREEN}✓ Build complete. dist copied to BrandaptOS/nfc-dist.${NC}"
echo -e "${YELLOW}To deploy: cd ../BrandaptOS && firebase deploy --only hosting:nfc --project brandaptos-v2${NC}"
echo -e "${YELLOW}Then verify: https://nfc.brandapt.co${NC}"
