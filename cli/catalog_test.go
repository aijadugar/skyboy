// Tests for the pure catalog logic: search scoring, resolution, record
// helpers, and id validation. These mirror the invariants the web app's TS
// implementation upholds; keeping them in sync is what "port 1:1" means here.

package main

import "testing"

func testSkills() []SkillRecord {
	return []SkillRecord{
		{ID: "nextjs-app-router-conventions", D: "Use when scaffolding or reviewing Next.js App Router projects.", C: "coding", T: []string{"nextjs", "app-router", "react"}, A: []string{"claude-code", "cursor"}, V: "1.0.0", H: "aa01598edd56d747", O: OriginSkyboy, Y: false, P: "skills/coding/nextjs-app-router-conventions"},
		{ID: "anti-slop-landing", D: "Landing pages that avoid generic AI output.", C: "frontend-design", T: []string{"landing", "design"}, A: []string{"claude-code"}, V: "1.0.0", H: "bb01598edd56d747", O: OriginSkyboy, Y: true, P: "skills/frontend-design/anti-slop-landing"},
		{ID: "@vercel/nextjs-plugin", D: "Vercel ecosystem plugin: nextjs deployment guidance.", C: "meta", T: []string{"vercel", "nextjs"}, A: []string{"claude-code"}, V: "0.2.0", H: "cc01598edd56d747", O: OriginVendor, Y: false, P: "plugins/vercel/nextjs-plugin"},
	}
}

func TestSkillSlugAndOwner(t *testing.T) {
	if got := skillSlug(SkillRecord{ID: "anti-slop-landing"}); got != "anti-slop-landing" {
		t.Errorf("bare slug: got %q", got)
	}
	if got := skillSlug(SkillRecord{ID: "@vercel/nextjs-plugin"}); got != "nextjs-plugin" {
		t.Errorf("scoped slug: got %q", got)
	}
	if got := skillOwner(SkillRecord{ID: "@vercel/nextjs-plugin"}); got != "vercel" {
		t.Errorf("owner: got %q", got)
	}
	if got := skillOwner(SkillRecord{ID: "anti-slop-landing"}); got != "" {
		t.Errorf("bare owner should be empty, got %q", got)
	}
}

func TestBadgeFor(t *testing.T) {
	cases := []struct {
		o    Origin
		y    bool
		want string
	}{
		{OriginSkyboy, false, "official"},
		{OriginVendor, false, "vendor"},
		{OriginCommunity, true, "verified"},
		{OriginCommunity, false, "community"},
	}
	for _, c := range cases {
		if got := badgeFor(SkillRecord{O: c.o, Y: c.y}); got != c.want {
			t.Errorf("badgeFor(%v, %v) = %q, want %q", c.o, c.y, got, c.want)
		}
	}
}

func TestScoreOrdering(t *testing.T) {
	skills := testSkills()
	// Exact scoped id must beat the bare slug.
	scoped := score("@vercel/nextjs-plugin", skills[2])
	slug := score("nextjs-plugin", skills[2])
	if scoped != 1.0 || slug != 0.97 {
		t.Errorf("exact scores: scoped=%v slug=%v", scoped, slug)
	}
	// Prefix chain: id prefix > slug prefix.
	if got := score("nextjs-app", skills[0]); got != 0.92 {
		t.Errorf("id prefix score = %v, want 0.92", got)
	}
	if got := score("anti-slop", skills[1]); got != 0.88 {
		t.Errorf("slug prefix score = %v, want 0.88", got)
	}
	// No match scores zero.
	if got := score("kubernetes-helm", skills[0]); got != 0 {
		t.Errorf("unrelated query scored %v, want 0", got)
	}
}

