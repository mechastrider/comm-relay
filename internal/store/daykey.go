package store

import "time"

// DayKey returns the stats day key (YYYY-MM-DD) for now in its location.
// If now is before today's dayResetHour:00, yesterday's date is used.
func DayKey(now time.Time, dayResetHour int) string {
	loc := now.Location()
	resetAt := time.Date(now.Year(), now.Month(), now.Day(), dayResetHour, 0, 0, 0, loc)
	if now.Before(resetAt) {
		return now.AddDate(0, 0, -1).Format("2006-01-02")
	}

	return now.Format("2006-01-02")
}
