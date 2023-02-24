package helix

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
)

// Performs request to Twitch API with specified method and parameters.
func (a *API) request(
	ctx context.Context,
	accessToken, method string,
	query url.Values,
	dest interface{},
) error {
	// Create request.
	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodGet,
		fmt.Sprintf("https://api.twitch.tv/helix/%s?%s", method, query.Encode()),
		nil,
	)
	req.Header.Add("Client-Id", a.clientID)
	req.Header.Add("Authorization", fmt.Sprintf("Bearer %s", accessToken))
	// req.Header.Add("Content-Type", "application/json")

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

	// Try to unmarshal it to expected structure.
	var response struct {
		Error   string        `json:"error"`
		Status  int           `json:"status"`
		Message string        `json:"message"`
		Data    requestResult `json:"data"`
	}
	if err := json.Unmarshal(body, &response); err != nil {
		return fmt.Errorf("%w: %v", ErrUnexpectedResponse, err)
	}

	if res.StatusCode != 200 {
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
		if err := json.Unmarshal(response.Data.Bytes, dest); err != nil {
			return fmt.Errorf("%w: %v", ErrInvalidResponse, err)
		}
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
