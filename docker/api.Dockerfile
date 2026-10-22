# syntax=docker/dockerfile:1
FROM golang:1.26.5-alpine AS build
ARG GOPROXY=https://proxy.golang.org,direct
WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download
COPY cmd/server/ ./cmd/server/
COPY internal/ ./internal/
COPY migrations/ ./migrations/
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/mossline ./cmd/server

FROM alpine:3.23
RUN apk add --no-cache ca-certificates tzdata \
    && addgroup -S -g 10001 mossline \
    && adduser -S -D -H -u 10001 -G mossline mossline \
    && mkdir -p /app/data/uploads \
    && chown -R mossline:mossline /app
WORKDIR /app
COPY --from=build /out/mossline ./mossline
USER mossline
EXPOSE 8081
ENTRYPOINT ["/app/mossline"]
