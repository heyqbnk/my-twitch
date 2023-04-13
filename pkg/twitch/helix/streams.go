package helix

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/url"
)

// Source: https://dev.twitch.tv/docs/api/reference/#get-streams

type Stream struct {
	GameName     string `json:"game_name"`
	Title        string `json:"title"`
	ThumbnailURL string `json:"thumbnail_url"`
}

// GetStream returns stream information.
func (a *API) GetStream(ctx context.Context, accessToken, login string) (Stream, error) {
	var res []Stream
	query := url.Values{}
	query.Set("user_login", login)

	if err := a.request(ctx, accessToken, http.MethodGet, "streams", query, nil, &res); err != nil {
		return Stream{}, fmt.Errorf("request error: %w", err)
	}

	if len(res) == 0 {
		return Stream{}, errors.New("stream not found")
	}

	return res[0], nil
}
