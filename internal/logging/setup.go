package logging

import (
	"context"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/muonsoft/clog"
	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/config"
)

const sessionPrefix = "session-"
const sessionSuffix = ".log"

// Session holds an open session log file. Close syncs and releases the file handle.
type Session struct {
	file     *os.File
	filePath string
}

// FilePath returns the active session log path, or empty when file logging is disabled.
func (s *Session) FilePath() string {
	if s == nil {
		return ""
	}
	return s.filePath
}

// Close flushes and closes the session log file.
func (s *Session) Close() error {
	if s == nil || s.file == nil {
		return nil
	}

	err := s.file.Close()
	s.file = nil
	return err
}

// SetupStderr configures slog.Default for console output only.
func SetupStderr(debug bool) {
	level := slog.LevelInfo
	if debug {
		level = slog.LevelDebug
	}

	handler := slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: level})
	slog.SetDefault(slog.New(handler))
}

// Setup configures slog.Default with stderr output and optional session file logging.
// File setup errors are non-fatal: stderr logging remains active and the error is returned.
func Setup(cfg config.LoggingConfig, configPath string, debug bool) (*Session, error) {
	level := slog.LevelInfo
	if debug {
		level = slog.LevelDebug
	}

	opts := &slog.HandlerOptions{Level: level}
	stderrHandler := slog.NewTextHandler(os.Stderr, opts)

	session := &Session{}
	var fileHandler slog.Handler

	if cfg.IsEnabled() {
		filePath, err := openSessionFile(configPath, cfg.RetainSessions)
		if err != nil {
			logger := slog.New(stderrHandler)
			slog.SetDefault(logger)
			return session, err
		}

		session.file = filePath.file
		session.filePath = filePath.path
		fileHandler = slog.NewTextHandler(filePath.file, opts)
	}

	logger := slog.New(combineHandlers(stderrHandler, fileHandler))
	slog.SetDefault(logger)
	return session, nil
}

type openedSessionFile struct {
	file *os.File
	path string
}

func openSessionFile(configPath string, retainSessions int) (*openedSessionFile, error) {
	logDir, err := config.LogDir(configPath)
	if err != nil {
		return nil, err
	}

	if mkdirErr := os.MkdirAll(logDir, 0o700); mkdirErr != nil {
		return nil, errors.Errorf("create log directory: %w", mkdirErr, errors.String("path", logDir))
	}

	name := sessionPrefix + time.Now().Format("20060102-150405.000") + sessionSuffix
	path := filepath.Join(logDir, name)

	file, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o600)
	if err != nil {
		return nil, errors.Errorf("open session log: %w", err, errors.String("path", path))
	}

	if err := pruneSessions(logDir, retainSessions); err != nil {
		clog.Warn(context.Background(), "prune old session logs failed", slog.Any("error", err))
	}

	return &openedSessionFile{file: file, path: path}, nil
}

func pruneSessions(logDir string, retainSessions int) error {
	entries, err := os.ReadDir(logDir)
	if err != nil {
		return errors.Errorf("list log directory: %w", err, errors.String("path", logDir))
	}

	var sessions []string
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		if strings.HasPrefix(name, sessionPrefix) && strings.HasSuffix(name, sessionSuffix) {
			sessions = append(sessions, name)
		}
	}

	if len(sessions) <= retainSessions {
		return nil
	}

	sort.Sort(sort.Reverse(sort.StringSlice(sessions)))
	for _, name := range sessions[retainSessions:] {
		if removeErr := os.Remove(filepath.Join(logDir, name)); removeErr != nil && !os.IsNotExist(removeErr) {
			return errors.Errorf("remove old session log: %w", removeErr, errors.String("path", name))
		}
	}

	return nil
}

func combineHandlers(primary slog.Handler, secondary slog.Handler) slog.Handler {
	if secondary == nil {
		return primary
	}
	return &multiHandler{handlers: []slog.Handler{primary, secondary}}
}

type multiHandler struct {
	handlers []slog.Handler
}

func (m *multiHandler) Enabled(ctx context.Context, level slog.Level) bool {
	for _, handler := range m.handlers {
		if handler.Enabled(ctx, level) {
			return true
		}
	}
	return false
}

func (m *multiHandler) Handle(ctx context.Context, record slog.Record) error {
	for i, handler := range m.handlers {
		if !handler.Enabled(ctx, record.Level) {
			continue
		}
		rec := record
		if i > 0 {
			rec = record.Clone()
		}
		if err := handler.Handle(ctx, rec); err != nil {
			return err
		}
	}
	return nil
}

func (m *multiHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	next := make([]slog.Handler, len(m.handlers))
	for i, handler := range m.handlers {
		next[i] = handler.WithAttrs(attrs)
	}
	return &multiHandler{handlers: next}
}

func (m *multiHandler) WithGroup(name string) slog.Handler {
	next := make([]slog.Handler, len(m.handlers))
	for i, handler := range m.handlers {
		next[i] = handler.WithGroup(name)
	}
	return &multiHandler{handlers: next}
}

// WriteStartupLine writes a short header to the session log when file logging is active.
func WriteStartupLine(session *Session) {
	if session == nil || session.file == nil {
		return
	}

	line := "session started at " + time.Now().Format(time.RFC3339) + "\n"
	_, _ = io.WriteString(session.file, line)
}
