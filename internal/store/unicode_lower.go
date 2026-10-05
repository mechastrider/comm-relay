package store

import (
	"database/sql/driver"
	"strings"
	"sync"

	"github.com/muonsoft/errors"
	"modernc.org/sqlite"
)

var (
	registerUnicodeLowerOnce sync.Once
	registerUnicodeLowerErr  error
)

// registerUnicodeLower adds a SQLite function that folds Unicode case.
// SQLite LOWER only changes ASCII A-Z, so a Cyrillic query cannot match a stored name.
func registerUnicodeLower() error {
	registerUnicodeLowerOnce.Do(func() {
		registerUnicodeLowerErr = sqlite.RegisterScalarFunction(
			"unicode_lower",
			1,
			func(_ *sqlite.FunctionContext, args []driver.Value) (driver.Value, error) {
				if len(args) == 0 || args[0] == nil {
					return "", nil
				}
				switch value := args[0].(type) {
				case string:
					return strings.ToLower(value), nil
				case []byte:
					return strings.ToLower(string(value)), nil
				default:
					return "", errors.New("unicode_lower expects text")
				}
			},
		)
		if registerUnicodeLowerErr != nil {
			registerUnicodeLowerErr = errors.Errorf("register unicode_lower: %w", registerUnicodeLowerErr)
		}
	})
	return registerUnicodeLowerErr
}
