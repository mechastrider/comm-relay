package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/muonsoft/errors"
	"github.com/stretchr/testify/require"
)

func TestSupportOpen_WhenAllowlistedURL_ExpectOpened(t *testing.T) {
	t.Parallel()

	var openedURL string
	handler := newSupportOpenHandler()
	handler.openURL = func(url string) error {
		openedURL = url
		return nil
	}

	body, err := json.Marshal(supportOpenRequest{URL: supportTelegramURL})
	require.NoError(t, err)

	rec := httptest.NewRecorder()
	handler.handleOpen(rec, httptest.NewRequest(http.MethodPost, "/api/support/open", bytes.NewReader(body)))

	require.Equal(t, http.StatusOK, rec.Code)
	require.Equal(t, supportTelegramURL, openedURL)

	var payload supportOpenResponse
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &payload))
	require.True(t, payload.Opened)
}

func TestSupportOpen_WhenUnknownURL_ExpectBadRequest(t *testing.T) {
	t.Parallel()

	handler := newSupportOpenHandler()
	handler.openURL = func(string) error {
		t.Fatal("opener should not be called for unknown URL")
		return nil
	}

	body, err := json.Marshal(supportOpenRequest{URL: "https://example.com"})
	require.NoError(t, err)

	rec := httptest.NewRecorder()
	handler.handleOpen(rec, httptest.NewRequest(http.MethodPost, "/api/support/open", bytes.NewReader(body)))

	require.Equal(t, http.StatusBadRequest, rec.Code)
}

func TestSupportOpen_WhenOpenerFails_ExpectInternalError(t *testing.T) {
	t.Parallel()

	handler := newSupportOpenHandler()
	handler.openURL = func(string) error {
		return errors.New("open failed")
	}

	body, err := json.Marshal(supportOpenRequest{URL: projectGitHubURL})
	require.NoError(t, err)

	rec := httptest.NewRecorder()
	handler.handleOpen(rec, httptest.NewRequest(http.MethodPost, "/api/support/open", bytes.NewReader(body)))

	require.Equal(t, http.StatusInternalServerError, rec.Code)
}
