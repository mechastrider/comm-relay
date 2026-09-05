package avatarcache_test

import (
	"context"
	"net"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/avatarcache"
)

type stubResolver struct {
	ips []net.IPAddr
}

func (r stubResolver) LookupIPAddr(context.Context, string) ([]net.IPAddr, error) {
	return r.ips, nil
}

func TestPublicDialAddr_WhenHostnameResolvesToPrivateIP_ExpectRejected(t *testing.T) {
	t.Parallel()

	_, err := avatarcache.PublicDialAddr(context.Background(), stubResolver{
		ips: []net.IPAddr{{IP: net.ParseIP("127.0.0.1")}},
	}, "private.test:443")
	require.Error(t, err)
	require.Contains(t, err.Error(), "private address")
}

func TestPublicDialAddr_WhenHostnameResolvesToPublicIP_ExpectDialTarget(t *testing.T) {
	t.Parallel()

	addr, err := avatarcache.PublicDialAddr(context.Background(), stubResolver{
		ips: []net.IPAddr{{IP: net.ParseIP("93.184.216.34")}},
	}, "example.com:443")
	require.NoError(t, err)
	require.Equal(t, "93.184.216.34:443", addr)
}
