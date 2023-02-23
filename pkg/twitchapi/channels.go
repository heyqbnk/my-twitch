package twitchapi

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"strconv"
)

type Channel struct {
	Title string `json:"title"`
}

// GetChannel returns channel information.
func (a *API) GetChannel(ctx context.Context, channelID int) (Channel, error) {
	var res []Channel
	query := url.Values{}
	query.Set("broadcaster_id", strconv.Itoa(channelID))

	if err := a.requestAPI(ctx, "channels", query, &res); err != nil {
		return Channel{}, fmt.Errorf("request error: %v", err)
	}

	if len(res) == 0 {
		return Channel{}, errors.New("channel not found")
	}

	return res[0], nil
}
