package main

// telemetry.go: invocation telemetry from the MCP server, and the effectiveness
// score the catalog ranks on. Stars and download counts are proxies for
// quality; an invocation that actually succeeded inside a real agent session is
// the signal itself. The server appends one event per tools/call that touches a
// skill, and every read derives from those events.
//
// Storage is local (~/.skyboy/telemetry.json), because the CLI and the stdio
// MCP server run on the user's machine. `skyboy stats` reports it, search uses
// it as a ranking signal, and `build-catalog --telemetry <file>` folds a
// registry-side aggregate into the catalog's `ef` field so the site and every
// client can rank by it too.
//
// Recording is best-effort on purpose: a telemetry write must never fail, or
// slow down, the tool call that produced it.

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"time"
)

// maxTelemetryEvents bounds the local store. The file is a rolling window, not
// an append-only log, so a long-lived install cannot grow it without limit.
const maxTelemetryEvents = 5000

// telemetryEvent is one recorded tool outcome that touched a skill.
type telemetryEvent struct {
	Skill string    `json:"skill"` // the resolved record id
	Tool  string    `json:"tool"`  // get_skill | install_skill
	OK    bool      `json:"ok"`
	At    time.Time `json:"at"`
}

// telemetryFile is the whole ~/.skyboy/telemetry.json document.
type telemetryFile struct {
	Events []telemetryEvent `json:"events"`
}

// telemetryPath is where the local store lives, beside state.json.
func telemetryPath() string { return filepath.Join(skyboyHome(), "telemetry.json") }

func loadTelemetry() *telemetryFile {
	t := &telemetryFile{}
	data, err := os.ReadFile(telemetryPath())
	if err != nil {
		return t
	}
	_ = json.Unmarshal(data, t)
	return t
}

// saveTelemetry writes the store, pruning to the newest maxTelemetryEvents.
func saveTelemetry(t *telemetryFile) {
	if len(t.Events) > maxTelemetryEvents {
		t.Events = t.Events[len(t.Events)-maxTelemetryEvents:]
	}
	if err := os.MkdirAll(skyboyHome(), 0o755); err != nil {
		return
	}
	data, err := json.MarshalIndent(t, "", "  ")
	if err != nil {
		return
	}
	_ = os.WriteFile(telemetryPath(), append(data, '\n'), 0o644)
}

// recordTelemetry appends one event for a skill-touching tool call. An
// unresolved call has nothing to attribute and is skipped.
func recordTelemetry(skill, tool string, ok bool) {
	if skill == "" {
		return
	}
	t := loadTelemetry()
	t.Events = append(t.Events, telemetryEvent{
		Skill: skill, Tool: tool, OK: ok, At: time.Now().UTC(),
	})
	saveTelemetry(t)
}

// Effectiveness summarizes a skill's recorded invocations.
type Effectiveness struct {
	Invocations int     `json:"invocations"`
	Successes   int     `json:"successes"`
	Failures    int     `json:"failures"`
	Score       float64 `json:"score"`      // 0-1, Laplace-smoothed success rate
	Confidence  float64 `json:"confidence"` // 0-1, how much evidence backs Score
}

// telemetryPrior is the Laplace prior's strength: one pseudo-success and one
// pseudo-failure, so a single unlucky invocation cannot read as a 0% skill and
// a single lucky one cannot read as 100%.
const telemetryPrior = 2.0

// evidenceScale is the invocation count at which Confidence saturates.
const evidenceScale = 20.0

// noEvidenceRank is the neutral value Rank() returns for a skill with no
// recorded invocations.
const noEvidenceRank = 0.5

// effectivenessOf folds events into per-skill summaries.
func effectivenessOf(events []telemetryEvent) map[string]Effectiveness {
	type tally struct{ ok, fail int }
	sum := map[string]*tally{}
	for _, e := range events {
		t, found := sum[e.Skill]
		if !found {
			t = &tally{}
			sum[e.Skill] = t
		}
		if e.OK {
			t.ok++
		} else {
			t.fail++
		}
	}
	out := make(map[string]Effectiveness, len(sum))
	for skill, t := range sum {
		out[skill] = newEffectiveness(t.ok, t.fail)
	}
	return out
}

