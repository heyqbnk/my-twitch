package tgbotapi

//
// import (
// 	object "github.com/qbnk/twitch-announcer/pkg/tgbotapi/object"
// )
//
// type SendPhotoBuilder struct {
// 	options SendPhotoOptions
// 	Caption MessageBuilder
// }
//
// func BeginSendPhotoOptions(chatID object.ChatID, photo object.InputFile) SendPhotoBuilder {
// 	return SendPhotoBuilder{
// 		options: SendPhotoOptions{
// 			ChatID: chatID,
// 			Photo:  photo,
// 		},
// 		Caption: MessageBuilder{},
// 	}
// }
//
// func (b *SendPhotoBuilder) Build() SendPhotoOptions {
// 	b.options.Caption = b.Caption.text
// 	b.options.CaptionEntities = make([]object.MessageEntity, len(b.Caption.entities))
//
// 	copy(b.options.CaptionEntities, b.Caption.entities)
//
// 	return b.options
// }
//
// func NewSendPhotoOptions(chatID object.ChatID, photo object.InputFile) *SendPhotoOptions {
// 	options := &SendPhotoOptions{}
// 	options.SetChatID(chatID)
// 	options.SetPhoto(photo)
//
// 	return options
// }
