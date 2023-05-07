package object

// Reference: https://core.telegram.org/bots/api#menubuttonwebapp

type MenuButtonWebApp struct {
	// Type of the button, must be "web_app".
	Type MenuButtonType `json:"type"`

	// Text on the button.
	Text string `json:"text"`

	// Description of the Web App that will be launched when the user presses
	// the button. The Web App will be able to send an arbitrary message on
	// behalf of the user using the method answerWebAppQuery.
	WebApp WebAppInfo `json:"webApp"`
}
