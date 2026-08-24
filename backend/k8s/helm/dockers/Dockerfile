# Build stage
FROM golang:1.24 AS build

WORKDIR /app

# Copy only the necessary files for 'go mod download'
COPY go.mod go.sum ./
RUN go mod download

# Copy the rest of the application files
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -o /http-api ./cmd/http

# Final stage
FROM gcr.io/distroless/static-debian11

WORKDIR /

# Copy the binary from the build stage
COPY --from=build /http-api /http-api

EXPOSE 80

CMD ["/http-api"]
