package tgbotapiobject

// Reference: https://core.telegram.org/bots/api#webappinfo

type WebAppInfo struct {
	// An HTTPS URL of a Web App to be opened with additional data as specified
	// in Initializing Web Apps.
	// https://core.telegram.org/bots/webapps#initializing-web-apps
	URL string `json:"url"`
}
