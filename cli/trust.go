package main

// trust.go: the trust tier, formalized. The catalog has always carried a
// derived badge (official | vendor | verified | community), but "verified" was
// an opaque flag with no stated bar, which makes it impossible for a contributor
// to know what to do and impossible for a user to know what it means.
//
// This file defines the four tiers as a ladder with published criteria, and
// computes — per skill — where it stands, why, and exactly what it is missing
// for the next rung. The tier itself is still derived, never stored: origin and
// the review flag remain the only authored inputs (spec §4), so this adds no
// new field to skill.json.
//
// Ordering note: vendor sits above verified because a vendor publishing from
// its own repository carries provenance a usage-tested community skill does
// not. The ladder is about who stands behind the content, not only how much it
// has been run.

import (
	"fmt"
	"strings"
)

// TrustTier is one rung of the ladder, ordered weakest to strongest.
type TrustTier int

const (
	TierCommunity TrustTier = iota // new, unreviewed
	TierVerified                   // usage-tested and quality-gated
	TierVendor                     // published from a vendor's own repository
	TierOfficial                   // first-party skyboy
)

// tierNames indexes TrustTier for display. The string labels match the badge
// vocabulary the site and CLI already render.
var tierNames = [...]string{"community", "verified", "vendor", "official"}

func (t TrustTier) String() string {
	if int(t) < 0 || int(t) >= len(tierNames) {
		return "community"
	}
	return tierNames[t]
}

// criteriaMinQuality is the lint score a skill must reach to be promoted from
// community to verified. Set at the "solid" bar: a clear trigger, scoped body,
// resolving links, and an in-budget body.
const criteriaMinQuality = 7

// criteriaMinInvocations is the recorded-invocation floor for verified. The
// point of the tier is that someone actually ran it; a handful of successes is
// the weakest honest evidence of that.
const criteriaMinInvocations = 5

// criteriaMinSuccessRate is the success-rate floor for verified. Deliberately
// generous — a skill that succeeds most of the time is working; one below this
// is failing often enough that "verified" would mislead.
const criteriaMinSuccessRate = 0.8

// criteriaMinVerificationAge caps staleness: a skill verified against an agent
// surface two years ago is not verified against today's. Reuses the same
// threshold the staleness flag uses so the two never disagree in the UI.
const criteriaMinVerificationAge = staleAfterDays

// TrustAssessment is the computed standing of one skill.
type TrustAssessment struct {
	Tier   TrustTier `json:"tier"`
	Badge  string    `json:"badge"`  // the display label (== Tier.String())
	Reason string    `json:"reason"` // why it holds this tier
	// Next is the tier above, and Missing lists what the skill needs to reach
	// it. Empty at the top of the ladder.
	Next    string   `json:"next,omitempty"`
	Missing []string `json:"missing,omitempty"`
}

