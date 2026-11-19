# Security Policy

## What this repository is

This repository is the **website at [skyboy.in](https://skyboy.in)**, a Next.js
application in `apps/web`.

The **desktop app** and the **hook helper** that will connect it to Claude Code and
Codex are **planned, not built**. They are not in this repository yet, so there is
nothing of theirs to attack today. This policy will be extended when they exist.

## Reporting a vulnerability

Report it privately through GitHub's private vulnerability reporting:

**<https://github.com/aijadugar/skyboy/security/advisories/new>**

Please do not open a public issue for anything you believe is exploitable, and do not
discuss it publicly before it is fixed.

### What to include

- What an attacker could do with it, and who it affects.
- Where it lives: the page or URL, the browser and operating system you used.
- Steps to reproduce, as precisely as you can make them. A request and its response
  is better than a description of one.
- Whether you have told anyone else, or disclosed it anywhere.
- How you would like to be credited, or that you would rather not be.

## What to expect

- An acknowledgement **within 7 days**.
- A fix, or a status update, **within 30 days**.
- Credit in the release notes when it is fixed, unless you ask us not to.

If a fix takes longer than that, we will say so and keep you informed rather than let
the report go quiet.

## Safe harbour for good-faith research

Security research done in good faith is welcome here. If you stay within the in-scope
list below, avoid touching other people's data, avoid degrading the service for
anyone else, and give us a reasonable chance to fix the problem before you publish,
we will treat your work as authorised and will not report it as abuse.

This is not permission to test against accounts, infrastructure or data that are not
yours. If you are unsure whether something is in scope, ask first through the private
report link above.

## In scope

- **The website**: the pages, client-side code, and the server routes that serve
  them, at `skyboy.in` and its subdomains.
- **Forms and links**: the waitlist and contact flows. They currently open an email
  rather than storing a submission, and the policy is written around that.
- **This repository**: leaked secrets, vulnerable or malicious dependencies, and
  workflow configurations that could be abused through a pull request.
- **Content injection**: anything that lets page content escape into markup, a
  redirect, or a request the user did not intend.

## Out of scope

- Third-party services we do not control: GitHub, the hosting platform, the email
  provider, analytics.
- Denial of service, rate-limit exhaustion, spam, and social engineering.
- Anything that needs physical access to a device, or a device that is already
  compromised.
- Vulnerabilities in Claude Code, Codex, or any other agent Skyboy integrates with.
  Report those to the vendor.
- Automated scanner output with no explanation of impact and no working proof of
  concept.

## Supported versions

Only the current `main` branch of the website is supported. There are no released
desktop builds yet; when there are, this section will say which versions receive
fixes.
