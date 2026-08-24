## turn .env accessible for migrate
ifneq (,$(findstring migrate,$(firstword $(MAKECMDGOALS))))
	include .env
	export
endif


# migrate-create param handler
ifeq (migrate-create,$(firstword $(MAKECMDGOALS)))
  RUN_ARGS := $(wordlist 2,$(words $(MAKECMDGOALS)),$(MAKECMDGOALS))
  $(eval $(RUN_ARGS):;@:)
endif

generate:
	@go generate ./...


test:
	@go test ./... --cover


lint:
	@docker run -t --rm -v .:/app -w /app golangci/golangci-lint:v2.1.5 golangci-lint run -v -c dev/golangci.yml ./...


migrate-create:
	@goose -dir database/migrations/ create $(RUN_ARGS) sql


migrate-run:
	@goose -dir database/migrations/ up


migrate-rollback:
	@goose -dir database/migrations/ down

migrate-reset:
	@goose -dir database/migrations/ reset

migrate-status:
	@goose -dir database/migrations/ status

# export entries
.PHONY: install-deps generate test lint migrate-create migrate-run migrate-rollback migrate-reset migrate-status
