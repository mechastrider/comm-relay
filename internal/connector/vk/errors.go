package vk

import "github.com/muonsoft/errors"

var (
	errChannelNotFound  = errors.New("vk channel not found")
	errNoWebSocketToken = errors.New("vk websocket token not found")
)
