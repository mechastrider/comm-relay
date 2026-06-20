package videoid

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestParseInput_WhenBareID_ExpectID(t *testing.T) {
	t.Parallel()

	id, err := ParseInput("dQw4w9WgXcQ")
	require.NoError(t, err)
	require.Equal(t, "dQw4w9WgXcQ", id)
}

func TestParseInput_WhenWatchURL_ExpectID(t *testing.T) {
	t.Parallel()

	id, err := ParseInput("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
	require.NoError(t, err)
	require.Equal(t, "dQw4w9WgXcQ", id)
}

func TestParseInput_WhenShortURL_ExpectID(t *testing.T) {
	t.Parallel()

	id, err := ParseInput("https://youtu.be/dQw4w9WgXcQ")
	require.NoError(t, err)
	require.Equal(t, "dQw4w9WgXcQ", id)
}

func TestParseInput_WhenLiveURL_ExpectID(t *testing.T) {
	t.Parallel()

	id, err := ParseInput("https://youtube.com/live/dQw4w9WgXcQ")
	require.NoError(t, err)
	require.Equal(t, "dQw4w9WgXcQ", id)
}

func TestParseInput_WhenUnsupportedURL_ExpectError(t *testing.T) {
	t.Parallel()

	_, err := ParseInput("https://example.com/not-youtube")
	require.Error(t, err)
}
