# Space Invaders Backend - Deployment Guide

## 📦 Docker Compose Setup

### Local Development

1. **Copy environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Start all services:**
   ```bash
   docker-compose up -d
   ```

3. **View logs:**
   ```bash
   docker-compose logs -f api
   ```

4. **Stop services:**
   ```bash
   docker-compose down
   ```

### Services Included

- **PostgreSQL** (port 5432) - Main database
- **Redis** (port 6379) - Caching layer
- **RabbitMQ** (port 5672, management 15672) - Message queue
- **API** (port 8080) - Backend application
- **Prometheus** (port 9091) - Metrics (optional, use `--profile monitoring`)

## 🚀 Deploy to Oracle OCI

### Prerequisites

1. **OCI Instance Setup:**
   - Create a compute instance (Ubuntu 20.04+ recommended)
   - Configure security rules:
     - Allow SSH (port 22)
     - Allow HTTP (port 80)
     - Allow HTTPS (port 443)
     - Allow API (port 8080)
   - Note your instance's public IP address

2. **SSH Access:**
   ```bash
   # Generate SSH key if you don't have one
   ssh-keygen -t rsa -b 4096

   # Add your public key to OCI instance
   # (usually done during instance creation)
   ```

3. **OCI CLI (optional but recommended):**
   ```bash
   # Install OCI CLI
   bash -c "$(curl -L https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.sh)"

   # Configure
   oci setup config
   ```

### Deployment Steps

#### Step 1: First-Time Server Setup

SSH into your OCI instance and prepare it:

```bash
# SSH into server
ssh ubuntu@YOUR_INSTANCE_IP

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login again to apply docker group
exit
```

#### Step 2: Deploy Using Script

From your local machine:

```bash
# Set your OCI instance IP
export OCI_HOST=your-instance-ip
export OCI_USER=ubuntu
export OCI_KEY_FILE=~/.ssh/id_rsa

# Run deployment script
./scripts/deploy-oci.sh
```

#### Step 3: Configure Production Environment

SSH to your server and configure environment:

```bash
ssh ubuntu@YOUR_INSTANCE_IP
cd /opt/space-invaders

# Create production environment file
cp .env.production .env.prod

# Edit with your production values
nano .env.prod
```

**Critical values to change:**
- `DB_PASSWORD` - Strong database password
- `RABBITMQ_PASSWORD` - Strong RabbitMQ password
- `JWT_SECRET` - Random 32+ character string
- `SOLANA_TREASURY_PRIVATE_KEY` - Your treasury wallet private key
- `SOLANA_SPACE_MINT` - Your SPACE token mint address
- `ABACATEPAY_API_KEY` - Your AbacatePay API key
- `PINATA_API_KEY` and `PINATA_SECRET_KEY` - Your Pinata credentials
- `CORS_ALLOWED_ORIGINS` - Your frontend domain

#### Step 4: Start Services

```bash
cd /opt/space-invaders

# Start all services
docker-compose --env-file .env.prod up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f api
```

#### Step 5: Database Migrations

```bash
# Run migrations (if needed)
docker-compose exec api /app/http-api migrate up

# Or manually
docker-compose exec postgres psql -U spaceinvaders -d spaceinvaders -f /docker-entrypoint-initdb.d/001_initial_schema.sql
```

### Verification

Check if everything is running:

```bash
# Health check
curl http://localhost:8080/health

# Check all containers
docker-compose ps

# View logs
docker-compose logs --tail=100

# Check specific service
docker-compose logs -f api
```

## 🔧 Common Operations

### Update Deployment

```bash
# From your local machine
export OCI_HOST=your-instance-ip
./scripts/deploy-oci.sh
```

### View Logs

```bash
ssh ubuntu@YOUR_INSTANCE_IP
cd /opt/space-invaders

# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f postgres
docker-compose logs -f redis
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart api
```

### Database Backup

```bash
# Backup
docker-compose exec postgres pg_dump -U spaceinvaders spaceinvaders > backup_$(date +%Y%m%d).sql

# Restore
docker-compose exec -T postgres psql -U spaceinvaders spaceinvaders < backup_20240101.sql
```

### Monitor Resources

```bash
# Container stats
docker stats

# Disk usage
docker system df

# Clean up unused images
docker system prune -a
```

## 🔐 Security Checklist

Before going to production:

- [ ] Change all default passwords
- [ ] Generate strong JWT secret (min 32 chars)
- [ ] Secure Solana private keys (use secrets manager)
- [ ] Enable HTTPS with Let's Encrypt
- [ ] Configure firewall rules
- [ ] Set `GIN_MODE=release`
- [ ] Update `CORS_ALLOWED_ORIGINS` to your domain
- [ ] Enable rate limiting
- [ ] Set up automated backups
- [ ] Configure monitoring and alerts
- [ ] Review all environment variables
- [ ] Test disaster recovery procedures

## 🌐 Domain & HTTPS Setup

### Option 1: Nginx Reverse Proxy

```bash
# Install Nginx
sudo apt install nginx

# Configure Nginx
sudo nano /etc/nginx/sites-available/space-invaders

# Add configuration:
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/space-invaders /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Install Certbot for HTTPS
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### Option 2: Add Nginx to Docker Compose

Add nginx service to `docker-compose.yml` with Let's Encrypt integration.

## 📊 Monitoring with Prometheus

Enable monitoring profile:

```bash
# Start with monitoring
docker-compose --profile monitoring up -d

# Access Prometheus
http://YOUR_INSTANCE_IP:9091
```

## 🔄 Rollback

If deployment fails:

```bash
cd /opt/space-invaders-backups
ls -la  # Find your backup

# Restore
sudo cp -r space-invaders-YYYYMMDD-HHMMSS /opt/space-invaders
cd /opt/space-invaders
docker-compose up -d
```

## 📝 Logs Location

- **Application logs:** `docker-compose logs api`
- **PostgreSQL logs:** `docker-compose logs postgres`
- **Redis logs:** `docker-compose logs redis`
- **RabbitMQ logs:** `docker-compose logs rabbitmq`

## 🆘 Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs api

# Check if port is already in use
sudo netstat -tulpn | grep 8080

# Rebuild container
docker-compose build --no-cache api
docker-compose up -d api
```

### Database connection issues

```bash
# Check if postgres is healthy
docker-compose ps postgres

# Test connection
docker-compose exec postgres psql -U spaceinvaders -d spaceinvaders

# Reset database
docker-compose down -v  # WARNING: This deletes all data
docker-compose up -d
```

### Out of memory

```bash
# Check memory usage
free -h
docker stats

# Increase swap (if needed)
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

## 📞 Support

For issues or questions:
- Check logs first: `docker-compose logs -f`
- Review environment configuration
- Ensure all required environment variables are set
- Verify firewall rules and network connectivity
