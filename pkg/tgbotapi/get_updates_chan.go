package tgbotapi

// type UpdatesChannelEvent struct {
// 	// List of received events.
// 	Updates []object.Update
// 	// Occurred error.
// 	Error error
// }
//
// // GetUpdatesChan returns channel which returns updates in real time.
// func (b *Bot) GetUpdatesChan(
// 	ctx context.Context,
// 	options GetUpdatesOptions,
// ) <-chan UpdatesChannelEvent {
// 	channel := make(chan UpdatesChannelEvent)
//
// 	go func() {
// 		// Don't forget to close the channel not to deadlock external code.
// 		defer close(channel)
//
// 		select {
// 		case <-ctx.Done():
// 		default:
// 			// Save last update_id, so we could use it in next request.
// 			offset := options.Offset
//
// 			for {
// 				// Get updates from API.
// 				updates, err := b.GetUpdates(ctx, GetUpdatesOptions{
// 					Offset:         offset,
// 					Limit:          options.Limit,
// 					Timeout:        options.Timeout,
// 					AllowedUpdates: options.AllowedUpdates,
// 				})
// 				if err != nil {
// 					// In case, error occurred, it probably could be dead context.
// 					if ctx.Err() != nil {
// 						break
// 					}
//
// 					// Otherwise, we just received API error and should wait for
// 					// another 3 seconds.
// 					channel <- UpdatesChannelEvent{Error: err}
// 					time.Sleep(time.Second * 3)
// 					continue
// 				}
//
// 				// Reassign last update ID not to include it in the next request.
// 				for _, u := range updates {
// 					if u.UpdateID >= offset {
// 						offset = u.UpdateID + 1
// 					}
// 				}
//
// 				// Send updates to channel.
// 				channel <- UpdatesChannelEvent{Updates: updates}
// 			}
// 		}
// 	}()
//
// 	return channel
// }
