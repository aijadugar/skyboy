package main

// Compact v2 catalog records, mirroring apps/web/src/server/catalog/types.ts
// and the shape scripts/export-catalog.ts writes into catalog.json
// (docs/skill-spec.md section 6). Short keys keep catalog.json small at
// six-figure skill counts. Everything not displayable lives in the per-skill
// meta.json shard, fetched on demand.

import (
	"fmt"
	"net/url"
	"strings"
)

const (
	repo       = "aijadugar/skyboy"
	rawBase    = "https://raw.githubusercontent.com/" + repo + "/main"
	apiBase    = "https://api.github.com/repos/" + repo + "/contents"
	githubBlame = "https://github.com/" + repo + "/blob/main"
)

// Origin encodes who published a skill; Verified is the review flag. The
// displayed badge is derived from these two (spec section 4), never stored.
type Origin string

const (
	OriginSkyboy    Origin = "skyboy"
	OriginVendor    Origin = "vendor"
	OriginCommunity Origin = "community"
)

// SkillRecord is the compact v2 index record.
type SkillRecord struct {
	ID   string `json:"id"`            // bare slug (skyboy) or @owner/slug (vendor/community)
	D    string `json:"d"`             // description, the 160-char display line
	C    string `json:"c"`             // category
	T    []string `json:"t"`           // tags
	A    []string `json:"a"`           // compatible agents
	V    string `json:"v"`             // version
	H    string `json:"h"`             // 16-hex sha256 prefix over the folder contents
	O    Origin `json:"o"`             // skyboy | vendor | community
	Y    bool   `json:"y"`             // verified
	P    string `json:"p"`             // repo-relative folder path

	// Additive computed fields (omitempty keeps old consumers working and
	// keeps catalog.json small when a value is absent).
	RD string   `json:"rd,omitempty"` // router description: always-loaded tier, <50 tokens
	TK int      `json:"tk,omitempty"` // estimated token cost of the full SKILL.md
	Q  int      `json:"q,omitempty"`  // quality score 0-10, from skyboy lint
	LV string   `json:"lv,omitempty"` // last_verified ISO date from skill.json
	DP []string `json:"dp,omitempty"` // dependencies (skill ids), from skill.json

	// Ranking + trust signals, all derived at ingest (never authored):
	TR string  `json:"tr,omitempty"` // trust tier: community|verified|vendor|official
	EF float64 `json:"ef,omitempty"` // effectiveness rank 0-1 from invocation telemetry
	DU string  `json:"du,omitempty"` // id of the canonical skill this one duplicates
}

// skillSlug returns the slug part of an id: "x" for bare, "slug" for
// @owner/slug. Mirrors skillSlug() in the web app.
func skillSlug(r SkillRecord) string {
	if i := strings.Index(r.ID, "/"); i >= 0 {
		return r.ID[i+1:]
	}
	return r.ID
}

// skillOwner returns the @owner part of a scoped id, or "" for bare slugs.
func skillOwner(r SkillRecord) string {
	if strings.HasPrefix(r.ID, "@") {
		return r.ID[1:strings.Index(r.ID, "/")]
	}
	return ""
}

// badgeFor derives the display badge from origin + verified (spec section 4).
func badgeFor(r SkillRecord) string {
	switch r.O {
	case OriginSkyboy:
		return "official"
	case OriginVendor:
		return "vendor"
	default:
		if r.Y {
			return "verified"
		}
		return "community"
	}
}

// Permissions is the machine-generated disclosure block (spec section 12.1).
type Permissions struct {
	Network                      bool     `json:"network"`
	FilesystemWriteOutsideTarget bool     `json:"filesystem_write_outside_target"`
	ShellExec                    bool     `json:"shell_exec"`
	EnvRead                      []string `json:"env_read"`
}

// SkillMetaShard is the per-skill meta.json: everything the index record
// leaves out, fetchable from the raw URL when a consumer needs full detail.
type SkillMetaShard struct {
	ID               string       `json:"id"`
	Slug             string       `json:"slug"`
	Description      string       `json:"description"`
	Category         string       `json:"category"`
	Tags             []string     `json:"tags"`
	CompatibleAgents []string     `json:"compatible_agents"`
	Version          string       `json:"version"`
	License          string       `json:"license"`
	Author           string       `json:"author"`
	Origin           Origin       `json:"origin"`
	Verified         bool         `json:"verified"`
	UpstreamRepo     *string      `json:"upstream_repo"`
	CanonicalOf      *string      `json:"canonical_of"`
	Permissions      *Permissions `json:"permissions"`
	Frontmatter      struct {
		Name    *string `json:"name"`
		License *string `json:"license"`
	} `json:"frontmatter"`
	Hash       string `json:"hash"`
	Path       string `json:"path"`
	SkillMDURL string `json:"skill_md_url"`

	// Computed at ingest by build-catalog (never hand-authored):
	TokenCost         int                    `json:"token_cost,omitempty"`
	RouterDescription string                 `json:"router_description,omitempty"`
	Quality           *QualityReport         `json:"quality,omitempty"`
	LastVerified      string                 `json:"last_verified,omitempty"`
	Stale             bool                   `json:"stale,omitempty"`
	Dependencies      []string               `json:"dependencies,omitempty"`
	Compatibility     map[string]CompatEntry `json:"compatibility,omitempty"`
	DupOf             string                 `json:"dup_of,omitempty"`
	DupSimilarity     float64                `json:"dup_similarity,omitempty"`

	// Trust standing + its stated criteria (trust.go). Trust is the derived
	// tier; Next/Missing publish exactly what the next rung requires.
	Trust      string   `json:"trust,omitempty"`
	TrustReason string  `json:"trust_reason,omitempty"`
	TrustNext  string   `json:"trust_next,omitempty"`
	TrustMissing []string `json:"trust_missing,omitempty"`

	// Effectiveness is the invocation-telemetry standing (telemetry.go).
	Effectiveness *Effectiveness `json:"effectiveness,omitempty"`
}

