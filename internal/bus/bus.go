package bus

import (
	"sync"

	"github.com/muonsoft/errors"
)

// DefaultBufferSize is the per-subscriber channel capacity when none is configured.
const DefaultBufferSize = 256

// ErrClosed is returned when publishing or subscribing on a stopped bus.
var ErrClosed = errors.New("bus closed")

// Bus fans out events to subscribers with bounded per-subscriber buffers.
type Bus struct {
	mu     sync.Mutex
	subs   map[uint64]chan Event
	nextID uint64
	cap    int
	closed bool
}

// New creates a bus. capacity is the per-subscriber buffer size; zero or negative uses [DefaultBufferSize].
func New(capacity int) *Bus {
	if capacity <= 0 {
		capacity = DefaultBufferSize
	}

	return &Bus{
		subs: make(map[uint64]chan Event),
		cap:  capacity,
	}
}

// Subscribe registers a consumer. The returned function removes the subscription.
func (b *Bus) Subscribe() (<-chan Event, func()) {
	b.mu.Lock()
	defer b.mu.Unlock()

	if b.closed {
		ch := make(chan Event)
		close(ch)
		return ch, func() {}
	}

	id := b.nextID
	b.nextID++

	ch := make(chan Event, b.cap)
	b.subs[id] = ch

	unsub := func() {
		b.mu.Lock()
		defer b.mu.Unlock()

		subCh, ok := b.subs[id]
		if !ok {
			return
		}

		delete(b.subs, id)
		close(subCh)
	}

	return ch, unsub
}

// Publish delivers an event to all subscribers without blocking on slow consumers.
func (b *Bus) Publish(event Event) error {
	b.mu.Lock()
	defer b.mu.Unlock()

	if b.closed {
		return ErrClosed
	}

	for _, ch := range b.subs {
		select {
		case ch <- event:
		default:
			// Subscriber buffer full: drop for this consumer only.
		}
	}

	return nil
}

// Close stops the bus, closes all subscriber channels, and rejects further publishes.
func (b *Bus) Close() {
	b.mu.Lock()
	defer b.mu.Unlock()

	if b.closed {
		return
	}

	b.closed = true

	for id, ch := range b.subs {
		close(ch)
		delete(b.subs, id)
	}
}
