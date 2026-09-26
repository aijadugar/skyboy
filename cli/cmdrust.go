package main

// cmdtrust.go: `skyboy trust` — the trust tier, readable two ways.
//
//   skyboy trust                  the published ladder: what each tier means and
//                                 exactly how a skill is promoted between them.
//   skyboy trust <name>           one skill's standing, why it holds it, and the
//                                 literal list of what it still needs.
//
// The point of the second form is that "verified" stops being a mystery: an
// author can see whether they are blocked on a fixable quality score or on
// invocation evidence that only usage can supply.

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

func cmdTrust(args []string) error {
	pos := positional(args)

	root := cwd()
	if dir := flagValue(args, "--root"); dir != "" {
		root = dir
	}

	// No argument, or an explicit `ladder`: print the policy.
	if len(pos) == 0 || pos[0] == "ladder" {
		fmt.Fprint(stdout, trustLadder())
		return nil
	}

	cat, err := loadCatalog(root, flagValue(args, "--catalog"))
	if err != nil {
		return err
	}
	skill, err := resolveSkill(cat.Skills, pos[0])
	if err != nil {
		return err
	}

	// Prefer the shard's computed standing (it was scored with the full
	// catalog's token index, so its quality score is the authoritative one).
	// Recompute only when the shard is unavailable.
	var assessment TrustAssessment
	eff := effectivenessIndex()[skill.ID]

	meta, mErr := fetchMetaLocal(*skill)
	if mErr == nil && meta != nil && meta.Quality != nil && meta.Trust != "" {
		assessment = TrustAssessment{
			Tier:    tierFromName(meta.Trust),
			Badge:   meta.Trust,
			Reason:  meta.TrustReason,
			Next:    meta.TrustNext,
			Missing: meta.TrustMissing,
		}
	} else {
		md := readBody(filepath.Join(root, filepath.FromSlash(skill.P), "SKILL.md"))
		rep := scoreSkill(skill, filepath.Join(root, filepath.FromSlash(skill.P)), md, nil)
		assessment = trustFor(*skill, rep, eff)
	}

	if hasFlag(args, "--json") {
		payload := map[string]any{
			"id":            skill.ID,
			"tier":          assessment.Badge,
			"reason":        assessment.Reason,
			"next":          assessment.Next,
			"missing":       assessment.Missing,
			"effectiveness": eff,
		}
		data, err := json.MarshalIndent(payload, "", "  ")
		if err != nil {
			return err
		}
		_, err = stdout.Write(append(data, '\n'))
		return err
	}

	fmt.Fprintf(stdout, "%s: %s\n", skill.ID, strings.ToUpper(assessment.Badge))
	fmt.Fprintf(stdout, "  why: %s\n", assessment.Reason)
	if eff.Invocations > 0 {
		fmt.Fprintf(stdout, "  telemetry: %d invocation(s), %d success(es), rank %.3f\n",
			eff.Invocations, eff.Successes, eff.Rank())
	} else {
		fmt.Fprintln(stdout, "  telemetry: none recorded locally")
	}
	if assessment.Next != "" {
		fmt.Fprintf(stdout, "  next tier: %s\n", assessment.Next)
		if len(assessment.Missing) == 0 {
			fmt.Fprintln(stdout, "    criteria met")
		}
		for _, m := range assessment.Missing {
			fmt.Fprintf(stdout, "    - needs %s\n", m)
		}
	} else {
		fmt.Fprintln(stdout, "  top of the ladder")
	}
	return nil
}

// tierFromName inverts TrustTier.String() for shard round-tripping.
func tierFromName(name string) TrustTier {
	for i, n := range tierNames {
		if n == name {
			return TrustTier(i)
		}
	}
	return TierCommunity
}

// fetchMetaLocal loads a skill's meta.json shard from the checkout when the
// skill folder is present locally, falling back to the network copy. The shard
// is where the ingest-computed standing lives, so reading it beats recomputing.
func fetchMetaLocal(r SkillRecord) (*SkillMetaShard, error) {
	local := filepath.Join(cwd(), filepath.FromSlash(r.P), "meta.json")
	if data, err := os.ReadFile(local); err == nil {
		var meta SkillMetaShard
		if err := json.Unmarshal(data, &meta); err == nil {
			return &meta, nil
		}
	}
	return fetchMeta(r)
}