// QualityReport is the lint-derived breakdown stored in the shard and shown
// on the skill page ("Token Efficiency"/quality section).
type QualityReport struct {
	Score          int      `json:"score"`           // rounded 0-10 total
	TriggerClarity float64  `json:"trigger_clarity"` // 0-2.5
	Scope          float64  `json:"scope"`           // 0-2.5
	Links          float64  `json:"links"`           // 0-2.5
	TokenBudget    float64  `json:"token_budget"`    // 0-2.5
	Issues         []string `json:"issues,omitempty"`
}

// CompatEntry is one agent's tested state in the compatibility matrix.
type CompatEntry struct {
	ToolSurface string `json:"tool_surface,omitempty"` // e.g. "mcp-2025-06"; empty = untested
	Notes       string `json:"notes,omitempty"`
}

// Agent is one compatible agent target in the manifest.
type Agent struct {
	Name string `json:"name"`
	Note string `json:"note"`
}

// CatalogManifest is the shared catalog.json shape.
type CatalogManifest struct {
	GeneratedAt string        `json:"generatedAt"`
	Version     int           `json:"version"`
	Categories  []string      `json:"categories"`
	Agents      []Agent       `json:"agents"`
	Skills      []SkillRecord `json:"skills"`
}

// skillMarkdownURL is the raw SKILL.md URL for a record (preview / one-off fetch).
func skillMarkdownURL(r SkillRecord) string {
	return rawBase + "/" + r.P + "/SKILL.md"
}

func skillMetaURL(r SkillRecord) string {
	return rawBase + "/" + r.P + "/meta.json"
}

// ghFileURL turns a repo-relative path into a raw download URL. Paths coming
// from the GitHub contents API are already repo-relative; escape each segment
// so spaces and unicode file names survive the round trip.
func ghFileURL(repoPath string) string {
	segs := strings.Split(repoPath, "/")
	for i, s := range segs {
		segs[i] = url.PathEscape(s)
	}
	return rawBase + "/" + strings.Join(segs, "/")
}

// safeID accepts bare slugs and scoped ids (@owner/slug) and rejects
// everything else. Same regex contract as the web MCP tools (safeId()).
func safeID(id string) error {
	if len(id) == 0 {
		return fmt.Errorf("invalid skill id: %q", id)
	}
	if strings.HasPrefix(id, "@") {
		rest := id[1:]
		owner, slug, ok := strings.Cut(rest, "/")
		if !ok || owner == "" || slug == "" {
			return fmt.Errorf("invalid skill id: %q", id)
		}
		if !isPlainToken(owner) || !isPlainToken(slug) {
			return fmt.Errorf("invalid skill id: %q", id)
		}
		return nil
	}
	if !isPlainToken(id) {
		return fmt.Errorf("invalid skill id: %q", id)
	}
	return nil
}

// isPlainToken matches [a-zA-Z0-9._-]+ (and the scoped-slug variant allows a
// trailing version-ish segment, same as the TS character class).
func isPlainToken(s string) bool {
	if s == "" {
		return false
	}
	for _, c := range s {
		switch {
		case c >= 'a' && c <= 'z':
		case c >= 'A' && c <= 'Z':
		case c >= '0' && c <= '9':
		case c == '.' || c == '_' || c == '-':
		default:
			return false
		}
	}
	return true
}

// safeSkillFolderName derives the install folder name from a slug with a guard
// against path escape. Same as the TS safeSkillFolderName().
func safeSkillFolderName(slug string) string {
	var b strings.Builder
	for _, c := range slug {
		switch {
		case c >= 'a' && c <= 'z':
		case c >= 'A' && c <= 'Z':
		case c >= '0' && c <= '9':
		case c == '.' || c == '_' || c == '-':
		default:
			b.WriteRune('-')
			continue
		}
		b.WriteRune(c)
	}
	name := b.String()
	if name == "" {
		return "skill"
	}
	return name
}

// installDirName derives a plain install directory name without fetching anything.
func installDirName(id string) string {
	return safeSkillFolderName(skillSlug(SkillRecord{ID: id}))
}

// isSafeSlug guards so an id can never produce a path that escapes the target.
// Scoped ids are fine: only the slug part becomes the folder name.
func isSafeSlug(slug string) bool {
	bare := slug
	if i := strings.Index(slug, "/"); i >= 0 && strings.HasPrefix(slug, "@") {
		bare = slug[i+1:]
	}
	return !strings.Contains(bare, "/") && !strings.Contains(bare, "\\") &&
		bare != ".." && bare != "."
}
