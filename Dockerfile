############################
# Source: https://chemidy.medium.com/create-the-smallest-and-secured-golang-docker-image-based-on-scratch-4752223b7324
############################

############################
# STEP 1 build executable binary
############################
FROM golang:1.19-alpine as builder

# Install git + SSL ca certificates.
# Git is required for fetching the dependencies.
# Ca-certificates is required to call HTTPS endpoints.
RUN apk update && apk add --no-cache git ca-certificates tzdata && update-ca-certificates

# Create appuser
ENV USER=appuser
ENV UID=10001

# See https://stackoverflow.com/a/55757473/12429735RUN 
RUN adduser \
    --disabled-password \
    --gecos "" \
    --home "/nonexistent" \
    --shell "/sbin/nologin" \
    --no-create-home \
    --uid "${UID}" \
    "${USER}"

WORKDIR $GOPATH/src/mypackage/myapp/

# Fetch dependencies.
COPY go.mod .
COPY go.sum .
RUN go mod download
RUN go mod verify

COPY cmd cmd
COPY internal internal
COPY pkg pkg

# Build the binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o /go/bin/main cmd/run.go

############################
# STEP 2 build a small image
############################
FROM scratch

# Import from builder.
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /etc/passwd /etc/passwd
COPY --from=builder /etc/group /etc/group

# Copy our static executable
COPY --from=builder /go/bin/main /go/bin/main

WORKDIR /go/bin

# Copy other files.
COPY configs configs

# Use an unprivileged user.
USER appuser:appuser

# Run the main binary.
ENTRYPOINT ["/go/bin/main", "--config", "configs/config.prod.yaml"]