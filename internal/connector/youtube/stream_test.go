package youtube

import (
	"context"
	"io"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"

	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/mechastrider/comm-relay/internal/connector/youtube/grpcproto"
)

type fakeGRPCClient struct {
	responses []*grpcproto.LiveChatMessageListResponse
	err       error
}

func (f *fakeGRPCClient) StreamList(ctx context.Context, in *grpcproto.LiveChatMessageListRequest, opts ...grpc.CallOption) (grpc.ServerStreamingClient[grpcproto.LiveChatMessageListResponse], error) {
	if f.err != nil {
		return nil, f.err
	}
	return &fakeStream{responses: f.responses}, nil
}

type fakeStream struct {
	grpc.ServerStreamingClient[grpcproto.LiveChatMessageListResponse]
	responses []*grpcproto.LiveChatMessageListResponse
	index     int
}

func (s *fakeStream) Recv() (*grpcproto.LiveChatMessageListResponse, error) {
	if s.index >= len(s.responses) {
		return nil, io.EOF
	}
	resp := s.responses[s.index]
	s.index++
	return resp, nil
}

func (s *fakeStream) Header() (metadata.MD, error) { return nil, nil }
func (s *fakeStream) Trailer() metadata.MD         { return nil }
func (s *fakeStream) CloseSend() error             { return nil }
func (s *fakeStream) Context() context.Context     { return context.Background() }
func (s *fakeStream) SendMsg(any) error            { return nil }
func (s *fakeStream) RecvMsg(any) error            { return nil }

func TestRunStream_WhenMessagesArrive_ExpectPublish(t *testing.T) {
	eventBus := bus.New(8)
	events, unsub := eventBus.Subscribe()
	defer unsub()

	store := testStore(t, testEnabledYouTubeConfig())
	connector := New(eventBus, store, nil, nil, nil, nil)

	text := "stream hello"
	grpcClient := &fakeGRPCClient{
		responses: []*grpcproto.LiveChatMessageListResponse{
			{
				Items: []*grpcproto.LiveChatMessage{
					{
						Id: protoString("yt-stream-1"),
						Snippet: &grpcproto.LiveChatMessageSnippet{
							Type:           grpcproto.LiveChatMessageSnippet_TypeWrapper_TEXT_MESSAGE_EVENT.Enum(),
							DisplayMessage: protoString(text),
							PublishedAt:    protoString(time.Date(2026, 6, 7, 19, 0, 0, 0, time.UTC).Format(time.RFC3339)),
							DisplayedContent: &grpcproto.LiveChatMessageSnippet_TextMessageDetails{
								TextMessageDetails: &grpcproto.LiveChatTextMessageDetails{
									MessageText: protoString(text),
								},
							},
						},
						AuthorDetails: &grpcproto.LiveChatMessageAuthorDetails{
							ChannelId:   protoString("UC123"),
							DisplayName: protoString("Viewer"),
						},
					},
				},
				NextPageToken: protoString("token-1"),
			},
		},
	}

	ctx, cancel := context.WithCancel(context.Background())
	go func() {
		time.Sleep(20 * time.Millisecond)
		cancel()
	}()

	require.NoError(t, connector.runStream(ctx, grpcClient, liveSessionInfo{LiveChatID: "chat-id"}))
	require.Equal(t, []string{"yt-stream-1"}, collectMessageIDs(events))
}

func protoString(v string) *string {
	return &v
}

func TestConfigApplyDefaults_WhenChatModeMissing_ExpectStream(t *testing.T) {
	cfg := config.Default()
	cfg.YouTube.ChatMode = ""
	cfg.ApplyDefaults()
	require.Equal(t, config.YouTubeChatModeStream, cfg.YouTube.ChatMode)
}
