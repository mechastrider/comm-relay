package bus_test

import (
	"testing"
	"time"

	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/muonsoft/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestBus_WhenPublishChatMessage_ExpectSubscriberReceives(t *testing.T) {
	t.Parallel()

	b := bus.New(4)
	t.Cleanup(b.Close)

	events, unsub := b.Subscribe()
	defer unsub()

	msg := bus.ChatMessage{
		ID:       "1",
		Platform: "twitch",
		Username: "viewer",
		Message:  "hello",
	}
	require.NoError(t, b.Publish(bus.ChatMessageReceived(msg)))

	select {
	case got := <-events:
		assert.Equal(t, bus.EventChatMessageReceived, got.Type)
		assert.Equal(t, msg, got.Message)
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for event")
	}
}

func TestBus_WhenMultipleSubscribers_ExpectBothReceive(t *testing.T) {
	t.Parallel()

	b := bus.New(4)
	t.Cleanup(b.Close)

	a, unsubA := b.Subscribe()
	defer unsubA()

	bSub, unsubB := b.Subscribe()
	defer unsubB()

	msg := bus.ChatMessage{ID: "2", Platform: "twitch", Message: "hi"}
	require.NoError(t, b.Publish(bus.ChatMessageReceived(msg)))

	for _, ch := range []<-chan bus.Event{a, bSub} {
		select {
		case got := <-ch:
			assert.Equal(t, msg, got.Message)
		case <-time.After(time.Second):
			t.Fatal("timed out waiting for event")
		}
	}
}

func TestBus_WhenClosed_ExpectPublishReturnsErrClosed(t *testing.T) {
	t.Parallel()

	b := bus.New(4)
	b.Close()

	err := b.Publish(bus.ChatMessageReceived(bus.ChatMessage{ID: "x"}))
	require.Error(t, err)
	assert.True(t, errors.Is(err, bus.ErrClosed))
}

func TestBus_WhenClosed_ExpectSubscriberChannelClosed(t *testing.T) {
	t.Parallel()

	b := bus.New(4)
	events, _ := b.Subscribe()
	b.Close()

	_, open := <-events
	assert.False(t, open)
}

func TestBus_WhenSubscriberBufferFull_ExpectPublishDoesNotBlock(t *testing.T) {
	t.Parallel()

	const cap = 2
	b := bus.New(cap)
	t.Cleanup(b.Close)

	events, unsub := b.Subscribe()
	defer unsub()

	for range cap {
		require.NoError(t, b.Publish(bus.ChatMessageReceived(bus.ChatMessage{
			ID:      "fill",
			Message: "fill",
		})))
	}

	done := make(chan struct{})
	go func() {
		require.NoError(t, b.Publish(bus.ChatMessageReceived(bus.ChatMessage{
			ID:      "overflow",
			Message: "dropped or delivered",
		})))
		close(done)
	}()

	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatal("publish blocked on full subscriber buffer")
	}

	// Drain buffered events so the test goroutine can exit cleanly.
	for range cap {
		<-events
	}
}

func TestBus_WhenSlowSubscriber_ExpectFastSubscriberStillReceives(t *testing.T) {
	t.Parallel()

	b := bus.New(1)
	t.Cleanup(b.Close)

	slow, unsubSlow := b.Subscribe()
	defer unsubSlow()

	// Fill the slow subscriber buffer without reading.
	require.NoError(t, b.Publish(bus.ChatMessageReceived(bus.ChatMessage{ID: "first"})))

	fast, unsubFast := b.Subscribe()
	defer unsubFast()

	msg := bus.ChatMessage{ID: "second", Message: "for fast"}
	require.NoError(t, b.Publish(bus.ChatMessageReceived(msg)))

	select {
	case got := <-fast:
		assert.Equal(t, msg, got.Message)
	case <-time.After(time.Second):
		t.Fatal("fast subscriber did not receive event")
	}

	select {
	case got := <-slow:
		assert.Equal(t, "first", got.Message.ID)
	default:
		t.Fatal("expected first message in slow buffer")
	}
}
