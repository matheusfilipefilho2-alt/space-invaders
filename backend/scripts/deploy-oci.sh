#!/bin/bash

# =============================================================================
# Space Invaders Backend - Oracle OCI Deployment Script
# =============================================================================
# This script deploys the backend application to Oracle Cloud Infrastructure
#
# Prerequisites:
# - OCI CLI configured (oci setup config)
# - SSH access to OCI instance
# - Docker and docker-compose installed on OCI instance
# =============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Load instance info if available
INFO_FILE="$(dirname "$0")/oci-instance-info.txt"
if [ -f "$INFO_FILE" ]; then
    DETECTED_IP=$(grep "Public IP:" "$INFO_FILE" | cut -d: -f2 | xargs)
    DETECTED_KEY=$(grep "SSH Key:" "$INFO_FILE" | cut -d: -f2- | xargs)
    OCI_HOST="${OCI_HOST:-$DETECTED_IP}"
    OCI_KEY_FILE="${OCI_KEY_FILE:-$DETECTED_KEY}"
fi

# Configuration
OCI_USER="${OCI_USER:-opc}"
OCI_HOST="${OCI_HOST}"
OCI_KEY_FILE="${OCI_KEY_FILE:-~/.ssh/space-invaders-oci}"
DEPLOY_DIR="/opt/space-invaders"
BACKUP_DIR="/opt/space-invaders-backups"

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check if OCI_HOST is set
    if [ -z "$OCI_HOST" ]; then
        log_error "OCI_HOST environment variable is not set"
        echo "Usage: OCI_HOST=your-instance-ip ./deploy-oci.sh"
        exit 1
    fi

    # Check if SSH key exists
    if [ ! -f "$OCI_KEY_FILE" ]; then
        log_error "SSH key file not found: $OCI_KEY_FILE"
        exit 1
    fi

    # Check SSH connectivity
    if ! ssh -i "$OCI_KEY_FILE" -o ConnectTimeout=10 "${OCI_USER}@${OCI_HOST}" "exit" 2>/dev/null; then
        log_error "Cannot connect to OCI instance via SSH"
        exit 1
    fi

    log_info "Prerequisites check passed"
}

backup_current_deployment() {
    log_info "Creating backup of current deployment..."

    ssh -i "$OCI_KEY_FILE" "${OCI_USER}@${OCI_HOST}" << 'EOF'
        if [ -d "/opt/space-invaders" ]; then
            BACKUP_NAME="space-invaders-$(date +%Y%m%d-%H%M%S)"
            sudo mkdir -p /opt/space-invaders-backups
            sudo cp -r /opt/space-invaders "/opt/space-invaders-backups/${BACKUP_NAME}"
            echo "Backup created: ${BACKUP_NAME}"
        else
            echo "No existing deployment to backup"
        fi
EOF
}

prepare_remote_environment() {
    log_info "Preparing remote environment..."

    ssh -i "$OCI_KEY_FILE" "${OCI_USER}@${OCI_HOST}" << 'EOF'
        # Create deployment directory
        sudo mkdir -p /opt/space-invaders
        sudo chown ${USER}:${USER} /opt/space-invaders

        # Install Docker if not present
        if ! command -v docker &> /dev/null; then
            echo "Installing Docker..."
            curl -fsSL https://get.docker.com -o get-docker.sh
            sudo sh get-docker.sh
            sudo usermod -aG docker ${USER}
        fi

        # Install Docker Compose if not present
        if ! command -v docker-compose &> /dev/null; then
            echo "Installing Docker Compose..."
            sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
            sudo chmod +x /usr/local/bin/docker-compose
        fi

        echo "Remote environment prepared"
EOF
}

sync_files() {
    log_info "Syncing files to OCI instance..."

    # Create temporary directory with files to sync
    TEMP_DIR=$(mktemp -d)

    # Copy necessary files
    cp docker-compose.yml "$TEMP_DIR/"
    cp Dockerfile "$TEMP_DIR/"
    cp .dockerignore "$TEMP_DIR/"
    cp -r cmd "$TEMP_DIR/"
    cp -r internal "$TEMP_DIR/"
    cp -r pkg "$TEMP_DIR/"
    cp -r database "$TEMP_DIR/"
    cp -r configs "$TEMP_DIR/" 2>/dev/null || true
    cp go.mod "$TEMP_DIR/"
    cp go.sum "$TEMP_DIR/"
    cp Makefile "$TEMP_DIR/" 2>/dev/null || true

    # Sync files using rsync
    rsync -avz --delete \
        -e "ssh -i $OCI_KEY_FILE" \
        "$TEMP_DIR/" \
        "${OCI_USER}@${OCI_HOST}:${DEPLOY_DIR}/"

    # Cleanup
    rm -rf "$TEMP_DIR"

    log_info "Files synced successfully"
}

deploy_application() {
    log_info "Deploying application..."

    ssh -i "$OCI_KEY_FILE" "${OCI_USER}@${OCI_HOST}" << EOF
        cd ${DEPLOY_DIR}

        # Check if .env.prod exists
        if [ ! -f .env.prod ]; then
            echo "ERROR: .env.prod file not found on server"
            echo "Please create ${DEPLOY_DIR}/.env.prod with production configuration"
            exit 1
        fi

        # Stop existing containers
        if [ -f docker-compose.yml ]; then
            docker-compose --env-file .env.prod down || true
        fi

        # Pull/build and start containers
        docker-compose --env-file .env.prod build --no-cache
        docker-compose --env-file .env.prod up -d

        echo "Application deployed successfully"
EOF
}

verify_deployment() {
    log_info "Verifying deployment..."

    # Wait for services to start
    sleep 10

    ssh -i "$OCI_KEY_FILE" "${OCI_USER}@${OCI_HOST}" << 'EOF'
        cd /opt/space-invaders

        # Check running containers
        echo "Running containers:"
        docker-compose ps

        # Check API health
        echo ""
        echo "Checking API health..."
        sleep 5
        curl -f http://localhost:8080/health || echo "Health check failed"

        # Show logs
        echo ""
        echo "Recent logs:"
        docker-compose logs --tail=20
EOF
}

main() {
    log_info "Starting deployment to Oracle OCI..."

    check_prerequisites
    backup_current_deployment
    prepare_remote_environment
    sync_files
    deploy_application
    verify_deployment

    log_info "Deployment completed successfully!"
    echo ""
    log_info "Next steps:"
    echo "  1. SSH to server: ssh -i $OCI_KEY_FILE ${OCI_USER}@${OCI_HOST}"
    echo "  2. Configure .env.prod if not done: cd $DEPLOY_DIR && nano .env.prod"
    echo "  3. View logs: cd $DEPLOY_DIR && docker-compose logs -f"
    echo "  4. Restart services: cd $DEPLOY_DIR && docker-compose restart"
}

# Run main function
main
