package api

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/store"
)

func uploadOverlayAsset(t *testing.T, handler http.Handler, kind string, filename string, data []byte) string {
	t.Helper()

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	require.NoError(t, writer.WriteField("kind", kind))
	part, err := writer.CreateFormFile("file", filename)
	require.NoError(t, err)
	_, err = part.Write(data)
	require.NoError(t, err)
	require.NoError(t, writer.Close())

	req := httptest.NewRequest(http.MethodPost, "/api/overlay/assets/upload", &body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())

	var payload map[string]any
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &payload))
	name, ok := payload["filename"].(string)
	require.True(t, ok)
	return name
}

func TestOverlayAssets_WhenPanelPNG_ExpectFilename(t *testing.T) {
	t.Parallel()

	handler := testHandler(t)
	name := uploadOverlayAsset(t, handler, "panel", "icon.png", tinyPNG())
	require.True(t, strings.HasSuffix(name, ".png"))
}

func TestOverlayAssets_WhenAlertImagePNG_ExpectFilename(t *testing.T) {
	t.Parallel()

	handler := testHandler(t)
	name := uploadOverlayAsset(t, handler, "alert_image", "alert.png", tinyPNG())
	require.True(t, strings.HasSuffix(name, ".png"))
}

func TestOverlayAssets_WhenAlertImageGIF_ExpectBadRequest(t *testing.T) {
	t.Parallel()

	handler := testHandler(t)
	gif := []byte("GIF89a" + string(bytes.Repeat([]byte{0x00}, 32)))

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	require.NoError(t, writer.WriteField("kind", "alert_image"))
	part, err := writer.CreateFormFile("file", "alert.gif")
	require.NoError(t, err)
	_, err = part.Write(gif)
	require.NoError(t, err)
	require.NoError(t, writer.Close())

	req := httptest.NewRequest(http.MethodPost, "/api/overlay/assets/upload", &body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	require.Equal(t, http.StatusBadRequest, rec.Code)
}

func TestOverlayAssets_WhenAlertImageSVG_ExpectBadRequest(t *testing.T) {
	t.Parallel()

	handler := testHandler(t)
	svg := []byte(`<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>`)

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	require.NoError(t, writer.WriteField("kind", "alert_image"))
	part, err := writer.CreateFormFile("file", "alert.svg")
	require.NoError(t, err)
	_, err = part.Write(svg)
	require.NoError(t, err)
	require.NoError(t, writer.Close())

	req := httptest.NewRequest(http.MethodPost, "/api/overlay/assets/upload", &body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	require.Equal(t, http.StatusBadRequest, rec.Code)
}

func TestOverlayAssets_WhenAlertSoundWAV_ExpectServed(t *testing.T) {
	t.Parallel()

	handler := testHandler(t)
	wav := writeTestWAV(3, 44100)
	name := uploadOverlayAsset(t, handler, "alert_sound", "alert.wav", wav)

	getRec := httptest.NewRecorder()
	handler.ServeHTTP(getRec, httptest.NewRequest(http.MethodGet, "/overlay/assets/"+name, nil))
	require.Equal(t, http.StatusOK, getRec.Code)
}

func TestOverlayAssets_WhenAlertSoundTooLong_ExpectBadRequest(t *testing.T) {
	t.Parallel()

	handler := testHandler(t)
	wav := writeTestWAV(20, 44100)

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	require.NoError(t, writer.WriteField("kind", "alert_sound"))
	part, err := writer.CreateFormFile("file", "long.wav")
	require.NoError(t, err)
	_, err = part.Write(wav)
	require.NoError(t, err)
	require.NoError(t, writer.Close())

	req := httptest.NewRequest(http.MethodPost, "/api/overlay/assets/upload", &body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	require.Equal(t, http.StatusBadRequest, rec.Code)
}

func TestOverlayAssets_WhenFileTooLarge_ExpectBadRequest(t *testing.T) {
	t.Parallel()

	handler := testHandler(t)
	data := bytes.Repeat([]byte{0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a}, 512*1024/8+2)

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	part, err := writer.CreateFormFile("file", "huge.png")
	require.NoError(t, err)
	_, err = part.Write(data)
	require.NoError(t, err)
	require.NoError(t, writer.Close())

	req := httptest.NewRequest(http.MethodPost, "/api/overlay/assets/upload", &body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	require.Equal(t, http.StatusBadRequest, rec.Code)
}

func tinyPNG() []byte {
	data, err := base64.StdEncoding.DecodeString("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==")
	if err != nil {
		panic(err)
	}
	return data
}

func TestOverlayAssets_WhenDeleteUnused_ExpectDeleted(t *testing.T) {
	t.Parallel()

	env := newTestEnv(t, bus.New(0))
	name := uploadOverlayAsset(t, env.Handler, "alert_image", "unused.png", tinyPNG())

	body := strings.NewReader(`{"filename":"` + name + `"}`)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/overlay/assets/delete", body)
	req.Header.Set("Content-Type", "application/json")
	env.Handler.ServeHTTP(rec, req)
	require.Equal(t, http.StatusOK, rec.Code)
}

func TestOverlayAssets_WhenDeleteInUseByCommand_ExpectBadRequest(t *testing.T) {
	t.Parallel()

	env := newTestEnv(t, bus.New(0))
	name := uploadOverlayAsset(t, env.Handler, "alert_image", "gg.png", tinyPNG())

	updateBody := `{"id":"gg","trigger":"gg","enabled":true,"cooldown_seconds":30,"splash_template":"GG {name}","sound":"","duration_ms":5000,"image_asset":"` + name + `"}`
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/commands/update", strings.NewReader(updateBody))
	req.Header.Set("Content-Type", "application/json")
	env.Handler.ServeHTTP(rec, req)
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())

	deleteRec := httptest.NewRecorder()
	deleteReq := httptest.NewRequest(http.MethodPost, "/api/overlay/assets/delete", strings.NewReader(`{"filename":"`+name+`"}`))
	deleteReq.Header.Set("Content-Type", "application/json")
	env.Handler.ServeHTTP(deleteRec, deleteReq)
	require.Equal(t, http.StatusBadRequest, deleteRec.Code)
}

func TestCommands_WhenUpdateWithUnsafeImageAsset_ExpectFieldError(t *testing.T) {
	t.Parallel()

	handler := testHandler(t)
	body := `{"id":"gg","trigger":"gg","enabled":true,"cooldown_seconds":30,"splash_template":"GG {name}","sound":"","duration_ms":5000,"image_asset":"C:\\photos\\gg.png"}`
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/commands/update", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	handler.ServeHTTP(rec, req)
	require.Equal(t, http.StatusBadRequest, rec.Code)
	require.Contains(t, rec.Body.String(), "image_asset")
}

func TestCommands_WhenMigrationApplied_ExpectDefaultVolumeAndLayout(t *testing.T) {
	t.Parallel()

	env := newTestEnv(t, bus.New(0))
	rec := httptest.NewRecorder()
	env.Handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/commands", nil))
	require.Equal(t, http.StatusOK, rec.Code)

	var payload struct {
		Commands []struct {
			ID          string `json:"id"`
			SoundVolume int    `json:"sound_volume"`
			Layout      string `json:"layout"`
		} `json:"commands"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &payload))
	require.NotEmpty(t, payload.Commands)
	for _, cmd := range payload.Commands {
		require.Equal(t, 70, cmd.SoundVolume)
		require.Equal(t, "card", cmd.Layout)
	}
}

func TestAlertWire_WhenCustomMediaSet_ExpectFilenameAndNoBuiltInSound(t *testing.T) {
	t.Parallel()

	cmd := &store.Command{
		Trigger:     "gg",
		Sound:       "chime",
		DurationMs:  5000,
		ImageAsset:  "asset_deadbeef.png",
		SoundFile:   "asset_cafe.wav",
		SoundVolume: 55,
		Layout:      "banner",
	}
	payload, err := alertWirePayload(cmd, bus.ChatMessage{
		Username:    "Nova",
		DisplayName: "Nova",
	}, "Good game!", 0)
	require.NoError(t, err)

	var wire map[string]any
	require.NoError(t, json.Unmarshal(payload, &wire))
	require.Equal(t, "asset_deadbeef.png", wire["image_asset"])
	require.Equal(t, "asset_cafe.wav", wire["sound_file"])
	require.Equal(t, "banner", wire["layout"])
	require.Equal(t, float64(55), wire["sound_volume"])
	_, hasBuiltIn := wire["sound"]
	require.False(t, hasBuiltIn)
}

func writeTestWAV(durationSec float64, sampleRate int) []byte {
	numSamples := int(float64(sampleRate) * durationSec)
	data := make([]byte, numSamples*2)
	var buf bytes.Buffer
	buf.WriteString("RIFF")
	fileSize := uint32(36 + len(data))
	_ = appendUint32(&buf, fileSize)
	buf.WriteString("WAVEfmt ")
	_ = appendUint32(&buf, 16)
	_ = appendUint16(&buf, 1)
	_ = appendUint16(&buf, 1)
	_ = appendUint32(&buf, uint32(sampleRate))
	_ = appendUint32(&buf, uint32(sampleRate*2))
	_ = appendUint16(&buf, 2)
	_ = appendUint16(&buf, 16)
	buf.WriteString("data")
	_ = appendUint32(&buf, uint32(len(data)))
	buf.Write(data)
	return buf.Bytes()
}

func appendUint32(buf *bytes.Buffer, value uint32) error {
	return binaryWrite(buf, value)
}

func appendUint16(buf *bytes.Buffer, value uint16) error {
	return binaryWrite(buf, value)
}

func binaryWrite(buf *bytes.Buffer, value any) error {
	var b [4]byte
	switch v := value.(type) {
	case uint32:
		b[0] = byte(v)
		b[1] = byte(v >> 8)
		b[2] = byte(v >> 16)
		b[3] = byte(v >> 24)
		_, err := buf.Write(b[:4])
		return err
	case uint16:
		b[0] = byte(v)
		b[1] = byte(v >> 8)
		_, err := buf.Write(b[:2])
		return err
	default:
		return nil
	}
}
