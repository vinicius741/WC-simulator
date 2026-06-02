#!/bin/bash
# Deploy WC Simulator via rsync over SSH
# Usage: ./deploy.sh [--dry-run]
#
# Requires a .deploy.env file in the project root with:
#   DEPLOY_REMOTE_HOST, DEPLOY_REMOTE_PATH, DEPLOY_DOMAIN, DEPLOY_DIST

set -euo pipefail

# Load configuration
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.deploy.env"

if [ ! -f "$ENV_FILE" ]; then
    echo -e "\033[0;31mError: $ENV_FILE not found.\033[0m"
    echo "Create it with the following variables:"
    echo "  DEPLOY_REMOTE_HOST=<ssh host alias>"
    echo "  DEPLOY_REMOTE_PATH=<remote path>"
    echo "  DEPLOY_DOMAIN=<public domain>"
    echo "  DEPLOY_DIST=./dist"
    exit 1
fi

# shellcheck source=/dev/null
source "$ENV_FILE"

REMOTE_HOST="${DEPLOY_REMOTE_HOST:?DEPLOY_REMOTE_HOST not set}"
REMOTE_PATH="${DEPLOY_REMOTE_PATH:?DEPLOY_REMOTE_PATH not set}"
LOCAL_DIST="${DEPLOY_DIST:-./dist}"
DOMAIN="${DEPLOY_DOMAIN:?DEPLOY_DOMAIN not set}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}=== WC Simulator Deployment ===${NC}"
echo ""

# Parse arguments
DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
    DRY_RUN=true
    echo -e "${YELLOW}[DRY RUN MODE]${NC} No files will be uploaded."
    echo ""
fi

# Step 1: Build
echo -e "${GREEN}[1/3]${NC} Building project..."
npm run build

if [ ! -d "$LOCAL_DIST" ]; then
    echo -e "${RED}Error: dist/ directory not found. Build may have failed.${NC}"
    exit 1
fi

echo -e "${GREEN}Build complete.${NC} Contents:"
ls -la "$LOCAL_DIST"
echo ""

# Step 2: Test SSH connection
echo -e "${GREEN}[2/3]${NC} Testing SSH connection..."
if ssh -o ConnectTimeout=10 -o BatchMode=yes "$REMOTE_HOST" "echo 'SSH OK'" 2>/dev/null; then
    echo -e "${GREEN}SSH connection successful.${NC}"
else
    echo -e "${RED}SSH connection failed.${NC}"
    echo ""
    echo "To fix this, add your SSH public key to your hosting provider:"
    echo ""
    echo "  1. Go to your hosting panel"
    echo "  2. Navigate to SSH Access settings"
    echo "  3. Add your SSH public key"
    echo ""
    exit 1
fi
echo ""

# Step 3: Deploy
echo -e "${GREEN}[3/3]${NC} Deploying to $DOMAIN..."

RSYNC_ARGS="-avz --delete"
if $DRY_RUN; then
    RSYNC_ARGS="$RSYNC_ARGS --dry-run"
fi

rsync $RSYNC_ARGS "$LOCAL_DIST/" "$REMOTE_HOST:$REMOTE_PATH/"

if $DRY_RUN; then
    echo ""
    echo -e "${YELLOW}[DRY RUN]${NC} No files were actually uploaded."
    echo "Run without --dry-run to deploy for real."
else
    echo ""
    echo -e "${GREEN}=== Deployment complete! ===${NC}"
    echo -e "URL: ${GREEN}https://$DOMAIN${NC}"
fi
