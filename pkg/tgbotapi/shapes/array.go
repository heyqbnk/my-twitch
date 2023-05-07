package shapes

import (
	"encoding/json"
	"fmt"
)

type Array struct {
	items []any
}

func (r *Array) Object(value Object) *Array {
	r.items = append(r.items, value)
	return r
}

func (r Array) MarshalJSON() ([]byte, error) {
	jsonData, err := json.Marshal(r.items)
	if err != nil {
		return nil, fmt.Errorf("marshal json: %w", err)
	}

	return jsonData, nil
}
