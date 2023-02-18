package httphandler

type twitch interface {
	ValidateSignature(messageID, messageTimestamp, body, signature string) bool
}

type Handler struct {
	twitch twitch
}

func New(twitch twitch) Handler {
	return Handler{
		twitch: twitch,
	}
}
