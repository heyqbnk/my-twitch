package tgbotapi

import "errors"

var (
	ErrUnexpectedResponse   = errors.New("unexpected response")
	ErrIncorrectResponse    = errors.New("incorrect response")
	ErrUnsuccessfulResponse = errors.New("unsuccessful response")
)
