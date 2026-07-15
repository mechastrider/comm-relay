package netproxy

import (
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/config"
)

func TestShouldBypassProxy_Localhost_ExpectTrue(t *testing.T) {
	require.True(t, shouldBypassProxy("127.0.0.1:17877"))
	require.True(t, shouldBypassProxy("localhost:8080"))
	require.True(t, shouldBypassProxy("[::1]:443"))
}

func TestShouldBypassProxy_RemoteHost_ExpectFalse(t *testing.T) {
	require.False(t, shouldBypassProxy("youtube.googleapis.com:443"))
	require.False(t, shouldBypassProxy("live.vkvideo.ru:443"))
}

func TestDialContext_WhenNilConfig_ExpectDirectDialer(t *testing.T) {
	dialContext, err := DialContext(nil)
	require.NoError(t, err)
	require.NotNil(t, dialContext)
}

func TestHTTPTransport_WhenNilConfig_ExpectTransport(t *testing.T) {
	transport, err := HTTPTransport(nil)
	require.NoError(t, err)
	require.NotNil(t, transport)
}

func TestDialContext_WhenEmptyAddress_ExpectError(t *testing.T) {
	_, err := DialContext(&config.SOCKS5Config{})
	require.Error(t, err)
}

func TestWebSocketDialer_WhenNilConfig_ExpectDialer(t *testing.T) {
	dialer, err := WebSocketDialer(nil, 0)
	require.NoError(t, err)
	require.NotNil(t, dialer)
}

func TestGRPCDialOptions_WhenNilConfig_ExpectOptions(t *testing.T) {
	opts, err := GRPCDialOptions(nil)
	require.NoError(t, err)
	require.Len(t, opts, 1)
}
