package oauth

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

// Performs a request with specified parameters.
func (a *API) request(
	ctx context.Context,
	method string,
	form url.Values,
	dest interface{},
) error {
	// Create request.
	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		fmt.Sprintf("https://id.twitch.tv/oauth2/%s", method),
		strings.NewReader(form.Encode()),
	)
	req.Header.Add("Content-Type", "application/x-www-form-urlencoded")

	// Send request.
	res, err := a.client.Do(req)
	if err != nil {
		return fmt.Errorf("send http request: %v", err)
	}

	// Read response body.
	body, err := io.ReadAll(res.Body)
	if err != nil {
		return fmt.Errorf("read response. Status %d: %v", res.StatusCode, err)
	}

	// We received non-successful status code. We should try to extract error
	// sent from Twitch.
	if res.StatusCode != 200 {
		// Try to unmarshal it to expected structure.
		var response struct {
			Status  int    `json:"status"`
			Message string `json:"message"`
		}
		if err := json.Unmarshal(body, &response); err != nil {
			return fmt.Errorf("%w: %v", ErrUnexpectedResponse, err)
		}

		switch response.Status {
		case 400:
			return Err400
		case 404:
			return Err404
		default:
			return ErrUnknown
		}
	}

	// In case, destination was specified, it means, caller expects some
	// data to be returned by request.
	if dest != nil {
		// Try to unmarshal body to destination.
		if err := json.Unmarshal(body, dest); err != nil {
			return fmt.Errorf("%w: %v", ErrInvalidResponse, err)
		}
	}

	return nil
}
