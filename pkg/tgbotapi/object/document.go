package tgbotapiobject

// Reference: https://core.telegram.org/bots/api#document

type Document struct {
	// Identifier for this file, which can be used to download or reuse the file.
	FileID string `json:"file_id"`

	// Unique identifier for this file, which is supposed to be the same over
	// time and for different bots. Can't be used to download or reuse the file.
	FileUniqueID string `json:"file_unique_id"`

	// Optional. Document thumbnail as defined by sender.
	Thumb *PhotoSize `json:"thumb,omitempty"`

	// Optional. Original filename as defined by sender.
	FileName string `json:"file_name,omitempty"`

	// Optional. MIME type of the file as defined by sender.
	MimeType string `json:"mime_type,omitempty"`

	// Optional. File size in bytes. It can be bigger than 2^31 and some
	// programming languages may have difficulty/silent defects in
	// interpreting it. But it has at most 52 significant bits, so a signed
	// 64-bit integer or double-precision float type are safe for storing
	// this value.
	FileSize int `json:"file_size,omitempty"`
}
