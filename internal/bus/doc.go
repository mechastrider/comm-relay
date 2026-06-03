// Package bus provides an in-process publish/subscribe event bus for chat events.
//
// Each subscriber receives events on a dedicated buffered channel. Default capacity
// is [DefaultBufferSize] (256). [Bus.Publish] never blocks waiting for a slow consumer:
// if a subscriber's buffer is full, that event is dropped for that subscriber only.
// Other subscribers and the publisher continue normally.
package bus
