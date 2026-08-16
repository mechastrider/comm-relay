package browser

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestOpenURL_WhenCustomOpener_ExpectURLPassed(t *testing.T) {
	t.Parallel()

	original := OpenURL
	t.Cleanup(func() {
		OpenURL = original
	})

	var opened string
	OpenURL = func(url string) error {
		opened = url
		return nil
	}

	require.NoError(t, OpenURL("https://example.com/oauth"))
	require.Equal(t, "https://example.com/oauth", opened)
}
