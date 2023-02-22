package tgbotapiobject

// Reference: https://core.telegram.org/bots/api#inlinekeyboardmarkup

type InlineKeyboardMarkup struct {
	// Array of button rows, each represented by an Array of
	// InlineKeyboardButton objects.
	InlineKeyboard [][]InlineKeyboardButton `json:"inline_keyboard"`
}
