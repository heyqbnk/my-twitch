package tgbotapi

// Reference: https://core.telegram.org/bots/api#getupdates

// type GetUpdatesOptions struct {
// 	// *Optional*. Identifier of the first update to be returned. Must be greater
// 	// by one than the highest among the identifiers of previously received
// 	// updates. By default, updates starting with the earliest unconfirmed update
// 	// are returned. An update is considered confirmed as soon as getUpdates
// 	// is called with an offset higher than its update_id. The negative offset
// 	// can be specified to retrieve updates starting from -offset update from
// 	// the end of the updates queue. All previous updates will be forgotten.
// 	Offset int `json:"offset,omitempty"`
//
// 	// *Optional*. Limits the number of updates to be retrieved. Values between
// 	// 1-100 are accepted. Defaults to 100.
// 	Limit int `json:"limit,omitempty"`
//
// 	// *Optional*. Timeout in seconds for long polling. Defaults to 0, i.e.
// 	// usual short polling. Should be positive, short polling should be used for
// 	// testing purposes only.
// 	Timeout int `json:"timeout,omitempty"`
//
// 	// *Optional*. A JSON-serialized list of the update types you want your bot
// 	// to receive. For example, specify ["message", "edited_channel_post",
// 	// "callback_query"] to only receive updates of these types. See Update for
// 	// a complete list of available update types. Specify an empty list to
// 	// receive all update types except chat_member (default). If not specified,
// 	// the previous setting will be used.
// 	//
// 	// Please note that this parameter doesn't affect updates created before
// 	// the call to the getUpdates, so unwanted updates may be received for a
// 	// short period of time.
// 	AllowedUpdates []string `json:"allowed_updates,omitempty"`
// }
//
// // GetUpdates returns last updates.
// func (b *Bot) GetUpdates(
// 	ctx context.Context,
// 	options GetUpdatesOptions,
// ) ([]object.Update, error) {
// 	var data []object.Update
// 	if err := b.request(ctx, "getUpdates", options, &data); err != nil {
// 		return nil, err
// 	}
// 	return data, nil
// }
