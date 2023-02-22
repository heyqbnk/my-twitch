package tgbotapiobject

// Reference: https://core.telegram.org/bots/api#menubutton

const (
	MenuButtonTypeCommands MenuButtonType = "commands"
	MenuButtonTypeWebApp   MenuButtonType = "web_app"
	MenuButtonTypeDefault  MenuButtonType = "default"
)

type MenuButtonType string

// String returns string representation of current value.
func (t MenuButtonType) String() string {
	return string(t)
}

// Known returns true in case, current value is known.
func (t MenuButtonType) Known() bool {
	switch t {
	case MenuButtonTypeCommands, MenuButtonTypeDefault, MenuButtonTypeWebApp:
		return true
	default:
		return false
	}
}

type MenuButton struct {
	Type   MenuButtonType `json:"type"`
	Text   string         `json:"text"`
	WebApp WebAppInfo     `json:"web_app"`
}

// AsCommands returns MenuButtonCommands representation of this button and
// boolean value stating that value is correct.
func (b MenuButton) AsCommands() (MenuButtonCommands, bool) {
	if !b.IsCommands() {
		return MenuButtonCommands{}, false
	}
	return MenuButtonCommands{Type: b.Type}, true
}

// AsDefault returns MenuButtonDefault representation of this button and
// boolean value stating that value is correct.
func (b MenuButton) AsDefault() (MenuButtonDefault, bool) {
	if !b.IsDefault() {
		return MenuButtonDefault{}, false
	}
	return MenuButtonDefault{Type: b.Type}, true
}

// AsWebApp returns MenuButtonWebApp representation of this button and
// boolean value stating that value is correct.
func (b MenuButton) AsWebApp() (MenuButtonWebApp, bool) {
	if !b.IsWebApp() {
		return MenuButtonWebApp{}, false
	}
	return MenuButtonWebApp{
		Type:   b.Type,
		Text:   b.Text,
		WebApp: b.WebApp,
	}, true
}

// IsCommands returns true in case, current button type is "commands".
func (b MenuButton) IsCommands() bool {
	return b.Type == MenuButtonTypeCommands
}

// IsWebApp returns true in case, current button type is "web_app".
func (b MenuButton) IsWebApp() bool {
	return b.Type == MenuButtonTypeWebApp
}

// IsDefault returns true in case, current button type is "default".
func (b MenuButton) IsDefault() bool {
	return b.Type == MenuButtonTypeDefault
}
