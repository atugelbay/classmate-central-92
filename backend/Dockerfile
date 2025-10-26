# Build stage
FROM golang:1.23-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git

# Copy go mod files
COPY go.mod go.sum ./
ENV GOTOOLCHAIN=local
RUN go mod download

# Copy source code
COPY . .

# Copy migration scripts from parent directory
COPY ../migration ./migration

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/api

# Runtime stage
FROM alpine:latest

# Install runtime dependencies (Node.js for migration script)
RUN apk --no-cache add ca-certificates tzdata nodejs npm

WORKDIR /root/

# Copy binary from builder
COPY --from=builder /app/main .
COPY --from=builder /app/migrations ./migrations

# Copy migration scripts and install dependencies
COPY --from=builder /app/migration ./migration
WORKDIR /root/migration
RUN npm ci --only=production
WORKDIR /root/

# Expose port
EXPOSE 8080

# Run the application
CMD ["./main"]

