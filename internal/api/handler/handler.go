package handler

import (
	"github.com/qbnk/twitch-announcer/internal/logger"
)

type Handler struct {
	channelID string
	chatID    int64
	twitch    Twitch
	telegram  Telegram
	logger    *logger.Logger
}

func New(channelID string, chatID int64, twitch Twitch, telegram Telegram, logger *logger.Logger) *Handler {
	return &Handler{
		channelID: channelID,
		chatID:    chatID,
		twitch:    twitch,
		telegram:  telegram,
		logger:    logger,
	}
}