// newEffectiveness computes the smoothed score for one tally.
func newEffectiveness(successes, failures int) Effectiveness {
	inv := successes + failures
	score := (float64(successes) + telemetryPrior/2) / (float64(inv) + telemetryPrior)
	conf := float64(inv) / evidenceScale
	if conf > 1 {
		conf = 1
	}
	return Effectiveness{
		Invocations: inv, Successes: successes, Failures: failures,
		Score: score, Confidence: conf,
	}
}

// Rank is what telemetry contributes to ordering: the observed success rate
// pulled toward the neutral 0.5 by how little evidence backs it. A skill with
// no recorded invocations scores exactly 0.5, so it neither gains nor loses
// against an untried peer — telemetry breaks ties and rewards real usage, it
// does not bury new skills.
func (e Effectiveness) Rank() float64 {
	return noEvidenceRank + (e.Score-noEvidenceRank)*e.Confidence
}

// effectivenessIndex reads the local store into a per-skill map. Returned
// empty (never nil) so callers can index it unconditionally.
func effectivenessIndex() map[string]Effectiveness {
	return effectivenessOf(loadTelemetry().Events)
}

// rankOf is the telemetry rank for one id, neutral when unrecorded.
func rankOf(idx map[string]Effectiveness, id string) float64 {
	if idx == nil {
		return noEvidenceRank
	}
	return idx[id].Rank()
}

// telemetryAggregateFile is the registry-side input to `build-catalog
// --telemetry`: per-skill success/failure tallies, the counts a server that has
// actually served the tool calls is in a position to know. Deliberately not the
// raw event list — the aggregate is what a registry publishes, and it is small
// enough to commit.
type telemetryAggregateFile struct {
	Skills map[string]struct {
		Successes int `json:"successes"`
		Failures  int `json:"failures"`
	} `json:"skills"`
}

// loadTelemetryAggregate reads an aggregate file into an effectiveness index.
func loadTelemetryAggregate(path string) (map[string]Effectiveness, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("cannot read telemetry aggregate %s: %w", path, err)
	}
	var doc telemetryAggregateFile
	if err := json.Unmarshal(data, &doc); err != nil {
		return nil, fmt.Errorf("telemetry aggregate %s is not valid JSON: %w", path, err)
	}
	out := make(map[string]Effectiveness, len(doc.Skills))
	for id, tally := range doc.Skills {
		if id == "" {
			continue
		}
		out[id] = newEffectiveness(tally.Successes, tally.Failures)
	}
	return out, nil
}

// cmdStats implements `skyboy stats`: the effectiveness table built from local
// invocation telemetry. This is the read side of what the MCP server records.
func cmdStats(args []string) error {
	eff := effectivenessIndex()
	if len(eff) == 0 {
		fmt.Fprintln(stdout, "skyboy: no invocation telemetry recorded yet.")
		fmt.Fprintln(stdout, "  The MCP server records one event per get_skill / install_skill call;")
		fmt.Fprintln(stdout, "  run skills through `skyboy mcp` and this table fills in.")
		return nil
	}

	type row struct {
		Skill string        `json:"skill"`
		Eff   Effectiveness `json:"effectiveness"`
	}
	rows := make([]row, 0, len(eff))
	for skill, e := range eff {
		rows = append(rows, row{skill, e})
	}
	sort.Slice(rows, func(i, j int) bool {
		if a, b := rows[i].Eff.Rank(), rows[j].Eff.Rank(); a != b {
			return a > b
		}
		if rows[i].Eff.Invocations != rows[j].Eff.Invocations {
			return rows[i].Eff.Invocations > rows[j].Eff.Invocations
		}
		return rows[i].Skill < rows[j].Skill
	})

	if hasFlag(args, "--json") {
		data, err := json.MarshalIndent(rows, "", "  ")
		if err != nil {
			return err
		}
		_, err = stdout.Write(append(data, '\n'))
		return err
	}

	total := 0
	fmt.Fprintln(stdout, "SKILL\tINVOKED\tOK\tRATE\tRANK")
	for _, r := range rows {
		total += r.Eff.Invocations
		rate := 0.0
		if r.Eff.Invocations > 0 {
			rate = float64(r.Eff.Successes) / float64(r.Eff.Invocations) * 100
		}
		fmt.Fprintf(stdout, "%s\t%d\t%d\t%.0f%%\t%.3f\n",
			r.Skill, r.Eff.Invocations, r.Eff.Successes, rate, r.Eff.Rank())
	}
	fmt.Fprintf(stdout, "stats: %d skill(s), %d invocation(s) recorded locally\n", len(rows), total)
	return nil
}
