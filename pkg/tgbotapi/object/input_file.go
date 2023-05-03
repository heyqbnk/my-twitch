package tgbotapiobject

// Reference: https://core.telegram.org/bots/api#inputfile

type InputFile struct {
	url  string
	data []byte
}

func (f InputFile) IsEmpty() bool {
	return len(f.url) == 0 && len(f.data) == 0
}

func (f InputFile) URL() (url string, ok bool) {
	if len(f.url) == 0 {
		return "", false
	}

	return f.url, true
}

func (f InputFile) Data() (data []byte, ok bool) {
	if len(f.data) == 0 {
		return nil, false
	}

	return f.data, true
}

func InputFileFromData(data []byte) InputFile {
	return InputFile{data: data}
}

func InputFileFromURL(url string) InputFile {
	return InputFile{url: url}
}
