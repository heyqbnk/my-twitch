package tgbotapi

//
// import (
// 	"context"
// 	"fmt"
//
// 	object "github.com/qbnk/twitch-announcer/pkg/tgbotapi/object"
// 	"github.com/qbnk/twitch-announcer/pkg/tgbotapi/shapes"
// )
//
// // Reference: https://core.telegram.org/bots/api#sendphoto
//
// type SendPhotoOptions struct {
// 	shape shapes.Object
// }
//
// // ChatID sets a unique identifier for the target chat or username of the target
// // channel (in the format @channelusername)
// func (o *SendPhotoOptions) ChatID(chatID object.ChatID) *SendPhotoOptions {
// 	if id, ok := chatID.ID(); ok {
// 		o.shape.Int64("chat_id", id)
// 	} else {
// 		username, _ := chatID.Username()
// 		o.shape.String("chat_id", username)
// 	}
//
// 	return o
// }
//
// // Caption sets photo caption (may also be used when resending photos by file_id),
// // 0-1024 characters after entities parsing.
// func (o *SendPhotoOptions) Caption(caption string) *SendPhotoOptions {
// 	o.shape.String("caption", caption)
// 	return o
// }
//
// // CaptionEntities sets a JSON-serialized list of special entities that appear
// // in the caption, which can be specified instead of parse_mode
// func (o *SendPhotoOptions) CaptionEntities(entities []object.MessageEntity) *SendPhotoOptions {
// 	var array shapes.Array
// 	for _, ent := range entities {
// 		array.Object(ent.Shape())
// 	}
//
// 	o.shape.Array("caption_entities", array)
// 	return o
// }
//
// // ParseMode sets a mode for parsing entities in the photo caption. See
// // formatting options for more details.
// func (o *SendPhotoOptions) ParseMode(parseMode object.ParseMode) *SendPhotoOptions {
// 	o.shape.String("parse_mode", parseMode.String())
// 	return o
// }
//
// // Photo sets a photo to send. Pass a file_id as String to send a photo that exists
// // on the Telegram servers (recommended), pass an HTTP URL as a String
// // for Telegram to get a photo from the Internet, or upload a new photo
// // using multipart/form-data. The photo must be at most 10 MB in size.
// // The photo's width and height must not exceed 10000 in total. Width and
// // height ratio must be at most 20.
// //
// // Method calls panic in case, empty file was passed.
// func (o *SendPhotoOptions) Photo(photo object.InputFile) *SendPhotoOptions {
// 	if url, ok := photo.URL(); ok {
// 		o.shape.String("photo", url)
// 	} else if blob, ok := photo.Blob(); ok {
// 		o.shape.File("photo", blob)
// 	} else {
// 		panic("empty photo was passed")
// 	}
//
// 	return o
// }
//
// type SendPhotoResult = object.Message
//
// // SendPhoto sends a new photo.
// func (b *Bot) SendPhoto(ctx context.Context, options SendPhotoOptions) (SendPhotoResult, error) {
// 	var data SendPhotoResult
// 	if err := b.request(ctx, "sendPhoto", options.shape, &data); err != nil {
// 		return SendPhotoResult{}, fmt.Errorf("send request: %w", err)
// 	}
//
// 	return data, nil
// }
