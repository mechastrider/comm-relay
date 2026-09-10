package packimport_test

import (
	"bytes"
	"encoding/binary"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/overlayassets"
	"github.com/mechastrider/comm-relay/internal/packimport"
	"github.com/mechastrider/comm-relay/internal/store"
)

func writeTestWAV(durationSec float64, sampleRate int) []byte {
	numSamples := int(float64(sampleRate) * durationSec)
	data := make([]byte, numSamples*2)

	var buf bytes.Buffer
	_ = binary.Write(&buf, binary.LittleEndian, []byte("RIFF"))
	_ = binary.Write(&buf, binary.LittleEndian, uint32(36+len(data)))
	buf.WriteString("WAVE")
	buf.WriteString("fmt ")
	_ = binary.Write(&buf, binary.LittleEndian, uint32(16))
	_ = binary.Write(&buf, binary.LittleEndian, uint16(1))
	_ = binary.Write(&buf, binary.LittleEndian, uint16(1))
	_ = binary.Write(&buf, binary.LittleEndian, uint32(sampleRate))
	_ = binary.Write(&buf, binary.LittleEndian, uint32(sampleRate*2))
	_ = binary.Write(&buf, binary.LittleEndian, uint16(2))
	_ = binary.Write(&buf, binary.LittleEndian, uint16(16))
	buf.WriteString("data")
	_ = binary.Write(&buf, binary.LittleEndian, uint32(len(data)))
	buf.Write(data)

	return buf.Bytes()
}

func tinyPNGBytes() []byte {
	return []byte{
		0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
		0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
		0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
		0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
		0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
		0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
		0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
		0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44,
		0xae, 0x42, 0x60, 0x82,
	}
}

func writeTestPackDir(t *testing.T, withAudio bool) string {
	t.Helper()

	dir := t.TempDir()
	require.NoError(t, os.MkdirAll(filepath.Join(dir, "images"), 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(dir, "images", "jake-gg.png"), tinyPNGBytes(), 0o644))

	audioLine := ""
	if withAudio {
		require.NoError(t, os.MkdirAll(filepath.Join(dir, "audio"), 0o755))
		require.NoError(t, os.WriteFile(filepath.Join(dir, "audio", "jake-gg.wav"), writeTestWAV(3, 44100), 0o644))
		audioLine = "    audio: audio/jake-gg.wav\n"
	}

	packYAML := `schema_version: 1
pack:
  slug: test-pack
  title: Test
  locale: ru-RU
defaults:
  enabled: true
  action: alert
  layout: fullscreen
  image_fit: contain
  sound_volume: 70
  image_size_pct: 100
commands:
  - trigger: gg
    splash: "Good game"
    sound: chime
` + audioLine + `    duration_ms: 5000
    cooldown_seconds: 30
    image: images/jake-gg.png
`
	require.NoError(t, os.WriteFile(filepath.Join(dir, "pack.yaml"), []byte(packYAML), 0o644))
	return dir
}

func TestApplyImportsPackAudio(t *testing.T) {
	packDir := writeTestPackDir(t, true)
	pack, err := packimport.LoadPackDir(packDir)
	require.NoError(t, err)
	require.NoError(t, packimport.ValidatePack(pack))

	root := t.TempDir()
	assetsDir := filepath.Join(root, "overlay-assets")
	dbPath := filepath.Join(root, "comm-relay.db")

	s, err := store.Open(dbPath, store.OpenOptions{TimeLocale: "ru-RU"})
	require.NoError(t, err)
	t.Cleanup(func() { _ = s.Close() })

	result, err := packimport.Apply(pack, s, assetsDir, packimport.ApplyOptions{})
	require.NoError(t, err)
	require.Equal(t, 1, result.Applied)

	commands, err := s.ListCommands()
	require.NoError(t, err)

	var imported *store.Command
	for i := range commands {
		if commands[i].Trigger == "gg" {
			imported = &commands[i]
			break
		}
	}
	require.NotNil(t, imported)
	require.NotEmpty(t, imported.SoundFile)
	require.True(t, overlayassets.FileExists(assetsDir, imported.SoundFile))
	require.NotEmpty(t, imported.ImageAsset)
}

func TestPlanApplySkipUnchangedWithImportedAudio(t *testing.T) {
	packDir := writeTestPackDir(t, true)
	pack, err := packimport.LoadPackDir(packDir)
	require.NoError(t, err)

	existing := []store.Command{
		{
			ID:              "gg",
			Trigger:         "gg",
			Action:          store.CommandActionAlert,
			Enabled:         true,
			CooldownSeconds: 30,
			SplashTemplate:  "Good game",
			Sound:           "chime",
			DurationMs:      5000,
			SoundVolume:     70,
			Layout:          "fullscreen",
			ImageFit:        "contain",
			ImageSizePct:    100,
			ImageAsset:      "asset_image.png",
			SoundFile:       "asset_sound.wav",
		},
	}

	planned := packimport.PlanApply(pack, existing, packimport.ApplyOptions{})
	require.Len(t, planned, 1)
	require.Equal(t, packimport.ActionSkip, planned[0].Kind)
}
