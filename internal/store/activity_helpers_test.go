package store_test

import "github.com/mechastrider/comm-relay/internal/store"

func defaultActivity() store.ActivitySettings {
	return store.ActivitySettings{
		IntervalSeconds: 300,
		SessionLimit:    10,
		XP:              1,
	}
}

func disabledActivity() store.ActivitySettings {
	return store.ActivitySettings{}
}

func activityWith(xp int) store.ActivitySettings {
	return store.ActivitySettings{
		IntervalSeconds: 1,
		SessionLimit:    100,
		XP:              xp,
	}
}
