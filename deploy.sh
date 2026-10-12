#!/bin/bash
# deploy.sh - Automated Vercel deploy for vitalcar-site

set -e

echo "🚀 Vitalcar - Automated Vercel Deploy"
echo "====================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}Installing Vercel CLI...${NC}"
    npm i -g vercel@latest
fi

# Check if we're in the right directory
if [ ! -f "vercel.json" ]; then
    echo -e "${RED}Error: vercel.json not found. Run from project root.${NC}"
    exit 1
fi

# Check git status
echo -e "${YELLOW}Checking git status...${NC}"
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}Uncommitted changes detected. Committing...${NC}"
    git add .
    git commit -m "deploy: $(date '+%Y-%m-%d %H:%M:%S')"
fi

# Push to GitHub (triggers Vercel auto-deploy)
echo -e "${YELLOW}Pushing to GitHub...${NC}"
git push origin main

echo -e "${GREEN}✅ Pushed to GitHub. Vercel auto-deploy triggered.${NC}"
echo ""
echo "📋 Next steps:"
echo "   1. Check Vercel Dashboard: https://vercel.com/dashboard"
echo "   2. Wait for build to complete (~2 min)"
echo "   3. Test: https://vitalcar-site-ppxt.vercel.app"
echo "   4. Test showroom: https://vitalcar-site-ppxt.vercel.app/showroom"
echo ""
echo "🔑 Don't forget to add Environment Variables in Vercel Dashboard:"
echo "   FIREBASE_PROJECT_ID"
echo "   FIREBASE_CLIENT_EMAIL"
echo "   FIREBASE_PRIVATE_KEY"
echo "   FIREBASE_STORAGE_BUCKET"
echo "   NEXT_PUBLIC_FIREBASE_API_KEY"
echo "   NEXTAUTH_SECRET"
echo ""
echo -e "${GREEN}Done! 🚀${NC}"