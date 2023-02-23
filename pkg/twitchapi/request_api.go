package twitchapi

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
)

// Performs request to API with specified method and parameters.
func (a *API) requestAPI(
	ctx context.Context,
	method string,
	query url.Values,
	dest interface{},
) error {
	// TODO: Check access token

	// Create request.
	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodGet,
		fmt.Sprintf("https://api.twitch.tv/helix/%s?%s", method, query.Encode()),
		nil,
	)
	req.Header.Add("Client-Id", a.clientID)
	req.Header.Add("Authorization", fmt.Sprintf("Bearer %s", a.accessToken))
	// req.Header.Add("Content-Type", "application/json")

	// Send request.
	res, err := a.client.Do(req)
	if err != nil {
		return fmt.Errorf("send http request: %v", err)
	}

	if res.StatusCode == 401 {
		if authErr := a.Authenticate(ctx); authErr != nil {
			return fmt.Errorf("%s: %w", authErr.Error(), ErrAuthorizationFailed)
		}

		return a.requestAPI(ctx, method, query, dest)
	}

	if res.StatusCode != 200 && res.StatusCode != 400 {
		return fmt.Errorf("unexpected response status %d", res.StatusCode)
	}

	// Read response.
	responseBytes, err := io.ReadAll(res.Body)
	if err != nil {
		return fmt.Errorf("read response: %v", err)
	}

	// Extract response JSON.
	var response struct {
		Error   string        `json:"error"`
		Status  int           `json:"status"`
		Message string        `json:"message"`
		Data    requestResult `json:"data"`
	}
	if err := json.Unmarshal(responseBytes, &response); err != nil {
		return fmt.Errorf("unexpected response: %v", err)
	}

	// Error occurred.
	if response.Status != 0 {
		return fmt.Errorf(`request error. "%s: %s"`, response.Error, response.Message)
	}
	if err := json.Unmarshal(response.Data.Bytes, dest); err != nil {
		return fmt.Errorf("incorrect response: %v", err)
	}
	return nil
}

// Miscellaneous type to appropriately handle response from API. This
// type just preserves bytes passed during json unmarshalling which then
// could be used to unmarshal into another structure.
type requestResult struct {
	Bytes []byte
}

func (r *requestResult) UnmarshalJSON(b []byte) error {
	r.Bytes = b
	return nil
}
