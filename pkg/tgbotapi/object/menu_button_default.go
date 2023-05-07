package object

// Reference: https://core.telegram.org/bots/api#menubuttondefault

type MenuButtonDefault struct {
	// Type of the button, must be "default".
	Type MenuButtonType `json:"type"`
}