// trustFor computes a skill's tier. quality is the lint score (0-10) and eff is
// its recorded invocation evidence; both are optional — a nil quality or absent
// telemetry simply means the verified rung cannot be satisfied yet, which is
// the honest answer rather than a pass.
func trustFor(rec SkillRecord, quality *QualityReport, eff Effectiveness) TrustAssessment {
	// The top two tiers come from provenance, not from measurement.
	switch rec.O {
	case OriginSkyboy:
		return TrustAssessment{
			Tier:   TierOfficial,
			Badge:  TierOfficial.String(),
			Reason: "first-party skyboy skill",
		}
	case OriginVendor:
		// Provenance outranks measurement: a vendor publishing from its own
		// repository stands behind the content whether or not it has been
		// usage-tested. What it is missing is the verified rung's evidence,
		// which the author can see here and supply.
		missing := []string{}
		q := 0
		if quality != nil {
			q = quality.Score
		}
		if q < criteriaMinQuality {
			missing = append(missing, fmt.Sprintf("quality score %d/10 (has %d)", criteriaMinQuality, q))
		}
		if eff.Invocations < criteriaMinInvocations {
			missing = append(missing, fmt.Sprintf("%d recorded invocations (has %d)",
				criteriaMinInvocations, eff.Invocations))
		} else if r := eff.Successes; float64(r)/float64(eff.Invocations) < criteriaMinSuccessRate {
			missing = append(missing, fmt.Sprintf("%.0f%% success rate (has %.0f%%)",
				criteriaMinSuccessRate*100, float64(r)/float64(eff.Invocations)*100))
		}
		if rec.LV == "" {
			missing = append(missing, "a last_verified date")
		} else if isStale(rec.LV) {
			missing = append(missing, fmt.Sprintf("re-verification (last_verified %s is over %d days old)", rec.LV, criteriaMinVerificationAge))
		}
		return TrustAssessment{
			Tier:    TierVendor,
			Badge:   TierVendor.String(),
			Reason:  "published from the vendor's own repository",
			Next:    TierOfficial.String(),
			Missing: missing,
		}
	}

	// Community and verified are the measured rungs.
	q := 0
	if quality != nil {
		q = quality.Score
	}
	var missing []string
	if q < criteriaMinQuality {
		missing = append(missing, fmt.Sprintf("quality score %d/10 (has %d)", criteriaMinQuality, q))
	}
	if eff.Invocations < criteriaMinInvocations {
		missing = append(missing, fmt.Sprintf("%d recorded invocations (has %d)",
			criteriaMinInvocations, eff.Invocations))
	} else if r := eff.Successes; float64(r)/float64(eff.Invocations) < criteriaMinSuccessRate {
		missing = append(missing, fmt.Sprintf("%.0f%% success rate (has %.0f%%)",
			criteriaMinSuccessRate*100, float64(r)/float64(eff.Invocations)*100))
	}
	if rec.LV == "" {
		missing = append(missing, "a last_verified date")
	} else if isStale(rec.LV) {
		missing = append(missing, fmt.Sprintf("re-verification (last_verified %s is over %d days old)", rec.LV, criteriaMinVerificationAge))
	}

	if len(missing) == 0 {
		return TrustAssessment{
			Tier:   TierVerified,
			Badge:  TierVerified.String(),
			Reason: fmt.Sprintf("usage-tested: %d invocation(s), %.0f%% success, quality %d/10",
				eff.Invocations, float64(eff.Successes)/float64(eff.Invocations)*100, q),
			Next: TierVendor.String(),
			Missing: []string{"publication from a vendor repository (vendor-authored skills are promoted on provenance)"},
		}
	}
	return TrustAssessment{
		Tier:    TierCommunity,
		Badge:   TierCommunity.String(),
		Reason:  "new skill, not yet promoted",
		Next:    TierVerified.String(),
		Missing: missing,
	}
}

// trustLadder renders the promotion criteria as the published policy text both
// `skyboy trust` and the site's trust section show. Kept as one function so the
// CLI and the docs cannot drift apart.
func trustLadder() string {
	var b strings.Builder
	b.WriteString("Skyboy trust tiers (weakest to strongest)\n\n")
	b.WriteString("  community  New skill. Published, validated for correctness, but not\n")
	b.WriteString("             reviewed for quality and not usage-tested.\n\n")
	b.WriteString("  verified   Usage-tested. Promotion criteria, all required:\n")
	b.WriteString(fmt.Sprintf("               • quality score ≥ %d/10 from `skyboy lint`\n", criteriaMinQuality))
	b.WriteString(fmt.Sprintf("               • ≥ %d recorded invocations\n", criteriaMinInvocations))
	b.WriteString(fmt.Sprintf("               • ≥ %.0f%% success rate over those invocations\n", criteriaMinSuccessRate*100))
	b.WriteString(fmt.Sprintf("               • a last_verified date within %d days\n\n", criteriaMinVerificationAge))
	b.WriteString("  vendor     Published from the vendor's own repository. Promoted on\n")
	b.WriteString("             provenance: the vendor stands behind the content.\n\n")
	b.WriteString("  official   First-party skyboy skill.\n\n")
	b.WriteString("The tier is derived from `origin`, the review flag, the lint score, and\n")
	b.WriteString("invocation telemetry — never hand-set. Run `skyboy trust <name>` to see a\n")
	b.WriteString("skill's standing and what it needs for the next rung.\n")
	return b.String()
}

// trustIssue is the lint finding for a skill that has clear headroom to
// promote: it is reported only when every blocking criterion is a quality
// problem the author can fix, so lint never nags about telemetry it cannot
// control.
func trustIssue(rec SkillRecord, quality *QualityReport, eff Effectiveness) string {
	if rec.O != OriginCommunity || rec.Y {
		return ""
	}
	if quality == nil || quality.Score >= criteriaMinQuality {
		return ""
	}
	return fmt.Sprintf("trust: community tier, %d/%d quality — reach %d/10 to qualify for verified",
		quality.Score, 10, criteriaMinQuality)
}
