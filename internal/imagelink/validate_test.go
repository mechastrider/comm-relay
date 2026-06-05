package imagelink

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestValidateURL_WhenAllowedHTTPSImage_ExpectTrue(t *testing.T) {
	t.Parallel()

	allowed := []string{"i.imgur.com"}
	require.True(t, ValidateURL("https://i.imgur.com/abc.png", allowed))
	require.True(t, ValidateURL("https://i.imgur.com/abc.PNG?size=large", allowed))
}

func TestValidateURL_WhenHTTPScheme_ExpectFalse(t *testing.T) {
	t.Parallel()

	allowed := []string{"example.com"}
	require.False(t, ValidateURL("http://example.com/a.png", allowed))
}

func TestValidateURL_WhenHostNotAllowlisted_ExpectFalse(t *testing.T) {
	t.Parallel()

	allowed := []string{"i.imgur.com"}
	require.False(t, ValidateURL("https://evil.example/a.png", allowed))
}

func TestValidateURL_WhenSubdomainOfAllowlisted_ExpectTrue(t *testing.T) {
	t.Parallel()

	allowed := []string{"discordapp.com"}
	require.True(t, ValidateURL("https://cdn.discordapp.com/attachments/1/2/image.png", allowed))
}

func TestValidateURL_WhenLocalhost_ExpectFalse(t *testing.T) {
	t.Parallel()

	allowed := []string{"localhost"}
	require.False(t, ValidateURL("https://localhost/secret.png", allowed))
}

func TestValidateURL_WhenPrivateIP_ExpectFalse(t *testing.T) {
	t.Parallel()

	allowed := []string{"10.0.0.1"}
	require.False(t, ValidateURL("https://10.0.0.1/a.png", allowed))
	require.False(t, ValidateURL("https://192.168.1.1/a.png", allowed))
	require.False(t, ValidateURL("https://127.0.0.1/a.png", allowed))
}

func TestValidateURL_WhenDotLocalHost_ExpectFalse(t *testing.T) {
	t.Parallel()

	allowed := []string{"printer.local"}
	require.False(t, ValidateURL("https://printer.local/a.png", allowed))
}

func TestValidateURL_WhenCredentialsInURL_ExpectFalse(t *testing.T) {
	t.Parallel()

	allowed := []string{"i.imgur.com"}
	require.False(t, ValidateURL("https://user:pass@i.imgur.com/a.png", allowed))
}

func TestValidateURL_WhenNonStandardPort_ExpectFalse(t *testing.T) {
	t.Parallel()

	allowed := []string{"i.imgur.com"}
	require.False(t, ValidateURL("https://i.imgur.com:8080/a.png", allowed))
}

func TestValidateURL_WhenNonImageExtension_ExpectFalse(t *testing.T) {
	t.Parallel()

	allowed := []string{"i.imgur.com"}
	require.False(t, ValidateURL("https://i.imgur.com/page.html", allowed))
}

func TestValidateURL_WhenSupportedExtensions_ExpectTrue(t *testing.T) {
	t.Parallel()

	allowed := []string{"cdn.example.com"}
	for _, path := range []string{
		"/a.png",
		"/a.jpg",
		"/a.jpeg",
		"/a.gif",
		"/a.webp",
		"/a.avif",
	} {
		require.True(t, ValidateURL("https://cdn.example.com"+path, allowed), path)
	}
}
