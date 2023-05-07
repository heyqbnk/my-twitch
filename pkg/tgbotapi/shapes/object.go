package shapes

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"strconv"
	"strings"
)

type canMarshalJson interface {
	MarshalJSON() ([]byte, error)
}

type Object struct {
	props map[string]any
}

func (o *Object) File(key string, value []byte) *Object {
	o.set(key, value)
	return o
}

func (o *Object) Int(key string, value int) *Object {
	o.set(key, value)
	return o
}

func (o *Object) Int64(key string, value int64) *Object {
	o.set(key, value)
	return o
}

func (o *Object) String(key string, value string) *Object {
	o.set(key, value)
	return o
}

func (o *Object) Object(key string, value Object) *Object {
	o.set(key, value)
	return o
}

func (o *Object) Array(key string, value Array) *Object {
	o.set(key, value)
	return o
}

func (o Object) MarshalJSON() ([]byte, error) {
	props := o.props
	if props == nil {
		props = make(map[string]any)
	}

	jsonData, err := json.Marshal(props)
	if err != nil {
		return nil, fmt.Errorf("marshal json: %w", err)
	}

	return jsonData, nil
}

func (o *Object) MarshalMultipartFormData() (buf bytes.Buffer, contentType string, err error) {
	var result bytes.Buffer
	formWriter := multipart.NewWriter(&result)

	for key, value := range o.props {
		var writer io.Writer
		var reader io.Reader

		// With this switch we get the form writer.
		switch value.(type) {
		case []byte:
			// FIXME: "file"?
			w, err := formWriter.CreateFormFile(key, "file")
			if err != nil {
				return bytes.Buffer{}, "", fmt.Errorf("create form file writer: %w", err)
			}

			writer = w

		default:
			w, err := formWriter.CreateFormField(key)
			if err != nil {
				return bytes.Buffer{}, "", fmt.Errorf("create form field writer: %w", err)
			}

			writer = w
		}

		// With this switch we get the form reader.
		switch value.(type) {
		case []byte:
			reader = bytes.NewReader(value.([]byte))
		case int:
			reader = strings.NewReader(strconv.Itoa(value.(int)))
		case int64:
			reader = strings.NewReader(strconv.FormatInt(value.(int64), 10))
		case string:
			reader = strings.NewReader(value.(string))
		case Object, Array:
			jsonData, err := json.Marshal(value)
			if err != nil {
				return bytes.Buffer{}, "", fmt.Errorf("marshal json for key %q", key)
			}

			reader = bytes.NewReader(jsonData)
		}

		if _, err := io.Copy(writer, reader); err != nil {
			return bytes.Buffer{}, "", fmt.Errorf("copy field content: %w", err)
		}
	}

	if err := formWriter.Close(); err != nil {
		return bytes.Buffer{}, "", fmt.Errorf("close multipart writer: %w", err)
	}

	return result, formWriter.FormDataContentType(), nil
}

func (o *Object) set(key string, value any) {
	if o.props == nil {
		o.props = make(map[string]any)
	}
	o.props[key] = value
}
