package api

import (
	"bytes"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/overlayassets"
)

func TestOverlayAssets_WhenUploadPNG_ExpectFilename(t *testing.T) {
	t.Parallel()

	handler := testHandler(t)
	png := []byte{0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01}

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	part, err := writer.CreateFormFile("file", "icon.png")
	require.NoError(t, err)
	_, err = part.Write(png)
	require.NoError(t, err)
	require.NoError(t, writer.Close())

	req := httptest.NewRequest(http.MethodPost, "/api/overlay/assets/upload", &body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	require.Equal(t, http.StatusOK, rec.Code)
	var payload map[string]any
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &payload))
	name, ok := payload["filename"].(string)
	require.True(t, ok)
	require.True(t, strings.HasSuffix(name, ".png"))

	getRec := httptest.NewRecorder()
	handler.ServeHTTP(getRec, httptest.NewRequest(http.MethodGet, "/overlay/assets/"+name, nil))
	require.Equal(t, http.StatusOK, getRec.Code)
}

func TestOverlayAssets_WhenFileTooLarge_ExpectBadRequest(t *testing.T) {
	t.Parallel()

	handler := testHandler(t)
	data := bytes.Repeat([]byte{0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a}, overlayassets.MaxBytes/8+2)

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

func TestConfig_WhenUpdateWithPresetsAndPeople_ExpectSaved(t *testing.T) {
	t.Parallel()

	handler := testHandler(t)
	body := strings.NewReader(`{
  "server_port": 17877,
  "twitch": { "enabled": false, "channel": "" },
  "youtube": { "enabled": false, "oauth": { "client_id": "" } },
  "vk": { "enabled": false },
  "overlay": {
    "max_messages": 12,
    "message_ttl_seconds": 8,
    "font_size_px": 20,
    "display_mode": "compact",
    "theme": "dashboard",
    "active_preset_id": "raid",
    "presets": [
      {
        "id": "raid",
        "name": "Raid",
        "max_messages": 12,
        "message_ttl_seconds": 8,
        "font_size_px": 20,
        "display_mode": "compact",
        "theme": "dashboard",
        "style": {
          "font_family": "segoe",
          "line_height": 1.4,
          "text_edge": "outline",
          "text_edge_strength": 3,
          "platform_marker": "icon",
          "panel_color": "#111111",
          "panel_opacity": 0,
          "border_width": 0,
          "border_color": "#ffffff",
          "border_radius": 8,
          "highlight_border_color": "#ffcc00",
          "highlight_text_color": "#ffffff"
        }
      }
    ],
    "highlights": { "enabled": true, "words": ["raid"] },
    "people": [
      {
        "id": "person_a",
        "label": "Vasya",
        "identities": [
          { "platform": "twitch", "username": "vasya_ttv" },
          { "platform": "youtube", "username": "VasyaPlays" }
        ]
      }
    ]
  }
}`)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/config/update", body)
	req.Header.Set("Content-Type", "application/json")
	handler.ServeHTTP(rec, req)

	require.Equal(t, http.StatusOK, rec.Code)
	require.Contains(t, rec.Body.String(), `"active_preset_id":"raid"`)
	require.Contains(t, rec.Body.String(), `"vasya_ttv"`)
	require.Contains(t, rec.Body.String(), `"raid"`)
}

func TestConfig_WhenPageOpacitySet_ExpectFieldError(t *testing.T) {
	t.Parallel()

	handler := testHandler(t)
	body := strings.NewReader(`{
  "server_port": 17877,
  "twitch": { "enabled": false, "channel": "" },
  "youtube": { "enabled": false, "oauth": { "client_id": "" } },
  "vk": { "enabled": false },
  "overlay": { "max_messages": 30, "message_ttl_seconds": 20, "page_opacity": 0.4 }
}`)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/config/update", body)
	req.Header.Set("Content-Type", "application/json")
	handler.ServeHTTP(rec, req)

	require.Equal(t, http.StatusBadRequest, rec.Code)
	require.Contains(t, rec.Body.String(), "overlay_page_opacity")
}
