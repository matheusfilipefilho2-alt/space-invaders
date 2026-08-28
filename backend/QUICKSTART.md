# Space Invaders Backend - Quick Start Guide

## 🚀 Getting Started (3 steps)

### 1. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env and set at minimum:
# - JWT_SECRET (any random 32+ character string)
# - Other values can use defaults for local development
nano .env
```

### 2. Start Services

```bash
# Start all services (PostgreSQL + Redis + API)
docker-compose up -d

# View logs
docker-compose logs -f
```

### 3. Verify

```bash
# Check if API is healthy
curl http://localhost:8080/health

# You should see: {"status":"ok"}
```

That's it! 🎉 Your backend is running at `http://localhost:8080`

---

## 📦 What's Running?

- **API** - `http://localhost:8080` - Main backend API
- **PostgreSQL** - `localhost:5432` - Database
- **Redis** - `localhost:6379` - Cache
- **Prometheus** - `localhost:9091` - Metrics (optional)

---

## 🛠️ Common Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs (all services)
docker-compose logs -f

# View logs (specific service)
docker-compose logs -f api
docker-compose logs -f postgres

# Restart services
docker-compose restart

# Rebuild after code changes
docker-compose build api
docker-compose up -d api

# Start with monitoring (Prometheus)
docker-compose --profile monitoring up -d

# Clean everything (including volumes)
docker-compose down -v
```

---

## 🗄️ Database Operations

```bash
# Access PostgreSQL CLI
docker-compose exec postgres psql -U spaceinvaders -d spaceinvaders

# Run migrations manually
docker-compose exec api ./http-api migrate

# Backup database
docker-compose exec postgres pg_dump -U spaceinvaders spaceinvaders > backup.sql

# Restore database
docker-compose exec -T postgres psql -U spaceinvaders spaceinvaders < backup.sql
```

---

## 🔍 Debugging

### Check container status
```bash
docker-compose ps
```

### View recent logs
```bash
docker-compose logs --tail=100
```

### Access container shell
```bash
# API container
docker-compose exec api sh

# PostgreSQL container
docker-compose exec postgres sh
```

### Check resource usage
```bash
docker stats
```

---

## 🌐 API Endpoints

Once running, you can access:

- `GET /health` - Health check
- `GET /api/v1/...` - API endpoints (see API docs)
- `GET /metrics` - Prometheus metrics (if enabled)

Full API documentation: See `docs/api/` folder

---

## 🔒 Production Deployment

For production deployment to Oracle OCI:

1. Follow `DEPLOY.md` for detailed instructions
2. Or use quick deploy script:

```bash
export OCI_HOST=your-instance-ip
./scripts/deploy-oci.sh
```

---

## ❓ Troubleshooting

### Port already in use

```bash
# Check what's using the port
sudo lsof -i :8080

# Change port in .env
echo "API_PORT=8081" >> .env
docker-compose up -d
```

### Database connection errors

```bash
# Ensure PostgreSQL is healthy
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Restart if needed
docker-compose restart postgres
```

### API won't start

```bash
# Check logs for errors
docker-compose logs api

# Common issues:
# - Missing JWT_SECRET in .env
# - Database not ready (wait a few seconds)
# - Port conflict (change API_PORT)
```

### Need to reset everything

```bash
# Nuclear option - deletes all data
docker-compose down -v
docker-compose up -d
```

---

## 📚 More Information

- **Full deployment guide**: See `DEPLOY.md`
- **API documentation**: See `docs/api/`
- **Architecture**: See `docs/architecture/`
- **Contributing**: See `CONTRIBUTING.md`

---

## 💡 Tips

1. **First time setup**: May take a few minutes to download images
2. **Database migrations**: Run automatically on first start
3. **Hot reload**: Not available in production Docker image (use dev mode)
4. **Monitoring**: Add `--profile monitoring` to enable Prometheus
5. **Logs**: Use `docker-compose logs -f` to follow logs in real-time

---

## 🆘 Need Help?

1. Check logs: `docker-compose logs -f`
2. Verify health: `curl http://localhost:8080/health`
3. Check this guide's Troubleshooting section
4. Review `DEPLOY.md` for more details
