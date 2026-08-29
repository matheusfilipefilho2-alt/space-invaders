#!/bin/bash
# Provision OCI Free Tier Instance for Space Invaders Backend
# This script creates a complete infrastructure setup on Oracle Cloud

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  OCI Free Tier Instance Provisioning${NC}"
echo -e "${BLUE}  Space Invaders Backend${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Get configuration
TENANCY_ID=$(grep tenancy ~/.oci/config | cut -d= -f2)
REGION=$(grep region ~/.oci/config | cut -d= -f2)

echo -e "${GREEN}✓${NC} Tenancy: ${TENANCY_ID}"
echo -e "${GREEN}✓${NC} Region: ${REGION}\n"

# Get compartment (use root compartment for simplicity)
COMPARTMENT_ID=$TENANCY_ID
echo -e "${GREEN}✓${NC} Using root compartment\n"

# Get availability domain
echo -e "${YELLOW}→${NC} Getting availability domain..."
AVAILABILITY_DOMAIN=$(oci iam availability-domain list \
    --compartment-id $COMPARTMENT_ID \
    --query 'data[0].name' \
    --raw-output 2>/dev/null)
echo -e "${GREEN}✓${NC} Availability Domain: ${AVAILABILITY_DOMAIN}\n"

# Instance configuration
INSTANCE_NAME="space-invaders-backend"
SHAPE="VM.Standard.E2.1.Micro"  # Free tier eligible
SHAPE_OCPUS=1
SHAPE_MEMORY_GB=1

# Image: Oracle Linux 9 (ARM64 for A1.Flex or x86 for E2.1.Micro)
echo -e "${YELLOW}→${NC} Finding Oracle Linux 9 image..."
IMAGE_ID=$(oci compute image list \
    --compartment-id $COMPARTMENT_ID \
    --operating-system "Oracle Linux" \
    --operating-system-version "9" \
    --shape $SHAPE \
    --query 'data[0].id' \
    --raw-output 2>/dev/null)

if [ -z "$IMAGE_ID" ]; then
    echo -e "${RED}✗${NC} Could not find compatible image. Trying alternative..."
    # Try Ubuntu as fallback
    IMAGE_ID=$(oci compute image list \
        --compartment-id $COMPARTMENT_ID \
        --operating-system "Canonical Ubuntu" \
        --shape $SHAPE \
        --query 'data[0].id' \
        --raw-output 2>/dev/null | head -1)
fi

echo -e "${GREEN}✓${NC} Image ID: ${IMAGE_ID}\n"

# Check/Create VCN
echo -e "${YELLOW}→${NC} Checking for existing VCN..."
VCN_ID=$(oci network vcn list \
    --compartment-id $COMPARTMENT_ID \
    --query "data[?\"display-name\"=='space-invaders-vcn'].id | [0]" \
    --raw-output 2>/dev/null)

if [ "$VCN_ID" == "null" ] || [ -z "$VCN_ID" ]; then
    echo -e "${YELLOW}→${NC} Creating VCN..."
    VCN_ID=$(oci network vcn create \
        --compartment-id $COMPARTMENT_ID \
        --display-name "space-invaders-vcn" \
        --cidr-block "10.0.0.0/16" \
        --dns-label "spaceinvaders" \
        --wait-for-state AVAILABLE \
        --query 'data.id' \
        --raw-output 2>/dev/null)
    echo -e "${GREEN}✓${NC} VCN created: ${VCN_ID}"
else
    echo -e "${GREEN}✓${NC} Using existing VCN: ${VCN_ID}"
fi
echo ""

# Check/Create Internet Gateway
echo -e "${YELLOW}→${NC} Checking for Internet Gateway..."
IGW_ID=$(oci network internet-gateway list \
    --compartment-id $COMPARTMENT_ID \
    --vcn-id $VCN_ID \
    --query 'data[0].id' \
    --raw-output 2>/dev/null)

if [ "$IGW_ID" == "null" ] || [ -z "$IGW_ID" ]; then
    echo -e "${YELLOW}→${NC} Creating Internet Gateway..."
    IGW_ID=$(oci network internet-gateway create \
        --compartment-id $COMPARTMENT_ID \
        --vcn-id $VCN_ID \
        --display-name "space-invaders-igw" \
        --is-enabled true \
        --wait-for-state AVAILABLE \
        --query 'data.id' \
        --raw-output 2>/dev/null)
    echo -e "${GREEN}✓${NC} Internet Gateway created: ${IGW_ID}"
else
    echo -e "${GREEN}✓${NC} Using existing Internet Gateway: ${IGW_ID}"
fi
echo ""

