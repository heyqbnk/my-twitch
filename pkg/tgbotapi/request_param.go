package tgbotapi

const (
	_requestParamTypeBytes  requestParamType = iota
	_requestParamTypeChatID requestParamType = iota
	_requestParamTypeFile   requestParamType = iota
	_requestParamTypeInt    requestParamType = iota
)

type requestParamType int

type requestParam struct {
	paramType requestParamType
	value     any
	options   []requestParamOption
}
