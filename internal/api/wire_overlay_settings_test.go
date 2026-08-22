package api

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/config"
)

func TestOverlaySettingsWirePayload_WhenValid_ExpectJSON(t *testing.T) {
	t.Parallel()

	overlay := config.Default().Overlay
	payload, err := overlaySettingsWirePayload(overlay)
	require.NoError(t, err)

	var decoded map[string]any
	require.NoError(t, json.Unmarshal(payload, &decoded))
	require.Equal(t, wireOverlaySettingsType, decoded["type"])
	require.NotNil(t, decoded["overlay"])
}
