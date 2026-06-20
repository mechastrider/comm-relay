package innertube

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestFindLiveVideoID_WhenCurrentVideoEndpointPresent_ExpectID(t *testing.T) {
	t.Parallel()

	initialData := []byte(`{
		"currentVideoEndpoint": {
			"watchEndpoint": {"videoId": "dQw4w9WgXcQ"}
		}
	}`)

	id, ok := FindLiveVideoID(initialData)
	require.True(t, ok)
	require.Equal(t, "dQw4w9WgXcQ", id)
}

func TestIsLiveStreamOffline_WhenPlayabilityOffline_ExpectTrue(t *testing.T) {
	t.Parallel()

	initialData := []byte(`{
		"playabilityStatus": {"status": "LIVE_STREAM_OFFLINE"}
	}`)

	require.True(t, IsLiveStreamOffline(initialData))
}
