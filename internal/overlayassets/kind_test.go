package overlayassets

import (
	"testing"

	"github.com/muonsoft/errors"
	"github.com/stretchr/testify/require"
)

func TestParseKind_WhenEmptyOrPanel_ExpectPanel(t *testing.T) {
	t.Parallel()

	for _, raw := range []string{"", " ", "\t", "panel", "PANEL"} {
		kind, err := ParseKind(raw)
		require.NoError(t, err)
		require.Equal(t, KindPanel, kind)
	}
}

func TestParseKind_WhenAlertKinds_ExpectMatch(t *testing.T) {
	t.Parallel()

	kind, err := ParseKind("alert_image")
	require.NoError(t, err)
	require.Equal(t, KindAlertImage, kind)

	kind, err = ParseKind("ALERT_SOUND")
	require.NoError(t, err)
	require.Equal(t, KindAlertSound, kind)
}

func TestParseKind_WhenViewerAvatar_ExpectMatch(t *testing.T) {
	t.Parallel()

	kind, err := ParseKind("viewer_avatar")
	require.NoError(t, err)
	require.Equal(t, KindViewerAvatar, kind)
}

func TestParseKind_WhenUnknown_ExpectInvalidKind(t *testing.T) {
	t.Parallel()

	for _, raw := range []string{"[object Object]", "alert-image", "banner", "unknown"} {
		kind, err := ParseKind(raw)
		require.Error(t, err)
		require.True(t, errors.Is(err, ErrInvalidKind))
		require.Equal(t, AssetKind(""), kind)
	}
}
