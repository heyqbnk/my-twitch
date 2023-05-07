package object

// Reference: https://core.telegram.org/bots/api#menubuttoncommands

type MenuButtonCommands struct {
	// Type of the button, must be "commands".
	Type MenuButtonType `json:"type"`
}
