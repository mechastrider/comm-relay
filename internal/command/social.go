package command

import (
	"strings"

	"github.com/mechastrider/comm-relay/internal/nicks"
	"github.com/mechastrider/comm-relay/internal/store"
)

const (
	// OutcomeStatusRejected is a matched command that failed social or policy checks.
	OutcomeStatusRejected = "rejected"
)

// RejectReason identifies why a social command was rejected.
type RejectReason string

// Reject reason values for social command outcomes.
const (
	RejectMissingArg    RejectReason = "missing_arg"
	RejectNotFound      RejectReason = "not_found"
	RejectAmbiguous     RejectReason = "ambiguous"
	RejectSelf          RejectReason = "self"
	RejectNoAward       RejectReason = "no_award"
	RejectQuota         RejectReason = "quota"
	RejectAlreadyBuffed RejectReason = "already_buffed"
	RejectAwardFull     RejectReason = "award_full"
)

// PrepareNickRemainder trims the social command payload and strips one leading @.
func PrepareNickRemainder(remainder string) string {
	return nicks.PrepareRemainder(remainder)
}

// NormalizeNickKey applies NFKC, casefold, and keeps letters and digits only.
func NormalizeNickKey(raw string) string {
	return nicks.NormalizeKey(raw)
}

// ReasonLabel returns a short operator-locale label for overlay/admin display.
func ReasonLabel(reason RejectReason, operatorLocale string) string {
	ru := strings.EqualFold(strings.TrimSpace(operatorLocale), "ru-RU") ||
		strings.HasPrefix(strings.ToLower(strings.TrimSpace(operatorLocale)), "ru")
	switch reason {
	case RejectAmbiguous:
		if ru {
			return "уточни"
		}
		return "clarify"
	case RejectMissingArg:
		if ru {
			return "нужен ник"
		}
		return "nick required"
	case RejectNotFound:
		if ru {
			return "не найден"
		}
		return "not found"
	case RejectSelf:
		if ru {
			return "себе"
		}
		return "self"
	case RejectNoAward:
		if ru {
			return "нет награды"
		}
		return "no award"
	case RejectQuota:
		if ru {
			return "лимит"
		}
		return "quota"
	case RejectAlreadyBuffed:
		if ru {
			return "уже бафф"
		}
		return "already buffed"
	case RejectAwardFull:
		if ru {
			return "лимит баффов"
		}
		return "award full"
	default:
		return ""
	}
}

// IsSocialAction reports whether a catalog action accepts a nick remainder.
func IsSocialAction(action string) bool {
	switch strings.TrimSpace(strings.ToLower(action)) {
	case store.CommandActionLike, store.CommandActionBuff:
		return true
	default:
		return false
	}
}

// RequiresEmptyRemainder reports whether extra words invalidate the match.
func RequiresEmptyRemainder(action string) bool {
	return !IsSocialAction(action)
}
