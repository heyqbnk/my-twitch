package object

// Reference: https://core.telegram.org/bots/api#inputfile

type InputFile struct {
	url  string
	blob []byte
}

func (f InputFile) IsEmpty() bool {
	return len(f.url) == 0 && len(f.blob) == 0
}

func (f InputFile) URL() (url string, ok bool) {
	if len(f.url) == 0 {
		return "", false
	}

	return f.url, true
}

func (f InputFile) Blob() (blob []byte, ok bool) {
	if len(f.blob) == 0 {
		return nil, false
	}

	return f.blob, true
}

func InputFileFromBlob(blob []byte) InputFile {
	return InputFile{blob: blob}
}

func InputFileFromURL(url string) InputFile {
	return InputFile{url: url}
}
