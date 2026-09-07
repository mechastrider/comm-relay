package api

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestWireFrameType_WhenKnownPayload_ExpectType(t *testing.T) {
	t.Parallel()

	require.Equal(t, "alert", wireFrameType([]byte(`{"type":"alert","name":"Nova"}`)))
	require.Equal(t, "message", wireFrameType([]byte(`{"type":"message","user":"a"}`)))
}

func TestWireFrameType_WhenInvalidOrMissing_ExpectOther(t *testing.T) {
	t.Parallel()

	require.Equal(t, "other", wireFrameType([]byte(`not json`)))
	require.Equal(t, "other", wireFrameType([]byte(`{"name":"Nova"}`)))
}
