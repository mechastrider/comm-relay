package bus

import (
	"sync"

	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/observability"
)

// DefaultBufferSize is the per-subscriber channel capacity when none is configured.
const DefaultBufferSize = 256

// ErrClosed is returned when publishing or subscribing on a stopped bus.
var ErrClosed = errors.New("bus closed")

// Bus fans out events to subscribers with bounded per-subscriber buffers.
type Bus struct {
	mu      sync.Mutex
	subs    map[uint64]subscription
	nextID  uint64
	cap     int
	closed  bool
	metrics *observability.Registry
}

type subscription struct {
	name string
	ch   chan Event
}

// New creates a bus. capacity is the per-subscriber buffer size; zero or negative uses [DefaultBufferSize].
func New(capacity int) *Bus {
	if capacity <= 0 {
		capacity = DefaultBufferSize
	}

	return &Bus{
		subs:    make(map[uint64]subscription),
		cap:     capacity,
		metrics: observability.Default,
	}
}

// SetMetricsRegistry wires a custom observability registry. Production uses [observability.Default].
func (b *Bus) SetMetricsRegistry(r *observability.Registry) {
	if r == nil {
		r = observability.Default
	}
	b.mu.Lock()
	b.metrics = r
	b.mu.Unlock()
}

// Subscribe registers a named consumer. The returned function removes the subscription.
func (b *Bus) Subscribe(name string) (<-chan Event, func()) {
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
	b.subs[id] = subscription{name: name, ch: ch}

	unsub := func() {
		b.mu.Lock()
		defer b.mu.Unlock()

		sub, ok := b.subs[id]
		if !ok {
			return
		}

		delete(b.subs, id)
		close(sub.ch)
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

	eventType := string(event.Type)
	for _, sub := range b.subs {
		select {
		case sub.ch <- event:
		default:
			if b.metrics != nil {
				b.metrics.RecordBusDrop(sub.name, eventType)
			}
		}
	}

	return nil
}

// SubscriberCount returns the number of active subscribers.
func (b *Bus) SubscriberCount() int {
	b.mu.Lock()
	defer b.mu.Unlock()

	return len(b.subs)
}

// Close stops the bus, closes all subscriber channels, and rejects further publishes.
func (b *Bus) Close() {
	b.mu.Lock()
	defer b.mu.Unlock()

	if b.closed {
		return
	}

	b.closed = true

	for id, sub := range b.subs {
		close(sub.ch)
		delete(b.subs, id)
	}
}
