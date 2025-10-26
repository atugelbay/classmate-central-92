# Dockerfile for backend with migration support
# This file is at the root to access both backend/ and migration/ folders

# Build stage
FROM golang:1.23-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git

# Copy backend go mod files
COPY backend/go.mod backend/go.sum ./
ENV GOTOOLCHAIN=local
RUN go mod download

# Copy backend source code
COPY backend/ ./

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

# Copy migration scripts from project root
COPY migration/ ./migration/

# Install migration dependencies
WORKDIR /root/migration
RUN npm ci --only=production

# Return to root workdir
WORKDIR /root/

# Expose port
EXPOSE 8080

# Run the application
CMD ["./main"]

