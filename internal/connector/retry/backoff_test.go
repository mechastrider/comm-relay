package retry

import (
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestBackoff_WhenDoubled_ExpectCappedAtMax(t *testing.T) {
	t.Parallel()

	b := NewBackoff(time.Second, 30*time.Second)
	require.Equal(t, time.Second, b.Current())

	b = b.Next()
	require.Equal(t, 2*time.Second, b.Current())

	for range 10 {
		b = b.Next()
	}
	require.Equal(t, 30*time.Second, b.Current())
}

func TestBackoff_WhenReset_ExpectInitialDelay(t *testing.T) {
	t.Parallel()

	b := NewBackoff(2*time.Second, 60*time.Second).Next().Next()
	require.Equal(t, 8*time.Second, b.Current())
	require.Equal(t, 2*time.Second, b.Reset().Current())
}
