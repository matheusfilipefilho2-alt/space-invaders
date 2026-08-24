FROM golang:1.24-alpine

WORKDIR /app

RUN apk add --no-cache bash git build-base

RUN go install github.com/cespare/reflex@latest \
    && go install github.com/go-delve/delve/cmd/dlv@latest \
    && go install go.uber.org/mock/mockgen@latest \
    && go install github.com/pressly/goose/v3/cmd/goose@latest

COPY reflex.conf /
COPY start.sh /

EXPOSE 40000
ENTRYPOINT ["reflex", "-c", "/reflex.conf", "--decoration=none"]

CMD []