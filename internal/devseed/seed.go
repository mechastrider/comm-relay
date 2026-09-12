package devseed

import (
	"fmt"
	"math/rand"
	"os"
	"path/filepath"
	"time"

	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/mechastrider/comm-relay/internal/store"
)

// Options controls synthetic data generation beside config.json.
type Options struct {
	ConfigPath string
	Reset      bool
}

// Result summarizes what was written.
type Result struct {
	ConfigPath string
	DBPath     string
	Viewers    int
	Awards     int
	Messages   int
}

type persona struct {
	platform     string
	userID       string
	username     string
	displayName  string
	chatLines    int
	hidden       bool
	nameOverride string
}

// Run creates or refreshes a representative local dataset for manual testing.
func Run(opts Options) (Result, error) {
	configPath := opts.ConfigPath
	if configPath == "" {
		configPath = "config.json"
	}

	cfg, err := config.Load(configPath)
	if err != nil {
		return Result{}, errors.Errorf("load config: %w", err)
	}

	dbPath, err := store.DBPath(configPath)
	if err != nil {
		return Result{}, errors.Errorf("resolve database path: %w", err)
	}

	if opts.Reset {
		if removeErr := removeDatabaseFiles(dbPath); removeErr != nil {
			return Result{}, removeErr
		}
	}

	s, err := store.Open(dbPath, store.OpenOptions{TimeLocale: cfg.Admin.TimeLocale})
	if err != nil {
		return Result{}, errors.Errorf("open viewer store: %w", err)
	}
	defer func() {
		_ = s.Close()
	}()

	awards, err := s.ListAwards()
	if err != nil {
		return Result{}, errors.Errorf("list awards: %w", err)
	}
	if len(awards) == 0 {
		return Result{}, errors.New("award catalog is empty")
	}

	awardName := map[string]string{}
	for _, award := range awards {
		awardName[award.ID] = award.Name
	}

	disabledActivity := store.ActivitySettings{}
	dayResetHour := cfg.DayResetHour
	base := time.Now().UTC().Truncate(time.Second)
	start := base.Add(-14 * 24 * time.Hour)

	personas := []persona{
		{platform: "twitch", userID: "1001", username: "night_owl", displayName: "НочнойСтраж", chatLines: 140},
		{platform: "youtube", userID: "UC-pixel-fox", username: "PixelFox", displayName: "PixelFox", chatLines: 95},
		{platform: "vk", userID: "vk-sova42", username: "sova42", displayName: "Сова42", chatLines: 72},
		{platform: "twitch", userID: "2002", username: "quiet_fan", displayName: "ТихийЗритель", chatLines: 18},
		{platform: "youtube", userID: "UC-long-name", username: "longname", displayName: "ОченьДлинноеИмяДляПроверкиОбрезкиВТаблице", chatLines: 24},
		{platform: "twitch", userID: "xss-test", username: "xss", displayName: "<b>HTML</b> & \"кавычки\"", chatLines: 6},
		{platform: "vk", userID: "vk-ghost", username: "ghost", displayName: "СкрытыйГость", chatLines: 40, hidden: true},
		{platform: "twitch", userID: "merge-twitch", username: "same_person", displayName: "ОдинЧеловек", chatLines: 22},
		{platform: "youtube", userID: "merge-youtube", username: "same_person_yt", displayName: "ОдинЧеловек", chatLines: 16},
		{platform: "twitch", userID: "fresh", username: "newbie", displayName: "НовичокСегодня", chatLines: 4},
	}

	rng := rand.New(rand.NewSource(42))
	viewerIDs := make(map[string]string, len(personas))
	messageCount := 0

	for i, p := range personas {
		at := start.Add(time.Duration(i) * 6 * time.Hour)
		for line := 0; line < p.chatLines; line++ {
			at = at.Add(time.Duration(3+rng.Intn(8)) * time.Minute)
			identity := store.ChatIdentity{
				Platform:    p.platform,
				UserID:      p.userID,
				Username:    p.username,
				DisplayName: p.displayName,
			}
			if err = s.ApplyChat(identity, disabledActivity, dayResetHour, at); err != nil {
				return Result{}, errors.Errorf("apply chat for %s: %w", p.displayName, err)
			}
			messageCount++
		}

		viewerID, ok := s.ViewerIDForIdentity(p.platform, p.userID)
		if !ok {
			return Result{}, errors.Errorf("viewer not found after chat: %s/%s", p.platform, p.userID)
		}
		viewerIDs[p.platform+"/"+p.userID] = viewerID

		if p.hidden {
			if err = s.UpdateLeaderboardHidden(viewerID, true); err != nil {
				return Result{}, errors.Errorf("hide viewer %s: %w", p.displayName, err)
			}
		}
		if p.nameOverride != "" {
			if err = s.UpdateDisplayName(viewerID, p.nameOverride); err != nil {
				return Result{}, errors.Errorf("override display name for %s: %w", p.displayName, err)
			}
		}
	}

	awardCount := 0
	grant := func(identity store.ChatIdentity, awardID, snapshotName string, at time.Time) error {
		points := 10
		for _, award := range awards {
			if award.ID == awardID {
				points = award.Points
				break
			}
		}
		if snapshotName == "" {
			snapshotName = awardName[awardID]
		}
		_, grantErr := s.GrantAward(store.GrantAwardInput{
			Identity:        identity,
			Points:          points,
			DayResetHour:    dayResetHour,
			Now:             at,
			AwardID:         awardID,
			AwardName:       snapshotName,
			MessagePlatform: identity.Platform,
			MessageID:       fmt.Sprintf("seed-%d", awardCount),
		})
		if grantErr != nil {
			return grantErr
		}
		awardCount++
		return nil
	}

	awardIDs := make([]string, 0, len(awards))
	for _, award := range awards {
		awardIDs = append(awardIDs, award.ID)
	}

	grantAt := start.Add(2 * time.Hour)
	for idx, p := range personas {
		identity := store.ChatIdentity{
			Platform:    p.platform,
			UserID:      p.userID,
			Username:    p.username,
			DisplayName: p.displayName,
		}
		for n := 0; n < 3+idx%4; n++ {
			grantAt = grantAt.Add(time.Duration(20+rng.Intn(40)) * time.Minute)
			awardID := awardIDs[(idx+n)%len(awardIDs)]
			if err = grant(identity, awardID, "", grantAt); err != nil {
				return Result{}, errors.Errorf("grant award to %s: %w", p.displayName, err)
			}
		}
	}

	// Renamed award: history keeps the name at grant time.
	renamedIdentity := store.ChatIdentity{Platform: "twitch", UserID: "1001", Username: "night_owl", DisplayName: "НочнойСтраж"}
	grantAt = grantAt.Add(30 * time.Minute)
	if err = grant(renamedIdentity, "joke", "Шутка (старое имя)", grantAt); err != nil {
		return Result{}, errors.Errorf("grant renamed award snapshot: %w", err)
	}
	_, err = s.UpdateAward(store.UpdateAwardInput{
		ID:             "joke",
		Name:           "Шутка 2.0",
		Points:         10,
		SplashTemplate: "Шутка для {viewer}! +{points}",
		Sound:          "soft",
		DurationMs:     5000,
	})
	if err != nil {
		return Result{}, errors.Errorf("rename joke award: %w", err)
	}

	// Deleted award: history keeps snapshot; catalog row is gone.
	deletedIdentity := store.ChatIdentity{Platform: "youtube", UserID: "UC-pixel-fox", Username: "PixelFox", DisplayName: "PixelFox"}
	customAward, err := s.CreateAward(store.CreateAwardInput{
		Name:           "Временная награда",
		Points:         15,
		SplashTemplate: "Временная награда для {viewer}! +{points}",
		Sound:          "ping",
		DurationMs:     5000,
	})
	if err != nil {
		return Result{}, errors.Errorf("create temporary award: %w", err)
	}
	grantAt = grantAt.Add(15 * time.Minute)
	if err = grant(deletedIdentity, customAward.ID, customAward.Name, grantAt); err != nil {
		return Result{}, errors.Errorf("grant temporary award: %w", err)
	}
	if err = s.DeleteAward(customAward.ID); err != nil {
		return Result{}, errors.Errorf("delete temporary award: %w", err)
	}

	// Extra awards for pagination and equal-second timestamps.
	bulkIdentity := store.ChatIdentity{Platform: "vk", UserID: "vk-sova42", Username: "sova42", DisplayName: "Сова42"}
	for i := 0; i < 55; i++ {
		grantAt = grantAt.Add(time.Minute)
		if i%7 == 0 {
			grantAt = grantAt.Truncate(time.Second)
		}
		awardID := awardIDs[i%len(awardIDs)]
		if err = grant(bulkIdentity, awardID, "", grantAt); err != nil {
			return Result{}, errors.Errorf("bulk grant award %d: %w", i, err)
		}
	}

	// Simulate a new stream: session counters reset while all-time XP remains.
	if err = s.StartSession(base.Add(-2 * time.Hour)); err != nil {
		return Result{}, errors.Errorf("start new session: %w", err)
	}

	sessionStart := base.Add(-2 * time.Hour)
	for _, p := range personas[:4] {
		identity := store.ChatIdentity{
			Platform:    p.platform,
			UserID:      p.userID,
			Username:    p.username,
			DisplayName: p.displayName,
		}
		for line := 0; line < 8; line++ {
			at := sessionStart.Add(time.Duration(line*4+rng.Intn(3)) * time.Minute)
			if err = s.ApplyChat(identity, disabledActivity, dayResetHour, at); err != nil {
				return Result{}, errors.Errorf("session chat for %s: %w", p.displayName, err)
			}
			messageCount++
		}
		if err = grant(identity, "mvp", "", sessionStart.Add(45*time.Minute)); err != nil {
			return Result{}, errors.Errorf("session award for %s: %w", p.displayName, err)
		}
	}

	// Merge two platform identities into one canonical viewer.
	fromID := viewerIDs["twitch/merge-twitch"]
	intoID := viewerIDs["youtube/merge-youtube"]
	if fromID == "" || intoID == "" {
		return Result{}, errors.New("merge personas were not created")
	}
	if err = s.Merge(fromID, intoID, dayResetHour, base.Add(-30*time.Minute)); err != nil {
		return Result{}, errors.Errorf("merge viewers: %w", err)
	}
	delete(viewerIDs, "twitch/merge-twitch")

	// A few non-award interaction events (not shown in reward history).
	survivorID := viewerIDs["twitch/1001"]
	if survivorID == "" {
		survivorID, _ = s.ViewerIDForIdentity("twitch", "1001")
	}
	if survivorID != "" {
		if err = s.AppendInteractionEvent(store.AppendInteractionEventInput{
			Kind:           store.InteractionEventCommand,
			ViewerID:       survivorID,
			CommandID:      "gg",
			CommandTrigger: "gg",
			Now:            base.Add(-20 * time.Minute),
		}); err != nil {
			return Result{}, errors.Errorf("append command event: %w", err)
		}
		if err = s.AppendInteractionEvent(store.AppendInteractionEventInput{
			Kind:     store.InteractionEventActivity,
			ViewerID: survivorID,
			Points:   1,
			Now:      base.Add(-19 * time.Minute),
		}); err != nil {
			return Result{}, errors.Errorf("append activity event: %w", err)
		}
	}

	return Result{
		ConfigPath: configPath,
		DBPath:     dbPath,
		Viewers:    len(viewerIDs),
		Awards:     awardCount,
		Messages:   messageCount,
	}, nil
}

func removeDatabaseFiles(dbPath string) error {
	for _, path := range []string{dbPath, dbPath + "-wal", dbPath + "-shm"} {
		if removeErr := os.Remove(path); removeErr != nil && !os.IsNotExist(removeErr) {
			return errors.Errorf("remove %s: %w", filepath.Base(path), removeErr)
		}
	}
	return nil
}
