package command

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestDamerauLevenshtein_WhenSame_ExpectZero(t *testing.T) {
	t.Parallel()
	require.Equal(t, 0, damerauLevenshtein("heat", "heat"))
}

func TestDamerauLevenshtein_WhenSubstitution_ExpectOne(t *testing.T) {
	t.Parallel()
	require.Equal(t, 1, damerauLevenshtein("heat", "head"))
}

func TestDamerauLevenshtein_WhenTransposition_ExpectOne(t *testing.T) {
	t.Parallel()
	require.Equal(t, 1, damerauLevenshtein("heat", "haet"))
}

func TestDamerauLevenshtein_WhenInsertion_ExpectOne(t *testing.T) {
	t.Parallel()
	require.Equal(t, 1, damerauLevenshtein("heat", "heats"))
}

func TestDamerauLevenshtein_WhenDeletion_ExpectOne(t *testing.T) {
	t.Parallel()
	require.Equal(t, 1, damerauLevenshtein("heater", "heate"))
}
