package main

import (
	"flag"
	"fmt"
	"os"
	"strings"

	"github.com/mechastrider/comm-relay/internal/overlayassets"
	"github.com/mechastrider/comm-relay/internal/packimport"
	"github.com/mechastrider/comm-relay/internal/store"
)

func main() {
	if len(os.Args) < 2 {
		printUsage()
		os.Exit(2)
	}

	switch os.Args[1] {
	case "validate":
		os.Exit(runValidate(os.Args[2:]))
	case "apply":
		os.Exit(runApply(os.Args[2:]))
	default:
		fmt.Fprintf(os.Stderr, "unknown command %q\n\n", os.Args[1])
		printUsage()
		os.Exit(2)
	}
}

func printUsage() {
	fmt.Fprintf(os.Stderr, `Usage:
  pack-import validate --pack <pack-dir>
  pack-import apply --pack <pack-dir> [--config-dir <dir>] [--dry-run] [--durations-only]

Environment:
  COMM_RELAY_CONFIG_DIR  CommRelay config directory when --config-dir is omitted
`)
}

func runValidate(args []string) int {
	fs := flag.NewFlagSet("validate", flag.ExitOnError)
	packDir := fs.String("pack", "", "path to pack directory containing pack.yaml")
	if err := fs.Parse(args); err != nil {
		return 2
	}
	if strings.TrimSpace(*packDir) == "" {
		fmt.Fprintln(os.Stderr, "pack-import validate: --pack is required")
		return 2
	}

	pack, err := packimport.LoadPackDir(*packDir)
	if err != nil {
		fmt.Fprintf(os.Stderr, "pack-import validate: %v\n", err)
		return 1
	}
	if err := packimport.ValidatePack(pack); err != nil {
		fmt.Fprintf(os.Stderr, "pack-import validate: %v\n", err)
		return 1
	}

	fmt.Printf("OK %s (%d commands)\n", pack.Pack.Slug, len(pack.Commands))
	return 0
}

func runApply(args []string) int {
	fs := flag.NewFlagSet("apply", flag.ExitOnError)
	packDir := fs.String("pack", "", "path to pack directory containing pack.yaml")
	configDir := fs.String("config-dir", "", "CommRelay config directory")
	dryRun := fs.Bool("dry-run", false, "print planned changes without writing")
	durationsOnly := fs.Bool("durations-only", false, "update only duration_ms for existing commands")
	if err := fs.Parse(args); err != nil {
		return 2
	}
	if strings.TrimSpace(*packDir) == "" {
		fmt.Fprintln(os.Stderr, "pack-import apply: --pack is required")
		return 2
	}

	paths := packimport.ResolveConfigPaths(*configDir)
	if paths.ConfigDir == "" {
		fmt.Fprintln(os.Stderr, "pack-import apply: config directory not set; use --config-dir or COMM_RELAY_CONFIG_DIR")
		return 2
	}

	pack, err := packimport.LoadPackDir(*packDir)
	if err != nil {
		fmt.Fprintf(os.Stderr, "pack-import apply: %v\n", err)
		return 1
	}
	if err := packimport.ValidatePack(pack); err != nil {
		fmt.Fprintf(os.Stderr, "pack-import apply: %v\n", err)
		return 1
	}

	var s *store.Store
	if !*dryRun {
		if err := os.MkdirAll(paths.AssetsDir, 0o755); err != nil {
			fmt.Fprintf(os.Stderr, "pack-import apply: create assets dir: %v\n", err)
			return 1
		}
		s, err = store.Open(paths.DBPath, store.OpenOptions{TimeLocale: pack.Pack.Locale})
		if err != nil {
			fmt.Fprintf(os.Stderr, "pack-import apply: open store: %v\n", err)
			return 1
		}
		defer func() { _ = s.Close() }()
	} else {
		s = nil
	}

	opts := packimport.ApplyOptions{
		DryRun:        *dryRun,
		DurationsOnly: *durationsOnly,
	}

	var result *packimport.ApplyResult
	if *dryRun {
		existing, listErr := listCommandsForDryRun(paths.DBPath, pack.Pack.Locale)
		if listErr != nil {
			fmt.Fprintf(os.Stderr, "pack-import apply: %v\n", listErr)
			return 1
		}
		planned := packimport.PlanApply(pack, existing, opts)
		result = &packimport.ApplyResult{Planned: planned}
	} else {
		result, err = packimport.Apply(pack, s, paths.AssetsDir, opts)
		if err != nil {
			fmt.Fprintf(os.Stderr, "pack-import apply: %v\n", err)
			return 1
		}
	}

	for _, action := range result.Planned {
		fmt.Printf("%-8s !%-12s %s\n", action.Kind, action.Trigger, action.Detail)
	}
	if !*dryRun {
		fmt.Printf("applied %d change(s) to %s\n", result.Applied, paths.DBPath)
		fmt.Printf("assets dir: %s\n", overlayassets.DirForConfig(paths.ConfigPath))
	}

	return 0
}

func listCommandsForDryRun(dbPath, locale string) ([]store.Command, error) {
	s, err := store.Open(dbPath, store.OpenOptions{TimeLocale: locale})
	if err != nil {
		return nil, err
	}
	defer func() { _ = s.Close() }()
	return s.ListCommands()
}
