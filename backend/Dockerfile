# syntax=docker/dockerfile:1

FROM golang:1.22-alpine AS build
WORKDIR /src

RUN apk add --no-cache ca-certificates

COPY go.mod go.sum ./
RUN go mod download

COPY . .

ARG VERSION=dev
RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags "-s -w -X github.com/ismw-project/ismw/backend/internal/version.Version=${VERSION}" \
    -o /out/ismw-api ./cmd/api

FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /app
COPY --from=build /out/ismw-api /app/ismw-api
EXPOSE 8080
USER nonroot:nonroot
ENTRYPOINT ["/app/ismw-api"]
