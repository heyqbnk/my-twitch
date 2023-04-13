package httpext

import (
	"fmt"
	"net/http"
	"time"

	"golang.org/x/time/rate"
)

// Implements the http.RoundTripper interface.
type customTransport struct {
	transport http.RoundTripper
	limiter   *rate.Limiter
}

func (c *customTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	if err := c.limiter.Wait(req.Context()); err != nil {
		return nil, http.ErrHandlerTimeout
	}

	res, err := c.transport.RoundTrip(req)
	if err != nil {
		return nil, fmt.Errorf("default round trip: %w", err)
	}

	return res, nil
}

func newTransport(rps int) *customTransport {
	return &customTransport{
		transport: http.DefaultTransport,
		limiter:   rate.NewLimiter(rate.Every(time.Second/time.Duration(rps)), 1),
	}
}
