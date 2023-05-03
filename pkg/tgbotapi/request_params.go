package tgbotapi

import (
	"bytes"
	"fmt"
	"io"
	"mime/multipart"
	"strconv"
	"strings"

	tgbotapiobject "github.com/qbnk/twitch-announcer/pkg/tgbotapi/object"
)

type requestParams map[string]requestParam

func (r requestParams) ChatID(key string, value tgbotapiobject.ChatID, options ...requestParamOption) requestParams {
	if !containsOptional(options) || !value.IsEmpty() {
		r.set(key, _requestParamTypeChatID, value, options)
	}
	return r
}

func (r requestParams) Int(key string, value int, options ...requestParamOption) requestParams {
	if !containsOptional(options) || value != 0 {
		r.set(key, _requestParamTypeBytes, value, options)
	}
	return r
}

func (r requestParams) InputFile(
	key string,
	file tgbotapiobject.InputFile,
	options ...requestParamOption,
) requestParams {
	if !containsOptional(options) || !file.IsEmpty() {
		r.set(key, _requestParamTypeFile, file, options)
	}
	return r
}

func (r requestParams) String(key string, value string, options ...requestParamOption) requestParams {
	if !containsOptional(options) || len(value) > 0 {
		r.set(key, _requestParamTypeBytes, []byte(value), options)
	}
	return r
}

func (r requestParams) MarshalMultipartFormData() (buf bytes.Buffer, contentType string, err error) {
	var result bytes.Buffer
	writer := multipart.NewWriter(&result)

	for key, param := range r {
		var fieldWriter io.Writer
		var fieldReader io.Reader

		switch param.paramType {
		case _requestParamTypeBytes:
			paramValue, ok := param.value.([]byte)
			if !ok {
				return bytes.Buffer{}, "", fmt.Errorf("key %q contains invalid value for type []bytes", key)
			}

			w, err := writer.CreateFormField(key)
			if err != nil {
				return bytes.Buffer{}, "", fmt.Errorf("create form field writer: %w", err)
			}

			fieldWriter = w
			fieldReader = bytes.NewReader(paramValue)

		case _requestParamTypeChatID:
			paramValue, ok := param.value.(tgbotapiobject.ChatID)
			if !ok {
				return bytes.Buffer{}, "", fmt.Errorf("key %q contains invalid value for type ChatID", key)
			}

			if id, ok := paramValue.ID(); ok {
				w, err := writer.CreateFormField(key)
				if err != nil {
					return bytes.Buffer{}, "", fmt.Errorf("create form field writer: %w", err)
				}

				fieldWriter = w
				fieldReader = strings.NewReader(strconv.FormatInt(id, 10))
				break
			}

			return bytes.Buffer{}, "", fmt.Errorf("key %q contains unknown value type", key)

		case _requestParamTypeFile:
			file, ok := param.value.(tgbotapiobject.InputFile)
			if !ok {
				return bytes.Buffer{}, "", fmt.Errorf("key %q contains invalid value for type file", key)
			}

			if data, ok := file.Data(); ok {
				// FIXME: "file"?
				w, err := writer.CreateFormFile(key, "file")
				if err != nil {
					return bytes.Buffer{}, "", fmt.Errorf("create form file writer: %w", err)
				}

				fieldWriter = w
				fieldReader = bytes.NewReader(data)
				break
			}

			if url, ok := file.URL(); ok {
				w, err := writer.CreateFormField(key)
				if err != nil {
					return bytes.Buffer{}, "", fmt.Errorf("create form file writer: %w", err)
				}

				fieldWriter = w
				fieldReader = strings.NewReader(url)
				break
			}

			return bytes.Buffer{}, "", fmt.Errorf("key %q contains unknown value type", key)

		case _requestParamTypeInt:
			paramValue, ok := param.value.(int)
			if !ok {
				return bytes.Buffer{}, "", fmt.Errorf("key %q contains invalid value for type int", key)
			}

			w, err := writer.CreateFormField(key)
			if err != nil {
				return bytes.Buffer{}, "", fmt.Errorf("create form field writer: %w", err)
			}

			fieldWriter = w
			fieldReader = strings.NewReader(strconv.Itoa(paramValue))

		default:
			return bytes.Buffer{}, "", fmt.Errorf("unknown param type %q", param.paramType)
		}

		if fieldWriter != nil {
			if _, err := io.Copy(fieldWriter, fieldReader); err != nil {
				return bytes.Buffer{}, "", fmt.Errorf("copy field content: %w", err)
			}
		}
	}

	if err := writer.Close(); err != nil {
		return bytes.Buffer{}, "", fmt.Errorf("close multipart writer: %w", err)
	}

	return result, writer.FormDataContentType(), nil
}

func (r requestParams) set(key string, paramType requestParamType, value any, options []requestParamOption) {
	r[key] = requestParam{
		paramType: paramType,
		value:     value,
		options:   options,
	}
}

func containsOptional(options []requestParamOption) bool {
	for _, opt := range options {
		if opt == _reqParamOptionOptional {
			return true
		}
	}

	return false
}
