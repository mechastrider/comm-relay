package packimport_test

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/packimport"
)

func TestValidatePackRejectsAudioAndSoundFileTogether(t *testing.T) {
	dir := t.TempDir()
	require.NoError(t, os.MkdirAll(filepath.Join(dir, "images"), 0o755))
	require.NoError(t, os.MkdirAll(filepath.Join(dir, "audio"), 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(dir, "images", "a.png"), tinyPNGBytes(), 0o644))
	require.NoError(t, os.WriteFile(filepath.Join(dir, "audio", "a.wav"), writeTestWAV(3, 44100), 0o644))

	packYAML := `schema_version: 1
pack:
  slug: test
  title: Test
  locale: ru-RU
commands:
  - trigger: gg
    splash: "Hi"
    image: images/a.png
    audio: audio/a.wav
    sound_file: asset_old.wav
`
	require.NoError(t, os.WriteFile(filepath.Join(dir, "pack.yaml"), []byte(packYAML), 0o644))

	pack, err := packimport.LoadPackDir(dir)
	require.NoError(t, err)

	err = packimport.ValidatePack(pack)
	require.Error(t, err)
	require.Contains(t, err.Error(), "audio and sound_file cannot both be set")
}
