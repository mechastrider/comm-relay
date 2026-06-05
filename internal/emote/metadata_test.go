package emote

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestScope_GlobalAndChannel_ExpectTTLKind(t *testing.T) {
	t.Parallel()

	require.Equal(t, ScopeGlobal, GlobalScope().ttlKind())
	require.Equal(t, ScopeChannel, ChannelScope("twitch", "streamer").ttlKind())
	require.Equal(t, ScopeGlobal, ChannelScope("twitch", "").ttlKind())
}
