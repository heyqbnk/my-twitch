package tgbotapi

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/qbnk/twitch-announcer/pkg/tgbotapi/shapes"
)

// // Request performs custom request with specified method and parameters.
// func (b *Bot) Request(
// 	ctx context.Context,
// 	method string,
// 	params map[string]any,
// ) (any, error) {
// 	var data interface{}
// 	if err := b.request(ctx, method, params, &data); err != nil {
// 		return nil, err
// 	}
// 	return data, nil
// }

// Performs request with specified method and parameters.
func (b *Bot) request(ctx context.Context, method string, params shapes.Object, dest interface{}) error {
	buffer, contentType, err := params.MarshalMultipartFormData()
	if err != nil {
		return fmt.Errorf("marshal multipart form data: %w", err)
	}

	// Create request.
	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		fmt.Sprintf("https://api.telegram.org/bot%s/%s", b.token, method),
		&buffer,
	)
	req.Header.Add("Content-Type", contentType)

	res, err := b.client.Do(req)
	if err != nil {
		return fmt.Errorf("error response: %v", err)
	}

	responseBytes, err := io.ReadAll(res.Body)
	if err != nil {
		return fmt.Errorf("read response: %v", err)
	}

	var response struct {
		Result      requestResult `json:"result"`
		ErrorCode   int           `json:"error_code"`
		Description string        `json:"description"`
	}
	if err := json.Unmarshal(responseBytes, &response); err != nil {
		return ErrUnexpectedResponse
	}

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
