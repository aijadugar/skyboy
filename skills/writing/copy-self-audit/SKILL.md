---
name: copy-self-audit
description: Use before shipping any user-facing copy. Re-reads every visible string for AI-slop tells - fake-cute phrases, unclear referents, hallucinated precision, forced metaphors - and rewrites them as plain, functional, human copy. Complements a landing-page or docs build.
license: MIT
compatible_agents: claude-code, claude-desktop, cursor, gemini-cli
---

# Copy Self-Audit

Use this at the end of writing any page, post, email, or docs update - right before
you call it "done". It exists because an LLM writes plausible-sounding copy faster
than it checks whether the copy actually means anything. This skill forces that
check.

## When to apply

- You just wrote a landing page, a feature description, an announce post, or a
  chunk of product copy.
- You are about to PR a docs change or a marketing string.
- You've been asked to "make the copy better" and the instinct is to make it more
  clever.

Skip it for a one-word label, a navigation item, or a string you're knowingly
keeping as a placeholder.

---

## The audit pass

Re-read **every** visible string: headlines, subheads, eyebrows, button labels,
body copy, captions, alt text, footer text, error / empty / loading states. Flag
any string that falls into one of these buckets.

### 1. Grammar broken

A sentence that doesn't parse. "Free on its past." "Two plans but one is honest."
Read it aloud. If you can't say it naturally, it's broken - rewrite it plainly.

**Fix:** rewrite as the literal functional statement. Boring-but-correct beats
cute-and-broken.

### 2. Unclear referents

A pronoun with no antecedent, or a claim that needs context it doesn't have.
"We plan to stay that way." Which way? "This is why we did that." What's "this"?

**Fix:** name the thing. "We keep the free plan free." "Here is why we built it this
way."

### 3. AI hallucination

Cute-but-wrong wordplay, forced metaphors that don't track, "elegant nothing"
phrases. "The honest table." "Quietly in use at." "We respect the French ones."
These read as an LLM trying to sound thoughtful.

**Fix:** delete the flourish. If a section describes a table, call it a table.

### 4. Pretend-precision

Fake-precise numbers that imply measurement when there is none. 92%, 4.1x, 48k,
5.8mm, 13.4 lb. Either these come from real data (the brief, brand guidelines,
public metrics) or they are explicitly labeled as mock. Invented engineering
precision is worse than no number.

**Fix:** use a real number, a labeled example, or drop the claim.

### 5. Register mismatch

Mixing registers in one composition - technical mono ("47 tasks, 0.6 ctx
switches/day"), editorial prose, and marketing punch in the same paragraph. A page
has one voice.

**Fix:** pick a register. If the section is technical, keep the technical voice.
Don't let a product spec drift into pep talk.

### 6. Em-dash crutch (hard rule)

The `—` character is banned in visible copy. Use a period, comma, colon, or
parentheses. The en-dash `–` is also banned as a separator (use a hyphen for
ranges: `2018-2026`, `EUR 40-80k`). A single em-dash anywhere = the copy fails.

**Fix:** restructure the sentence. "The tool is fast - it also crashes." becomes
"The tool is fast, but it also crashes." (and that's a hyphen, not a dash - or
better, just use a comma).

## After the audit

For every flagged string, either rewrite it inline or replace it with a plain
functional sentence. Do not ship a flagged string and "fix it later". If a string
survives only because you're unsure it makes sense, replace it - a plain sentence
is never worse than a confusing one.

## Final check

- [ ] Every visible string re-read, including alt text and empty/loading states.
- [ ] No fake-cute or metaphor-heavy phrasing.
- [ ] No pretend-precise numbers (unless real or labeled mock).
- [ ] One copy register for the whole composition.
- [ ] Zero em-dashes or en-dashes-as-separators.
- [ ] Every CTA label is the primary action, short, and on one line.
