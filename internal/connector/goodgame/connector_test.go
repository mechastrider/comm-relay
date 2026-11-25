package goodgame

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/gorilla/websocket"
	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/mechastrider/comm-relay/internal/connector/status"
)

func TestGuestReconnectSkipsHistoryAndRepeatedMessages(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/stream/Miker", func(w http.ResponseWriter, _ *http.Request) { _, _ = io.WriteString(w, `{"id":5}`) })
	var sessions atomic.Int32
	mux.HandleFunc("/chat", func(w http.ResponseWriter, r *http.Request) {
		var upgrade websocket.Upgrader
		conn, err := upgrade.Upgrade(w, r, nil)
		if err != nil {
			return
		}
		defer func() { _ = conn.Close() }()
		if err = conn.WriteJSON(map[string]any{"type": "welcome", "data": map[string]int{"protocolVersion": 2}}); err != nil {
			return
		}
		var join struct {
			Type string
			Data struct {
				Channel string `json:"channel_id"`
			}
		}
		if err = conn.ReadJSON(&join); err != nil || join.Type != "join" || join.Data.Channel != "5" {
			t.Error("expected guest join for channel 5")
			return
		}
		session := sessions.Add(1)
		for _, frame := range []string{
			`{"type":"success_join","data":{"channel_id":"5","channel_streamer":{"id":7}}}`,
			`{"type":"channel_history","data":{"messages":[{"message_id":99}]}}`,
			`{"type":"private_message","data":{"channel_id":"5","message_id":12,"user_id":7,"user_name":"A","text":"private","timestamp":42}}`,
			`{"type":"message","data":{"channel_id":"5","user_id":7,"user_name":"A","message_id":13,"timestamp":42,"text":"a &amp; b"}}`,
		} {
			if conn.WriteJSON(json.RawMessage(frame)) != nil {
				return
			}
		}
		if session == 1 {
			return
		}
		_ = conn.WriteJSON(json.RawMessage(`{"type":"message","data":{"channel_id":5,"user_id":"8","user_name":"B","message_id":"14","timestamp":43,"text":"second"}}`))
		_, _, _ = conn.ReadMessage()
	})
	srv := httptest.NewServer(mux)
	defer srv.Close()
	cfg := config.Default()
	cfg.GoodGame = config.GoodGameConfig{Enabled: true, Channel: "https://goodgame.ru/channel/Miker/"}
	store, err := config.NewStore(filepath.Join(t.TempDir(), "config.json"), cfg)
	require.NoError(t, err)
	events := bus.New(8)
	messages, unsubscribe := events.Subscribe("test")
	defer unsubscribe()
	registry := status.NewRegistry()
	c := New(events, store, registry)
	c.client = client{srv.URL + "/stream/", "ws" + strings.TrimPrefix(srv.URL, "http") + "/chat", srv.Client()}
	ctx, cancel := context.WithTimeout(t.Context(), 8*time.Second)
	done := make(chan struct{})
	go func() { defer close(done); _ = c.Run(ctx) }()
	defer func() { cancel(); <-done }()
	read := func() bus.ChatMessage {
		t.Helper()
		select {
		case ev := <-messages:
			return ev.Message
		case <-ctx.Done():
			t.Fatal("timed out waiting for public chat message")
			return bus.ChatMessage{}
		}
	}
	first := read()
	require.Equal(t, "a & b", first.Message)
	require.Equal(t, "goodgame", first.Platform)
	require.Equal(t, []string{"broadcaster"}, first.Badges)
	require.Equal(t, "goodgame-14", read().ID)
	require.Equal(t, status.StateConnected, registry.Get(status.PlatformGoodGame).State)
	require.NoError(t, store.Mutate(func(cfg *config.Config) error { cfg.GoodGame.Enabled = false; return nil }))
	require.Eventually(t, func() bool { return registry.Get(status.PlatformGoodGame).State == status.StateDisabled }, 3*time.Second, 20*time.Millisecond)
}
