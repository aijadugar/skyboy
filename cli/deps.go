package main

// deps.go: dependency resolution for `skyboy add`.
//
// A skill can declare `dependencies` in skill.json — other skills it builds on.
// Without resolution the user installs half a workflow and finds out later, in
// the agent, when the missing half's instructions are absent. Resolution is
// transitive (a dependency's dependencies come too), ordered (dependencies
// install before the skills that need them), and cycle-safe.
//
// A dependency that is not in the catalog is reported, not fatal: the requested
// skill still installs, and the user is told exactly what is missing so they can
// decide. Blocking the install would make one stale `dependencies` entry in a
// third-party skill break an unrelated one.

import (
	"fmt"
	"sort"
)

// maxDependencyDepth bounds the walk. A skill graph deeper than this is a
// mistake (or a cycle that dodged the visited check through aliasing), and
// stopping is better than recursing until the stack ends.
const maxDependencyDepth = 16

// dependencyPlan is the outcome of expanding a requested name list.
type dependencyPlan struct {
	// Install is the dependency-first order, deduplicated across every
	// requested name.
	Install []SkillRecord
	// Required lists the ids that were pulled in as dependencies rather than
	// named on the command line, so the caller can label them as such.
	Required []string
	// Warnings are non-fatal problems: an unknown dependency id, or a cycle.
	Warnings []string
}

// planDependencies expands names into a dependency-first install order. The
// requested skills always come last, in the order the user asked for them.
func planDependencies(manifest *CatalogManifest, names []string) *dependencyPlan {
	plan := &dependencyPlan{}
	seen := map[string]bool{}
	isDirect := map[string]bool{}

	var warnings []string
	var visit func(id string, depth int, stack map[string]bool, direct bool)

	visit = func(id string, depth int, stack map[string]bool, direct bool) {
		if seen[id] {
			return
		}
		if depth > maxDependencyDepth {
			warnings = append(warnings, fmt.Sprintf("%s: dependency chain deeper than %d; not following it further", id, maxDependencyDepth))
			return
		}
		rec := catalogSkillLookup(manifest, id)
		if rec == nil {
			// Only a dependency can be missing here (the direct names were
			// validated by the caller), so this is an authoring problem in the
			// skill that declared it, not a bad user request.
			warnings = append(warnings, fmt.Sprintf("dependency %q is not in the catalog and was skipped", id))
			return
		}
		if stack[id] {
			// A cycle: report once, from the entry point that closed it.
			warnings = append(warnings, fmt.Sprintf("dependency cycle detected at %s; installing it once", id))
			return
		}

		stack[id] = true
		deps := append([]string(nil), rec.DP...)
		sort.Strings(deps) // deterministic install order for a stable plan
		for _, dep := range deps {
			visit(dep, depth+1, stack, false)
		}
		delete(stack, id)

		seen[id] = true
		isDirect[id] = direct
		plan.Install = append(plan.Install, *rec)
	}

	for _, name := range names {
		visit(name, 0, map[string]bool{}, true)
	}

	for _, r := range plan.Install {
		if !isDirect[r.ID] {
			plan.Required = append(plan.Required, r.ID)
		}
	}
	plan.Warnings = warnings
	return plan
}
