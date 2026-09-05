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

	"github.com/mechastrider/comm-relay/internal/bus"
)

func TestViewerAvatarUpload_WhenPNG_ExpectFilename(t *testing.T) {
	t.Parallel()

	env := newTestEnv(t, bus.New(0))
	viewerID := seedViewer(t, env, "youtube", "UC-avatar", "Portrait Viewer")

	filename := uploadViewerAvatar(t, env.Handler, viewerID, "face.png", tinyPNG())
	require.True(t, strings.HasSuffix(filename, ".png"))

	getRec := httptest.NewRecorder()
	env.Handler.ServeHTTP(getRec, httptest.NewRequest(http.MethodGet, "/api/viewers/get?id="+viewerID, nil))
	require.Equal(t, http.StatusOK, getRec.Code)

	var payload struct {
		AvatarURL    string `json:"avatar_url"`
		CustomAvatar string `json:"custom_avatar"`
	}
	require.NoError(t, json.Unmarshal(getRec.Body.Bytes(), &payload))
	require.Equal(t, "/overlay/assets/"+filename, payload.AvatarURL)
	require.Equal(t, filename, payload.CustomAvatar)
}

func TestViewerAvatarUpload_WhenGIF_ExpectBadRequest(t *testing.T) {
	t.Parallel()

	env := newTestEnv(t, bus.New(0))
	viewerID := seedViewer(t, env, "youtube", "UC-gif", "GIF Viewer")
	gif := []byte("GIF89a" + string(bytes.Repeat([]byte{0x00}, 32)))

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	require.NoError(t, writer.WriteField("id", viewerID))
	part, err := writer.CreateFormFile("file", "face.gif")
	require.NoError(t, err)
	_, err = part.Write(gif)
	require.NoError(t, err)
	require.NoError(t, writer.Close())

	req := httptest.NewRequest(http.MethodPost, "/api/viewers/avatar/upload", &body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	rec := httptest.NewRecorder()
	env.Handler.ServeHTTP(rec, req)
	require.Equal(t, http.StatusBadRequest, rec.Code)

	getRec := httptest.NewRecorder()
	env.Handler.ServeHTTP(getRec, httptest.NewRequest(http.MethodGet, "/api/viewers/get?id="+viewerID, nil))
	require.Equal(t, http.StatusOK, getRec.Code)

	var payload map[string]any
	require.NoError(t, json.Unmarshal(getRec.Body.Bytes(), &payload))
	require.Empty(t, payload["custom_avatar"])
}

func TestViewerAvatarClear_WhenCustomStored_ExpectRemoved(t *testing.T) {
	t.Parallel()

	env := newTestEnv(t, bus.New(0))
	viewerID := seedViewer(t, env, "youtube", "UC-clear", "Clear Viewer")
	filename := uploadViewerAvatar(t, env.Handler, viewerID, "face.png", tinyPNG())

	inUseRec := httptest.NewRecorder()
	env.Handler.ServeHTTP(inUseRec, httptest.NewRequest(
		http.MethodPost,
		"/api/overlay/assets/delete",
		strings.NewReader(`{"filename":"`+filename+`"}`),
	))
	require.Equal(t, http.StatusBadRequest, inUseRec.Code)

	clearRec := httptest.NewRecorder()
	env.Handler.ServeHTTP(clearRec, httptest.NewRequest(
		http.MethodPost,
		"/api/viewers/avatar/clear",
		strings.NewReader(`{"id":"`+viewerID+`"}`),
	))
	require.Equal(t, http.StatusOK, clearRec.Code)

	getRec := httptest.NewRecorder()
	env.Handler.ServeHTTP(getRec, httptest.NewRequest(http.MethodGet, "/api/viewers/get?id="+viewerID, nil))
	require.Equal(t, http.StatusOK, getRec.Code)

	var payload map[string]any
	require.NoError(t, json.Unmarshal(getRec.Body.Bytes(), &payload))
	require.Empty(t, payload["custom_avatar"])

	deleteRec := httptest.NewRecorder()
	env.Handler.ServeHTTP(deleteRec, httptest.NewRequest(
		http.MethodPost,
		"/api/overlay/assets/delete",
		strings.NewReader(`{"filename":"`+filename+`"}`),
	))
	require.Equal(t, http.StatusNotFound, deleteRec.Code)
}

func TestFillChatMessageAvatar_WhenCustomPortrait_ExpectLocalAssetURL(t *testing.T) {
	t.Parallel()

	env := newTestEnv(t, bus.New(0))
	viewerID := seedViewer(t, env, "twitch", "12345", "Viewer")
	filename := uploadViewerAvatar(t, env.Handler, viewerID, "face.png", tinyPNG())

	filled := fillChatMessageAvatar(env.ViewerStore, env.ConfigStore, bus.ChatMessage{
		Platform: "twitch",
		UserID:   "12345",
		Username: "Viewer",
		Message:  "hello",
	})
	require.Equal(t, "/overlay/assets/"+filename, filled.AvatarURL)
}

func uploadViewerAvatar(t *testing.T, handler http.Handler, viewerID, uploadName string, data []byte) string {
	t.Helper()

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	require.NoError(t, writer.WriteField("id", viewerID))
	part, err := writer.CreateFormFile("file", uploadName)
	require.NoError(t, err)
	_, err = part.Write(data)
	require.NoError(t, err)
	require.NoError(t, writer.Close())

	req := httptest.NewRequest(http.MethodPost, "/api/viewers/avatar/upload", &body)
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
