package youtube

import (
	"context"
	"io"
	"log/slog"
	"time"

	"github.com/muonsoft/clog"
	"github.com/muonsoft/errors"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/mechastrider/comm-relay/internal/connector/retry"
	"github.com/mechastrider/comm-relay/internal/connector/youtube/grpcproto"
)

const (
	streamReconnectDelay  = 500 * time.Millisecond
	maxStreamOpenFailures = 3
	maxStreamRecvFailures = 3
)

var errStreamUnavailable = errors.New("youtube grpc stream unavailable")

func (c *Connector) runStream(ctx context.Context, grpcClient grpcproto.V3DataLiveChatMessageServiceClient, session liveSessionInfo) error {
	pageToken := ""
	openFailures := 0
	recvFailures := 0

	for {
		if ctx.Err() != nil {
			return nil
		}

		stream, err := openStream(ctx, grpcClient, session.LiveChatID, pageToken)
		if err != nil {
			openFailures++
			if openFailures >= maxStreamOpenFailures {
				return errors.Errorf("%w: %w", errStreamUnavailable, err)
			}
			if waitErr := retry.Wait(ctx, streamReconnectDelay); waitErr != nil {
				return nil
			}
			continue
		}
		openFailures = 0
		recvFailures = 0

		for {
			if ctx.Err() != nil {
				return nil
			}

			resp, err := stream.Recv()
			if errors.Is(err, io.EOF) {
				break
			}
			if err != nil {
				recvFailures++
				clog.Debug(ctx, "youtube stream recv failed",
					slog.Int("failures", recvFailures),
					slog.Any("error", err),
				)
				if recvFailures >= maxStreamRecvFailures {
					return errors.Errorf("%w: %w", errStreamUnavailable, err)
				}
				break
			}
			recvFailures = 0

			if token := resp.GetNextPageToken(); token != "" {
				pageToken = token
			}
			if resp.GetOfflineAt() != "" {
				return errNoLiveChat
			}

			c.publishLiveChatItems(ctx, protoMessagesToAPI(resp.GetItems()))
		}
	}
}

func openStream(
	ctx context.Context,
	grpcClient grpcproto.V3DataLiveChatMessageServiceClient,
	liveChatID, pageToken string,
) (grpcproto.V3DataLiveChatMessageService_StreamListClient, error) {
	req := &grpcproto.LiveChatMessageListRequest{
		LiveChatId: &liveChatID,
		Part:       []string{"id", "snippet", "authorDetails"},
	}
	if pageToken != "" {
		req.PageToken = &pageToken
	}

	stream, err := grpcClient.StreamList(ctx, req)
	if err != nil {
		return nil, errors.Errorf("open youtube stream: %w", mapStreamError(err))
	}
	return stream, nil
}

func mapStreamError(err error) error {
	if err == nil {
		return nil
	}
	st, ok := status.FromError(err)
	if !ok {
		return err
	}
	switch st.Code() {
	case codes.NotFound, codes.PermissionDenied, codes.FailedPrecondition:
		return err
	case codes.ResourceExhausted:
		return err
	default:
		return err
	}
}

func isStreamUnavailable(err error) bool {
	return errors.Is(err, errStreamUnavailable)
}
