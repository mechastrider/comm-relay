package api

import (
	"log/slog"
	"net/http"

	"github.com/gorilla/websocket"
	"github.com/muonsoft/clog"
)

var wsUpgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(*http.Request) bool {
		// Local-only MVP: OBS and admin run on the same host.
		return true
	},
}

func (h *Hub) serveWS(w http.ResponseWriter, r *http.Request) {
	h.serveWSAudience(w, r, false)
}

func (h *Hub) serveDebugWS(w http.ResponseWriter, r *http.Request) {
	h.serveWSAudience(w, r, true)
}

func (h *Hub) serveWSAudience(w http.ResponseWriter, r *http.Request, debug bool) {
	conn, err := wsUpgrader.Upgrade(w, r, nil)
	if err != nil {
		clog.Debug(r.Context(), "websocket upgrade failed", slog.Any("error", err))
		return
	}

	client := &wsClient{
		ctx:   r.Context(),
		hub:   h,
		conn:  conn,
		send:  make(chan []byte, ClientSendBuffer),
		debug: debug,
	}

	h.register(client)

	go client.writePump()
	go client.readPump()
}