func TestSearchFiltersAndLimit(t *testing.T) {
	skills := testSkills()

	// Category filter.
	got := searchSkills(skills, "", searchOptions{category: "coding"})
	if len(got) != 1 || got[0].ID != "nextjs-app-router-conventions" {
		t.Errorf("category filter returned %+v", got)
	}

	// Agent filter (substring match).
	got = searchSkills(skills, "", searchOptions{agent: "cursor"})
	if len(got) != 1 || got[0].ID != "nextjs-app-router-conventions" {
		t.Errorf("agent filter returned %+v", got)
	}

	// Ranked search: "nextjs" should surface both nextjs-tagged records.
	got = searchSkills(skills, "nextjs", searchOptions{})
	if len(got) != 2 {
		t.Fatalf("nextjs search returned %d results, want 2", len(got))
	}
	// The exact-id prefix (0.92) outranks the tag-token overlap.
	if got[0].ID != "nextjs-app-router-conventions" {
		t.Errorf("top hit = %s, want nextjs-app-router-conventions", got[0].ID)
	}
}

func TestResolveExactAndFuzzy(t *testing.T) {
	skills := testSkills()

	// Exact id.
	if r := resolve("nextjs-app-router-conventions", skills); r == nil || !r.exact || r.slug != "nextjs-app-router-conventions" {
		t.Errorf("exact resolve failed: %+v", r)
	}
	// Exact bare slug for a scoped id.
	if r := resolve("nextjs-plugin", skills); r == nil || !r.exact || r.slug != "@vercel/nextjs-plugin" {
		t.Errorf("scoped slug resolve failed: %+v", r)
	}
	// Leading-segment fuzzy hit ("nextjs" is a whole leading segment).
	r := resolve("nextjs", skills)
	if r == nil || r.exact || r.slug == "" {
		t.Fatalf("fuzzy resolve failed: %+v", r)
	}
	if r.score < 0.4 {
		t.Errorf("fuzzy score %v below sanity bar", r.score)
	}
	// A typo with no similarity must not resolve.
	if r := resolve("zzzzzzzz", skills); r != nil {
		t.Errorf("gibberish resolved to %+v", r)
	}
}

func TestSafeID(t *testing.T) {
	for _, ok := range []string{"nextjs-app-router-conventions", "@vercel/nextjs-plugin", "copy_self.audit-1"} {
		if err := safeID(ok); err != nil {
			t.Errorf("safeID(%q) = %v, want nil", ok, err)
		}
	}
	for _, bad := range []string{"", "@broken", "has space", "../etc", "a/b"} {
		if err := safeID(bad); err == nil {
			t.Errorf("safeID(%q) = nil, want error", bad)
		}
	}
}

func TestSafeSkillFolderName(t *testing.T) {
	if got := safeSkillFolderName("nextjs-app-router-conventions"); got != "nextjs-app-router-conventions" {
		t.Errorf("plain slug changed: %q", got)
	}
	if got := safeSkillFolderName("../../etc"); got != "----etc" {
		t.Errorf("path escape not neutralized: %q", got)
	}
	if got := safeSkillFolderName(""); got != "skill" {
		t.Errorf("empty slug: %q", got)
	}
}

func TestIsSafeSlug(t *testing.T) {
	if !isSafeSlug("@vercel/nextjs-plugin") {
		t.Error("scoped id should be safe")
	}
	if isSafeSlug("..") || isSafeSlug("a/b") || isSafeSlug(`a\b`) {
		t.Error("escape ids should be rejected")
	}
}

func TestFindUpCatalog(t *testing.T) {
	// The test binary runs inside cli/, which has no catalog.json; walking up
	// should find the repo root copy.
	got := findUpCatalog(".")
	if got == "" {
		t.Fatal("findUpCatalog failed to locate the repo-root catalog.json")
	}
}

func TestNormID(t *testing.T) {
	if got := normID("  NextJS App Router! "); got != "nextjs-app-router" {
		t.Errorf("normID = %q", got)
	}
	if got := normID("@Vercel/NextJS-Plugin"); got != "@vercel/nextjs-plugin" {
		t.Errorf("normID scoped = %q", got)
	}
}
