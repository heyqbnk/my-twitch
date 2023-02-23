package twitchapi

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

func (a *API) requestAuth(
	ctx context.Context,
	method string,
	params url.Values,
	dest interface{},
) error {
	// Create request.
	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		fmt.Sprintf("https://id.twitch.tv/oauth2/%s", method),
		strings.NewReader(params.Encode()),
	)
	req.Header.Add("Content-Type", "application/x-www-form-urlencoded")

	// Send request.
	res, err := a.client.Do(req)
	if err != nil {
		return fmt.Errorf("send http request: %v", err)
	}

	if res.StatusCode != 200 && res.StatusCode != 400 {
		return fmt.Errorf("unexpected response status %d", res.StatusCode)
	}

	// Read response.
	responseBytes, err := io.ReadAll(res.Body)
	if err != nil {
		return fmt.Errorf("read response: %v", err)
	}

	if res.StatusCode == 400 {
		var errorResponse struct {
			Status  int    `json:"status"`
			Message string `json:"message"`
		}
		if err := json.Unmarshal(responseBytes, &errorResponse); err != nil {
			return fmt.Errorf("unexpected response: %v", err)
		}

		switch errorResponse.Status {
		case 400:
			return ErrAuth400
		case 404:
			return ErrAuth404
		default:
			return errors.New("unknown error occurred")
		}
	}

	if dest != nil {
		if err := json.Unmarshal(responseBytes, dest); err != nil {
			return fmt.Errorf("incorrect response: %v", err)
		}
	}

	return nil
}
