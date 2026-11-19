# Skyboy

**Know the moment your coding agent is done, and keep it working while you're away.**

Skyboy is a desktop notifier for AI coding agents, starting with **Claude Code** and **Codex**. It alerts you the way you choose when a task finishes or the agent needs you. It can then send the next prompt from a queue you wrote, so long jobs keep moving without you sitting at the screen.

Website: **https://skyboy.in**

The desktop app is not built yet. This repository's website is the marketing and download site. Items described as planned do not exist yet. How Claude Code and Codex expose events must be checked against their current documentation before the app is implemented.

The earlier site at this address was a directory of AI skills. That product is not Skyboy the notifier, and it is not part of this website.

## Design rules

- **Desktop app only.** Install, open, done. No command line for the user and no browser extension.
- **Local first.** Prompts, code, and agent output stay on your machine unless you turn on phone push.
- **Safe by default.** Automatic prompts are limited, stoppable, and logged.

## Website

The site is marketing and download only. The app runs on the user's computer.

| Page         | Purpose                                                                           |
| ------------ | --------------------------------------------------------------------------------- |
| Home         | What Skyboy does, the download button, a short demo, supported agents             |
| Features     | Alert styles, prompt queue, dashboard, safety controls                            |
| How it works | The hook-based flow in plain language                                             |
| Sounds       | A gallery where visitors can preview the built-in sounds                          |
| Download     | One control per operating system, with version and checksum once a release exists |
| Docs         | Setup for Claude Code and Codex, phone push, troubleshooting                      |
| Changelog    | Release history                                                                   |
| Privacy      | What stays on the computer and what phone push sends                              |
| FAQ          | Short answers                                                                     |
| Contact      | Support and feedback                                                              |

Until the app ships, the download button says **Coming soon** and opens the waitlist. Forms ask only for the fields they need, say why, and link to the privacy page. They open an email to contact@skyboy.in. The site does not store the submission.

Contact: contact@skyboy.in

## What the app will do

Notify on task finished, needs permission, needs input, and error. Alert with a custom sound, a repeating ring, a desktop notification, and optional phone push. A prompt queue sends the next step you wrote, with pause points and step and time limits. The window lists sessions, and a local log records alerts and automatic prompts.

Phone push is off by default. The first path is ntfy with a long random topic. A Skyboy mobile app is planned.

Platforms for the first release: Windows 10/11 and macOS. Linux comes after.

## Run the website

```bash
npm install
npm run dev
```

The Next.js app lives in `apps/web`.

## Working Guidelines

How a change gets merged here.

- **Pull request titles follow [Conventional Commits](https://www.conventionalcommits.org/), with no tool prefix.** Write `fix(web): stop the download button wrapping`, not `[Claude] fix: ...` or `Update file`. CI checks the title and fails the pull request if it does not match.
- **Open pull requests ready for review.** Drafts are fine for work in progress, but a draft is not reviewed and not merged; mark it ready when it is.
- **Every pull request must pass the required `all-checks-pass` status check.** That is the only status check branch protection requires. It aggregates every other job, so a failure anywhere shows up there.

Run the checks locally before pushing:

| Check     | Command                                      | Notes                                                                                                                                                                                                                     |
| --------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build     | `npm run build`                              | Runs `next build`, which type-checks as part of the build.                                                                                                                                                                |
| Typecheck | `npx tsc --noEmit -p apps/web/tsconfig.json` | Faster than a full build when you only want types.                                                                                                                                                                        |
| Format    | `npm run format:check`                       | `npm run format` rewrites the files.                                                                                                                                                                                      |
| Lint      | `npm run lint`                               | **Currently broken.** It runs `next lint`, which Next.js 16 removed, and there is no ESLint config yet. It fails on a clean checkout. ESLint is a separate follow-up; do not treat a lint failure as your change's fault. |

Formatting is Prettier, configured in `.prettierrc.json` to match the code that was
already here: double quotes, semicolons, 100 columns. There is also an optional
pre-commit hook that checks only the files you are committing:

```bash
git config core.hooksPath .githooks
```

It is opt-in, and it skips itself with a message if `npm ci` has not been run. Once
installed, `git commit --no-verify` bypasses it for one commit.

## License

[MIT](LICENSE).
