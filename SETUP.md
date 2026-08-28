# Space Invaders - Setup Guide

## 🚀 Início Rápido

### 1. Subir os serviços Docker

```bash
# Da raiz do projeto
docker-compose up -d
```

Isso irá iniciar:
- **PostgreSQL** (porta 5429)
- **Redis** (porta 6379)
- **RabbitMQ** (porta 5672 + Management UI na 15672)
- **RedisInsight** (porta 16379)
- **Backend API** (porta 8080)

### 2. Verificar status dos serviços

```bash
docker-compose ps
```

### 3. Ver logs

```bash
# Todos os serviços
docker-compose logs -f

# Apenas backend
docker-compose logs -f backend

# Apenas database
docker-compose logs -f postgres
```

## 🗄️ Database

### Migrations

As migrations são gerenciadas pelo **goose** e ficam em `backend/database/migrations/`.

```bash
cd backend

# Rodar todas as migrations
goose -dir database/migrations up

# Rollback última migration
goose -dir database/migrations down

# Ver status
goose -dir database/migrations status

# Criar nova migration
goose -dir database/migrations create nome_da_migration sql
```

### Seeds

```bash
cd backend

# Rodar todas as seeds
go run ./scripts/seed/*.go
```

Seeds disponíveis:
- **Players** (4 usuários de teste)
- **Leagues** (6 ligas: Bronze → Master)
- **Achievements** (17 conquistas)

### Usuários de Teste

| Username | Email | Senha | Gold | League |
|----------|-------|-------|------|--------|
| test | test@example.com | password123 | 1000 | Silver |
| player1 | player1@example.com | password123 | 500 | Bronze |
| player2 | player2@example.com | password123 | 2000 | Gold |
| admin | admin@example.com | password123 | 10000 | Diamond |

## 🔧 Configuração

### Variáveis de Ambiente

#### Backend (`backend/.env`)

```env
# Database
DATABASE_URL=postgres://spaceinvaders:dev_password_change_in_prod@localhost:5429/spaceinvaders?sslmode=disable
GOOSE_DRIVER=postgres
GOOSE_DBSTRING=postgres://spaceinvaders:dev_password_change_in_prod@localhost:5429/spaceinvaders?sslmode=disable

# Redis
REDIS_URL=redis://localhost:6379

# RabbitMQ
RABBITMQ_URL=amqp://spaceinvaders:dev_password_change_in_prod@localhost:5672/

# Server
PORT=8080
GIN_MODE=debug
JWT_SECRET=change_this_in_production_min_32_chars

# Solana
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet

# AbacatePay
ABACATEPAY_API_KEY=
ABACATEPAY_BASE_URL=https://api.abacatepay.com/v1
```

#### Frontend (`.env` na raiz)

```env
VITE_SUPABASE_URL="https://apbbhuhtdqfwfmlzxnwv.supabase.co/"
VITE_SUPABASE_ANON_KEY="..."
VITE_ABACATE_PAY=abc_dev_36LGWbADGu61FZa5L2bURW3w
```

## 🌐 Interfaces Web

- **Backend API**: http://localhost:8080
- **RabbitMQ Management**: http://localhost:15672
  - User: `spaceinvaders`
  - Pass: `dev_password_change_in_prod`
- **RedisInsight**: http://localhost:16379

## 🛑 Parar e Limpar

```bash
# Parar serviços
docker-compose down

# Parar e remover volumes (CUIDADO: apaga dados do banco)
docker-compose down -v

# Rebuild completo
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## 📊 Reset do Banco de Dados

Se precisar resetar completamente o banco:

```bash
# 1. Parar os serviços
docker-compose down

# 2. Remover volumes
docker volume rm space-invaders_postgres_data

# 3. Subir novamente
docker-compose up -d

# 4. Aguardar o postgres inicializar (10-15s)
sleep 15

# 5. Rodar migrations e seeds
cd backend
goose -dir database/migrations up
go run ./scripts/seed/*.go
```

## 🏗️ Estrutura de Migrations

```
backend/database/migrations/
├── 20241217181656_create_books_table.sql (legacy)
├── 20241217181657_create_chapters_table.sql (legacy)
├── 20260824200000_create_space_invaders_schema.sql (main schema)
├── 20260828152442_add_economy_tables.sql (economy + battle pass)
└── 20260828152858_update_players_table.sql (player columns update)
```

## 📝 Notas Importantes

1. **Auto-Migration Desabilitado**: O GORM auto-migration foi desabilitado. Use goose para gerenciar o schema.

2. **Porta do Postgres**: 5429 (não 5432) para evitar conflitos com instâncias locais.

3. **Senha padrão**: `password123` para todos os usuários de teste.

4. **Docker Compose Único**: Existe apenas um docker-compose.yml na raiz do projeto.

## 🐛 Troubleshooting

### Backend não conecta ao banco

```bash
# Verificar se o postgres está rodando
docker-compose ps postgres

# Ver logs do postgres
docker-compose logs postgres

# Testar conexão manual
psql -h localhost -p 5429 -U spaceinvaders -d spaceinvaders
```

### Erro de migration

```bash
# Ver status das migrations
cd backend
goose -dir database/migrations status

# Se necessário, resetar para versão específica
goose -dir database/migrations down-to VERSION
```

### Port já em uso

```bash
# Verificar processos usando portas
lsof -i :5429  # Postgres
lsof -i :8080  # Backend
lsof -i :6379  # Redis

# Matar processo específico
kill -9 PID
```
