package helix

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/url"
)

type Channel struct {
	Title string `json:"title"`
}

// GetChannel returns channel information.
func (a *API) GetChannel(ctx context.Context, accessToken, channelID string) (Channel, error) {
	var res []Channel
	query := url.Values{}
	query.Set("broadcaster_id", channelID)

	if err := a.request(ctx, accessToken, http.MethodGet, "channels", query, nil, &res); err != nil {
		return Channel{}, fmt.Errorf("request error: %w", err)
	}

	if len(res) == 0 {
		return Channel{}, errors.New("channel not found")
	}

	return res[0], nil
}
