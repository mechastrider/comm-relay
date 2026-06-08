package youtube

import (
	"google.golang.org/api/youtube/v3"

	"github.com/mechastrider/comm-relay/internal/connector/youtube/grpcproto"
)

func protoMessagesToAPI(items []*grpcproto.LiveChatMessage) []*youtube.LiveChatMessage {
	if len(items) == 0 {
		return nil
	}

	out := make([]*youtube.LiveChatMessage, 0, len(items))
	for _, item := range items {
		if item == nil {
			continue
		}
		out = append(out, protoMessageToAPI(item))
	}
	return out
}

func protoMessageToAPI(item *grpcproto.LiveChatMessage) *youtube.LiveChatMessage {
	msg := &youtube.LiveChatMessage{
		Id: item.GetId(),
	}
	if item.Snippet != nil {
		msg.Snippet = &youtube.LiveChatMessageSnippet{
			LiveChatId:      item.Snippet.GetLiveChatId(),
			AuthorChannelId: item.Snippet.GetAuthorChannelId(),
			PublishedAt:     item.Snippet.GetPublishedAt(),
			DisplayMessage:  item.Snippet.GetDisplayMessage(),
			Type:            protoMessageType(item.Snippet.GetType()),
		}
		if details := item.Snippet.GetTextMessageDetails(); details != nil && details.GetMessageText() != "" {
			msg.Snippet.TextMessageDetails = &youtube.LiveChatTextMessageDetails{
				MessageText: details.GetMessageText(),
			}
		}
	}
	if item.AuthorDetails != nil {
		msg.AuthorDetails = &youtube.LiveChatMessageAuthorDetails{
			ChannelId:       item.AuthorDetails.GetChannelId(),
			ChannelUrl:      item.AuthorDetails.GetChannelUrl(),
			DisplayName:     item.AuthorDetails.GetDisplayName(),
			ProfileImageUrl: item.AuthorDetails.GetProfileImageUrl(),
			IsVerified:      item.AuthorDetails.GetIsVerified(),
			IsChatOwner:     item.AuthorDetails.GetIsChatOwner(),
			IsChatSponsor:   item.AuthorDetails.GetIsChatSponsor(),
			IsChatModerator: item.AuthorDetails.GetIsChatModerator(),
		}
	}
	return msg
}

func protoMessageType(t grpcproto.LiveChatMessageSnippet_TypeWrapper_Type) string {
	switch t {
	case grpcproto.LiveChatMessageSnippet_TypeWrapper_TEXT_MESSAGE_EVENT:
		return "textMessageEvent"
	case grpcproto.LiveChatMessageSnippet_TypeWrapper_TOMBSTONE:
		return "tombstone"
	case grpcproto.LiveChatMessageSnippet_TypeWrapper_FAN_FUNDING_EVENT:
		return "fanFundingEvent"
	case grpcproto.LiveChatMessageSnippet_TypeWrapper_CHAT_ENDED_EVENT:
		return "chatEndedEvent"
	case grpcproto.LiveChatMessageSnippet_TypeWrapper_NEW_SPONSOR_EVENT:
		return "newSponsorEvent"
	case grpcproto.LiveChatMessageSnippet_TypeWrapper_SUPER_CHAT_EVENT:
		return "superChatEvent"
	case grpcproto.LiveChatMessageSnippet_TypeWrapper_SUPER_STICKER_EVENT:
		return "superStickerEvent"
	case grpcproto.LiveChatMessageSnippet_TypeWrapper_POLL_EVENT:
		return "pollEvent"
	default:
		return ""
	}
}
