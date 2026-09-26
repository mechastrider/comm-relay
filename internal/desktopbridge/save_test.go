package desktopbridge_test

import (
	"context"
	"encoding/base64"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/desktopbridge"
)

func TestWritePNGWithSaveDialogRejectsInvalidPayload(t *testing.T) {
	t.Parallel()

	_, err := desktopbridge.WritePNGWithSaveDialog(context.TODO(), "Save", "recap.png", "")
	require.Error(t, err)

	_, err = desktopbridge.WritePNGWithSaveDialog(t.Context(), "Save", "recap.png", base64.StdEncoding.EncodeToString([]byte("not-png")))
	require.Error(t, err)
}
