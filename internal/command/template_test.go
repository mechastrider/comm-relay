package command

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestSubstituteTemplate_WhenCommand_ExpectNameAndZeroPoints(t *testing.T) {
	t.Parallel()

	text := SubstituteTemplate("Good game, {name}! +{points}", TemplateVars{
		Viewer: "Alice",
		Points: 0,
	})
	require.Equal(t, "Good game, Alice! +0", text)
}

func TestSubstituteTemplate_WhenViewerAlias_ExpectSameAsName(t *testing.T) {
	t.Parallel()

	vars := TemplateVars{Viewer: "Alice"}
	text := SubstituteTemplate("Hi {viewer} and {name}", vars)
	require.Equal(t, "Hi Alice and Alice", text)
}

func TestSubstituteTemplate_WhenStreamerEmpty_ExpectEmptyReplacement(t *testing.T) {
	t.Parallel()

	text := SubstituteTemplate("From {streamer}", TemplateVars{Streamer: ""})
	require.Equal(t, "From ", text)
}

func TestSubstituteTemplate_WhenStreamerSet_ExpectReplacement(t *testing.T) {
	t.Parallel()

	text := SubstituteTemplate("Hi from {streamer}", TemplateVars{Streamer: "Jake"})
	require.Equal(t, "Hi from Jake", text)
}

func TestSubstituteTemplate_WhenUnknownToken_ExpectUnchanged(t *testing.T) {
	t.Parallel()

	text := SubstituteTemplate("Hello {foo}", TemplateVars{Viewer: "Alice"})
	require.Equal(t, "Hello {foo}", text)
}

func TestSubstituteTemplate_WhenAwardQuote_ExpectMessageReplacement(t *testing.T) {
	t.Parallel()

	text := SubstituteTemplate("Quote: {message}", TemplateVars{
		Viewer:  "Bob",
		Points:  50,
		Message: "nice catch",
	})
	require.Equal(t, "Quote: nice catch", text)
}

func TestSubstituteTemplate_WhenCommandLine_ExpectMessageReplacement(t *testing.T) {
	t.Parallel()

	text := SubstituteTemplate("Ran {message}", TemplateVars{
		Viewer:  "Alice",
		Message: "  !GG  ",
	})
	require.Equal(t, "Ran   !GG  ", text)
}