# Check/Create Route Table
echo -e "${YELLOW}→${NC} Checking for Route Table..."
RT_ID=$(oci network route-table list \
    --compartment-id $COMPARTMENT_ID \
    --vcn-id $VCN_ID \
    --query "data[?\"display-name\"=='space-invaders-rt'].id | [0]" \
    --raw-output 2>/dev/null)

if [ "$RT_ID" == "null" ] || [ -z "$RT_ID" ]; then
    echo -e "${YELLOW}→${NC} Creating Route Table..."
    RT_ID=$(oci network route-table create \
        --compartment-id $COMPARTMENT_ID \
        --vcn-id $VCN_ID \
        --display-name "space-invaders-rt" \
        --route-rules "[{\"destination\":\"0.0.0.0/0\",\"destinationType\":\"CIDR_BLOCK\",\"networkEntityId\":\"$IGW_ID\"}]" \
        --wait-for-state AVAILABLE \
        --query 'data.id' \
        --raw-output 2>/dev/null)
    echo -e "${GREEN}✓${NC} Route Table created: ${RT_ID}"
else
    echo -e "${GREEN}✓${NC} Using existing Route Table: ${RT_ID}"
fi
echo ""

# Check/Create Security List
echo -e "${YELLOW}→${NC} Checking for Security List..."
SL_ID=$(oci network security-list list \
    --compartment-id $COMPARTMENT_ID \
    --vcn-id $VCN_ID \
    --query "data[?\"display-name\"=='space-invaders-sl'].id | [0]" \
    --raw-output 2>/dev/null)

if [ "$SL_ID" == "null" ] || [ -z "$SL_ID" ]; then
    echo -e "${YELLOW}→${NC} Creating Security List with rules for SSH, HTTP, HTTPS, API..."

    # Create ingress rules JSON
    cat > /tmp/ingress-rules.json <<EOF
[
  {
    "protocol": "6",
    "source": "0.0.0.0/0",
    "isStateless": false,
    "tcpOptions": {
      "destinationPortRange": {
        "min": 22,
        "max": 22
      }
    },
    "description": "SSH"
  },
  {
    "protocol": "6",
    "source": "0.0.0.0/0",
    "isStateless": false,
    "tcpOptions": {
      "destinationPortRange": {
        "min": 80,
        "max": 80
      }
    },
    "description": "HTTP"
  },
  {
    "protocol": "6",
    "source": "0.0.0.0/0",
    "isStateless": false,
    "tcpOptions": {
      "destinationPortRange": {
        "min": 443,
        "max": 443
      }
    },
    "description": "HTTPS"
  },
  {
    "protocol": "6",
    "source": "0.0.0.0/0",
    "isStateless": false,
    "tcpOptions": {
      "destinationPortRange": {
        "min": 8080,
        "max": 8080
      }
    },
    "description": "API"
  }
]
EOF

    # Create egress rules JSON
    cat > /tmp/egress-rules.json <<EOF
[
  {
    "protocol": "all",
    "destination": "0.0.0.0/0",
    "isStateless": false,
    "description": "Allow all outbound"
  }
]
EOF

    SL_ID=$(oci network security-list create \
        --compartment-id $COMPARTMENT_ID \
        --vcn-id $VCN_ID \
        --display-name "space-invaders-sl" \
        --ingress-security-rules file:///tmp/ingress-rules.json \
        --egress-security-rules file:///tmp/egress-rules.json \
        --wait-for-state AVAILABLE \
        --query 'data.id' \
        --raw-output 2>/dev/null)

    rm /tmp/ingress-rules.json /tmp/egress-rules.json
    echo -e "${GREEN}✓${NC} Security List created: ${SL_ID}"
else
    echo -e "${GREEN}✓${NC} Using existing Security List: ${SL_ID}"
fi
echo ""

# Check/Create Subnet
echo -e "${YELLOW}→${NC} Checking for Subnet..."
SUBNET_ID=$(oci network subnet list \
    --compartment-id $COMPARTMENT_ID \
    --vcn-id $VCN_ID \
    --query "data[?\"display-name\"=='space-invaders-subnet'].id | [0]" \
    --raw-output 2>/dev/null)

if [ "$SUBNET_ID" == "null" ] || [ -z "$SUBNET_ID" ]; then
    echo -e "${YELLOW}→${NC} Creating Subnet..."
    SUBNET_ID=$(oci network subnet create \
        --compartment-id $COMPARTMENT_ID \
        --vcn-id $VCN_ID \
        --display-name "space-invaders-subnet" \
        --cidr-block "10.0.1.0/24" \
        --route-table-id $RT_ID \
        --security-list-ids "[\"$SL_ID\"]" \
        --availability-domain $AVAILABILITY_DOMAIN \
        --dns-label "backend" \
        --wait-for-state AVAILABLE \
        --query 'data.id' \
        --raw-output 2>/dev/null)
    echo -e "${GREEN}✓${NC} Subnet created: ${SUBNET_ID}"
