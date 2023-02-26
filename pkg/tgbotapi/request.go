package tgbotapi

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

// Request performs custom request with specified method and parameters.
func (b *Bot) Request(
	ctx context.Context,
	method string,
	params map[string]any,
) (any, error) {
	var data interface{}
	if err := b.request(ctx, method, params, &data); err != nil {
		return nil, err
	}
	return data, nil
}

// Performs request with specified method and parameters.
func (b *Bot) request(
	ctx context.Context,
	method string,
	params any,
	dest interface{},
) error {
	// Prepare request body.
	body, err := json.Marshal(params)
	if err != nil {
		return fmt.Errorf("marshal request body: %v", err)
	}

	// Create request.
	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		fmt.Sprintf("https://api.telegram.org/bot%s/%s", b.token, method),
		bytes.NewBuffer(body),
	)
	req.Header.Add("Content-Type", "application/json")

	// Send request.
	res, err := b.client.Do(req)
	if err != nil {
		return fmt.Errorf("error response: %v", err)
	}

	// Read response.
	responseBytes, err := io.ReadAll(res.Body)
	if err != nil {
		return fmt.Errorf("read response: %v", err)
	}

	// Extract response JSON.
	var response struct {
		Result      requestResult `json:"result"`
		ErrorCode   int           `json:"error_code"`
		Description string        `json:"description"`
	}
	if err := json.Unmarshal(responseBytes, &response); err != nil {
		return ErrUnexpectedResponse
	}

	// Error occurred.
	if response.ErrorCode != 0 {
		return fmt.Errorf("%w: %d %s", ErrUnsuccessfulResponse, response.ErrorCode, response.Description)
	}
	if err := json.Unmarshal(response.Result.Bytes, dest); err != nil {
		return fmt.Errorf("%w: %v", ErrIncorrectResponse, err)
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
