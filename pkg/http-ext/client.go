package httpext

import (
	"net/http"
	"time"
)

type Client struct {
	*http.Client
}

func New(timeout time.Duration, rps int) *Client {
	return &Client{
		&http.Client{
			Transport: newTransport(rps),
			Timeout:   timeout,
		},
	}
}
