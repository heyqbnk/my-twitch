package twitch

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"

	"github.com/qbnk/twitch-announcer/pkg/twitchapi"
)

type Service struct {
	api           *twitchapi.API
	webhookSecret string
}

func New(webhookSecret, apiClientID, apiClientSecret string) Service {
	return Service{
		api:           twitchapi.New(apiClientID, apiClientSecret),
		webhookSecret: webhookSecret,
	}
}

// // GetNewAccessToken retrieves new access token.
// func (s Service) GetNewAccessToken(ctx context.Context) (twitchapi.AppAccessTokenInfo, error) {
// 	accessTokenInfo, err := s.api.Authenticate(ctx)
// 	if err != nil {
// 		return twitchapi.AppAccessTokenInfo{}, fmt.Errorf("get info from API: %v", err)
// 	}
//
// 	return accessTokenInfo, nil
// }

// GetChannel returns information about specified Twitch channel by its
// identifier.
func (s Service) GetChannel(ctx context.Context, channelID int) (twitchapi.Channel, error) {
	channel, err := s.api.GetChannel(ctx, channelID)
	if err != nil {
		return twitchapi.Channel{}, fmt.Errorf("get channel from API: %v", err)
	}

	return channel, nil
}

// func (s Service) RefreshAccessToken(ctx context.Context) error {
// 	// Revoke previous access token.
// 	if err := s.api.RevokeAccessToken(ctx, s.api.AccessToken); err != nil {
// 		switch {
// 		case errors.Is(err, twitchapi.ErrAuth400), errors.Is(err, twitchapi.ErrAuth404):
// 		default:
// 			return fmt.Errorf("revoke access token: %v", err)
// 		}
// 	}
//
// 	if accessTokenInfo, err := s.api.Authenticate(ctx); err != nil {
// 		s.api.AccessToken
// 		return twitchapi.AppAccessTokenInfo{}, fmt.Errorf("get info from API: %v", err)
// 	}
//
// 	return nil
// }

// ValidateSignature validates request sent from Twitch by specified
// message ID, its timestamp and signature.
func (s Service) ValidateSignature(messageID, messageTimestamp, body, signature string) bool {
	message := messageID + messageTimestamp + body
	messageSignature := "sha256=" + getHmac(message, s.webhookSecret)

	return messageSignature == signature
}

func getHmac(message, secret string) string {
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(message))

	return hex.EncodeToString(h.Sum(nil))
}
