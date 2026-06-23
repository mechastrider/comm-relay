package channel

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestParseRef_WhenHandle_ExpectNormalized(t *testing.T) {
	t.Parallel()

	ref, err := ParseRef("@ExampleChannel")
	require.NoError(t, err)
	require.Equal(t, "ExampleChannel", ref.Handle)
	require.Equal(t, "https://www.youtube.com/@ExampleChannel/live", ref.LivePageURL())
}

func TestParseRef_WhenChannelURL_ExpectHandle(t *testing.T) {
	t.Parallel()

	ref, err := ParseRef("https://www.youtube.com/@examplechannel/live")
	require.NoError(t, err)
	require.Equal(t, "examplechannel", ref.Handle)
}

func TestParseRef_WhenChannelID_ExpectIDURL(t *testing.T) {
	t.Parallel()

	const id = "UCuAXFkgsw1L7xaCfnd5JJOw"
	ref, err := ParseRef(id)
	require.NoError(t, err)
	require.Equal(t, id, ref.ChannelID)
	require.Equal(t, "https://www.youtube.com/channel/"+id+"/live", ref.LivePageURL())
}

func TestParseRef_WhenEmpty_ExpectError(t *testing.T) {
	t.Parallel()

	_, err := ParseRef("  ")
	require.Error(t, err)
}
