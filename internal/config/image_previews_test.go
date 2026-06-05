package config

import (
	"testing"

	"github.com/muonsoft/errors"
	"github.com/stretchr/testify/require"
)

func TestImagePreviewsConfig_validate_WhenEnabledWithDefaults_ExpectNoError(t *testing.T) {
	t.Parallel()

	cfg := Default()
	cfg.Overlay.ImagePreviews.Enabled = true

	require.NoError(t, cfg.Validate())
}

func TestImagePreviewsConfig_validate_WhenMaxWidthTooSmall_ExpectInvalidConfig(t *testing.T) {
	t.Parallel()

	cfg := Default()
	cfg.Overlay.ImagePreviews.Enabled = true
	cfg.Overlay.ImagePreviews.MaxWidthPx = 8

	err := cfg.Validate()
	require.Error(t, err)
	require.True(t, errors.Is(err, ErrInvalidConfig))
}

func TestImagePreviewsConfig_NormalizedAllowedHosts_WhenEmpty_ExpectDefaults(t *testing.T) {
	t.Parallel()

	cfg := ImagePreviewsConfig{AllowedHosts: nil}
	require.Equal(t, DefaultImagePreviewHosts, cfg.NormalizedAllowedHosts())
}
