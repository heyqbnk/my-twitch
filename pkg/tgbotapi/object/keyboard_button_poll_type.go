package tgbotapiobject

// Reference: https://core.telegram.org/bots/api#keyboardbuttonpolltype

const (
	KeyboardButtonPollTypeQuiz    KeyboardButtonPollTypeType = "quiz"
	KeyboardButtonPollTypeRegular KeyboardButtonPollTypeType = "regular"
)

type KeyboardButtonPollTypeType string

type KeyboardButtonPollType struct {
	// Optional. If quiz is passed, the user will be allowed to create only
	// polls in the quiz mode. If regular is passed, only regular polls will
	// be allowed. Otherwise, the user will be allowed to create a poll of
	// any type.
	Type KeyboardButtonPollTypeType `json:"type,omitempty"`
}
