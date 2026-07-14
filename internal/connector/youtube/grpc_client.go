package youtube

import (
	"context"
	"io"

	"github.com/muonsoft/errors"
	"golang.org/x/oauth2"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/credentials/oauth"

	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/mechastrider/comm-relay/internal/connector/youtube/grpcproto"
	"github.com/mechastrider/comm-relay/internal/netproxy"
)

const youtubeGRPCAddr = "youtube.googleapis.com:443"

type grpcClientFactory func(ctx context.Context, tokenSource oauth2.TokenSource, proxyCfg *config.SOCKS5Config) (grpcproto.V3DataLiveChatMessageServiceClient, io.Closer, error)

func defaultGRPCClientFactory(ctx context.Context, tokenSource oauth2.TokenSource, proxyCfg *config.SOCKS5Config) (grpcproto.V3DataLiveChatMessageServiceClient, io.Closer, error) {
	dialOpts, err := netproxy.GRPCDialOptions(proxyCfg)
	if err != nil {
		return nil, nil, errors.Errorf("youtube grpc dial options: %w", err)
	}

	opts := append(dialOpts,
		grpc.WithTransportCredentials(credentials.NewClientTLSFromCert(nil, "")),
		grpc.WithPerRPCCredentials(oauth.TokenSource{TokenSource: tokenSource}),
	)

	conn, err := grpc.NewClient(youtubeGRPCAddr, opts...)
	if err != nil {
		return nil, nil, errors.Errorf("dial youtube grpc: %w", err)
	}

	return grpcproto.NewV3DataLiveChatMessageServiceClient(conn), conn, nil
}
