package twitchapi

import "errors"

var (
	ErrAuthorizationFailed = errors.New("not authorized")
	ErrAuth400             = errors.New("invalid token")
	ErrAuth404             = errors.New("client does not exist")
)