else
    echo -e "${GREEN}✓${NC} Using existing Subnet: ${SUBNET_ID}"
fi
echo ""

# Check/Create SSH Key
SSH_KEY_PATH="$HOME/.ssh/space-invaders-oci"
if [ ! -f "$SSH_KEY_PATH" ]; then
    echo -e "${YELLOW}→${NC} Creating SSH key pair..."
    ssh-keygen -t rsa -b 4096 -f "$SSH_KEY_PATH" -N "" -C "space-invaders-oci"
    echo -e "${GREEN}✓${NC} SSH key created: ${SSH_KEY_PATH}"
else
    echo -e "${GREEN}✓${NC} Using existing SSH key: ${SSH_KEY_PATH}"
fi
SSH_PUBLIC_KEY=$(cat "${SSH_KEY_PATH}.pub")
echo ""

# Check if instance already exists
echo -e "${YELLOW}→${NC} Checking for existing instance..."
EXISTING_INSTANCE=$(oci compute instance list \
    --compartment-id $COMPARTMENT_ID \
    --display-name "$INSTANCE_NAME" \
    --query 'data[0].id' \
    --raw-output 2>/dev/null)

if [ "$EXISTING_INSTANCE" != "null" ] && [ -n "$EXISTING_INSTANCE" ]; then
    echo -e "${YELLOW}!${NC} Instance '$INSTANCE_NAME' already exists: ${EXISTING_INSTANCE}"
    echo -e "${YELLOW}!${NC} Skipping instance creation.\n"
    INSTANCE_ID=$EXISTING_INSTANCE
else
    # Create Instance
    echo -e "${YELLOW}→${NC} Creating compute instance..."
    echo -e "   Name: ${INSTANCE_NAME}"
    echo -e "   Shape: ${SHAPE}"
    echo -e "   Image: ${IMAGE_ID}"

    INSTANCE_ID=$(oci compute instance launch \
        --compartment-id $COMPARTMENT_ID \
        --availability-domain $AVAILABILITY_DOMAIN \
        --display-name "$INSTANCE_NAME" \
        --shape $SHAPE \
        --image-id $IMAGE_ID \
        --subnet-id $SUBNET_ID \
        --assign-public-ip true \
        --ssh-authorized-keys-file "${SSH_KEY_PATH}.pub" \
        --wait-for-state RUNNING \
        --query 'data.id' \
        --raw-output 2>/dev/null)

    echo -e "${GREEN}✓${NC} Instance created: ${INSTANCE_ID}\n"
fi

# Get instance details
echo -e "${YELLOW}→${NC} Getting instance details..."
PUBLIC_IP=$(oci compute instance list-vnics \
    --instance-id $INSTANCE_ID \
    --query 'data[0]."public-ip"' \
    --raw-output 2>/dev/null)

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  Instance Provisioned Successfully!${NC}"
echo -e "${GREEN}========================================${NC}\n"

echo -e "${BLUE}Instance Details:${NC}"
echo -e "  Instance ID: ${INSTANCE_ID}"
echo -e "  Public IP: ${PUBLIC_IP}"
echo -e "  SSH Key: ${SSH_KEY_PATH}"
echo -e "\n${BLUE}Connect via SSH:${NC}"
echo -e "  ${YELLOW}ssh -i ${SSH_KEY_PATH} opc@${PUBLIC_IP}${NC}"
echo -e "  (for Ubuntu use: ubuntu@${PUBLIC_IP})"

echo -e "\n${BLUE}Next Steps:${NC}"
echo -e "  1. Wait ~2 minutes for instance to fully initialize"
echo -e "  2. Connect via SSH to configure the firewall"
echo -e "  3. Run the deployment script:"
echo -e "     ${YELLOW}./scripts/deploy-oci.sh${NC}"

# Save connection info
cat > scripts/oci-instance-info.txt <<EOF
OCI Instance Information
========================
Instance ID: ${INSTANCE_ID}
Public IP: ${PUBLIC_IP}
SSH Key: ${SSH_KEY_PATH}
SSH Command: ssh -i ${SSH_KEY_PATH} opc@${PUBLIC_IP}

VCN ID: ${VCN_ID}
Subnet ID: ${SUBNET_ID}
Security List ID: ${SL_ID}

Created: $(date)
EOF

echo -e "\n${GREEN}✓${NC} Connection info saved to: scripts/oci-instance-info.txt"
echo -e "\n${GREEN}Done!${NC}\n"
