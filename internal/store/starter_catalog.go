package store

const starterCatalogBootstrapKey = "starter_catalog_initialized"

type starterCommandSeed struct {
	ID              string
	Trigger         string
	Enabled         bool
	CooldownSeconds int
	SplashTemplate  string
	Sound           string
	DurationMs      int
}

type starterAwardSeed struct {
	ID             string
	Name           string
	Points         int
	SplashTemplate string
	Sound          string
	DurationMs     int
}

func normalizeStarterLocale(locale string) string {
	if locale == "en-GB" {
		return "en-GB"
	}

	return "ru-RU"
}

func starterCommandsForLocale(locale string) []starterCommandSeed {
	switch normalizeStarterLocale(locale) {
	case "en-GB":
		return englishStarterCommands()
	default:
		return russianStarterCommands()
	}
}

func starterAwardsForLocale(locale string) []starterAwardSeed {
	switch normalizeStarterLocale(locale) {
	case "en-GB":
		return englishStarterAwards()
	default:
		return russianStarterAwards()
	}
}

func englishStarterCommands() []starterCommandSeed {
	return []starterCommandSeed{
		{
			ID:              "gg",
			Trigger:         "gg",
			Enabled:         true,
			CooldownSeconds: 30,
			SplashTemplate:  "Good game, {viewer}!",
			Sound:           "chime",
			DurationMs:      5000,
		},
		{
			ID:              "hi",
			Trigger:         "hi",
			Enabled:         true,
			CooldownSeconds: 30,
			SplashTemplate:  "Hi, {viewer}!",
			Sound:           "ping",
			DurationMs:      5000,
		},
	}
}

func russianStarterCommands() []starterCommandSeed {
	return []starterCommandSeed{
		{
			ID:              "gg",
			Trigger:         "gg",
			Enabled:         true,
			CooldownSeconds: 30,
			SplashTemplate:  "Хорошая игра, {viewer}!",
			Sound:           "chime",
			DurationMs:      5000,
		},
		{
			ID:              "hi",
			Trigger:         "hi",
			Enabled:         true,
			CooldownSeconds: 30,
			SplashTemplate:  "Привет, {viewer}!",
			Sound:           "ping",
			DurationMs:      5000,
		},
	}
}

func englishStarterAwards() []starterAwardSeed {
	return []starterAwardSeed{
		{ID: "joke", Name: "Joke", Points: 10, SplashTemplate: "Joke for {viewer}! +{points}", Sound: "soft", DurationMs: 5000},
		{ID: "advice", Name: "Advice", Points: 50, SplashTemplate: "Advice for {viewer}! +{points}", Sound: "alert", DurationMs: 5000},
		{ID: "spotter", Name: "Spotter", Points: 25, SplashTemplate: "Spotter for {viewer}! +{points}", Sound: "ping", DurationMs: 5000},
		{ID: "intel", Name: "Intel", Points: 30, SplashTemplate: "Intel for {viewer}! +{points}", Sound: "chime", DurationMs: 5000},
		{ID: "expert", Name: "Expert", Points: 40, SplashTemplate: "Expert for {viewer}! +{points}", Sound: "alert", DurationMs: 5000},
		{ID: "meme", Name: "Meme", Points: 20, SplashTemplate: "Meme for {viewer}! +{points}", Sound: "soft", DurationMs: 5000},
		{ID: "clutch", Name: "Clutch Help", Points: 50, SplashTemplate: "Clutch Help for {viewer}! +{points}", Sound: "alert", DurationMs: 5000},
		{ID: "mvp", Name: "MVP", Points: 100, SplashTemplate: "MVP for {viewer}! +{points}", Sound: "chime", DurationMs: 5000},
	}
}

func russianStarterAwards() []starterAwardSeed {
	return []starterAwardSeed{
		{ID: "joke", Name: "Шутка", Points: 10, SplashTemplate: "Шутка для {viewer}! +{points}", Sound: "soft", DurationMs: 5000},
		{ID: "advice", Name: "Совет", Points: 50, SplashTemplate: "Совет для {viewer}! +{points}", Sound: "alert", DurationMs: 5000},
		{ID: "spotter", Name: "Зоркий глаз", Points: 25, SplashTemplate: "Зоркий глаз: {viewer}! +{points}", Sound: "ping", DurationMs: 5000},
		{ID: "intel", Name: "Информация", Points: 30, SplashTemplate: "Информация от {viewer}! +{points}", Sound: "chime", DurationMs: 5000},
		{ID: "expert", Name: "Эксперт", Points: 40, SplashTemplate: "Эксперт: {viewer}! +{points}", Sound: "alert", DurationMs: 5000},
		{ID: "meme", Name: "Мем", Points: 20, SplashTemplate: "Мем для {viewer}! +{points}", Sound: "soft", DurationMs: 5000},
		{ID: "clutch", Name: "Решающая помощь", Points: 50, SplashTemplate: "Решающая помощь от {viewer}! +{points}", Sound: "alert", DurationMs: 5000},
		{ID: "mvp", Name: "MVP", Points: 100, SplashTemplate: "MVP: {viewer}! +{points}", Sound: "chime", DurationMs: 5000},
	}
}
