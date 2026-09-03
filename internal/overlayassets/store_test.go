package overlayassets

import (
	"bytes"
	"encoding/base64"
	"encoding/binary"
	"testing"

	"github.com/stretchr/testify/require"
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
	data, err := base64.StdEncoding.DecodeString("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==")
	if err != nil {
		panic(err)
	}
	return data
}

func TestAlertSound_WhenThreeSecondWAV_ExpectAccepted(t *testing.T) {
	t.Parallel()

	data := writeTestWAV(3, 44100)
	require.NoError(t, ValidateAlertSoundDuration(data))
}

func TestAlertSound_WhenTwentySecondWAV_ExpectRejected(t *testing.T) {
	t.Parallel()

	data := writeTestWAV(20, 44100)
	require.ErrorIs(t, ValidateAlertSoundDuration(data), ErrAudioDuration)
}

func TestAlertImage_WhenGIF_ExpectRejected(t *testing.T) {
	t.Parallel()

	gif := []byte("GIF89a" + string(bytes.Repeat([]byte{0x00}, 32)))
	require.ErrorIs(t, ValidateAlertImage(gif), ErrAnimatedImage)
}

func TestSave_WhenAlertImagePNG_ExpectStoredFilename(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	png := tinyPNGBytes()

	name, err := Save(dir, KindAlertImage, png)
	require.NoError(t, err)
	require.True(t, FileExists(dir, name))
}

func TestSave_WhenAlertSoundWAV_ExpectStoredFilename(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	data := writeTestWAV(3, 44100)

	name, err := Save(dir, KindAlertSound, data)
	require.NoError(t, err)
	require.True(t, stringsHasSuffix(name, ".wav"))
}

func stringsHasSuffix(value, suffix string) bool {
	return len(value) >= len(suffix) && value[len(value)-len(suffix):] == suffix
}
