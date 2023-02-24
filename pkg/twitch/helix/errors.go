package helix

import "errors"

var (
	Err400                = errors.New("error 400")
	Err404                = errors.New("error 404")
	ErrUnknown            = errors.New("unknown error")
	ErrInvalidResponse    = errors.New("invalid response")
	ErrUnexpectedResponse = errors.New("unexpected response")
)
