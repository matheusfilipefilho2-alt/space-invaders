.PHONY: dev test build deploy migrate clean

dev:
	docker-compose up -d postgres redis rabbitmq
	@echo "✅ Infrastructure running. Start backend and frontend manually."

backend-dev:
	cd backend && make run

frontend-dev:
	cd frontend && npm run dev

test:
	cd backend && go test -v -race -coverprofile=coverage.out ./...
	cd backend && go tool cover -func=coverage.out

build:
	cd backend && go build -o bin/server cmd/http/main.go
	cd frontend && npm run build

deploy-staging:
	@echo "Deploy to staging not implemented yet"

deploy-prod:
	@echo "Deploy to production not implemented yet"

migrate-dry-run:
	cd backend/scripts/migrate-from-supabase && go run . --dry-run

migrate:
	cd backend/scripts/migrate-from-supabase && go run .

clean:
	docker-compose down -v
	rm -rf backend/bin
	rm -rf frontend/dist
	rm -rf backend/coverage.out
