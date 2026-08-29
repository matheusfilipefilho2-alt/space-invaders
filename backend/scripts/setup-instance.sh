#!/bin/bash
# Setup script to run on the OCI instance
# Configures firewall, installs Docker, and prepares for deployment

set -e

echo "========================================="
echo " Space Invaders Instance Setup"
echo "========================================="
echo ""

# Update system
echo "→ Updating system packages..."
sudo dnf update -y

# Install Docker
echo "→ Installing Docker..."
sudo dnf install -y dnf-plugins-core
sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Start Docker
echo "→ Starting Docker service..."
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group
echo "→ Adding user to docker group..."
sudo usermod -aG docker $USER

# Configure firewall
echo "→ Configuring firewall..."
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload

# Install additional tools
echo "→ Installing additional tools..."
sudo dnf install -y git wget curl vim htop

# Create app directory
echo "→ Creating application directory..."
sudo mkdir -p /opt/space-invaders
sudo chown $USER:$USER /opt/space-invaders

# Configure system limits for Docker
echo "→ Configuring system limits..."
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

echo ""
echo "========================================="
echo " ✓ Instance setup completed!"
echo "========================================="
echo ""
echo "Important: You need to log out and log back in"
echo "for docker group changes to take effect."
echo ""
echo "After reconnecting, verify Docker:"
echo "  docker --version"
echo "  docker ps"
echo ""
