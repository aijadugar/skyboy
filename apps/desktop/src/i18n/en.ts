/**
 * The English strings.
 *
 * One flat object rather than nested namespaces: the interface is small, a flat
 * key is easier to grep for, and `StringKey` is then exactly the set of keys
 * that exist, so a typo is a compile error.
 *
 * `{name}` placeholders are substituted by `t()`.
 */
export const en = {
  "app.name": "Skyboy",
  "app.tagline": "Know the moment your agent is done.",

  "nav.sessions": "Sessions",
  "nav.alerts": "Alerts",
  "nav.sounds": "Sounds",
  "nav.settings": "Settings",

  "action.close": "Close",
  "action.cancel": "Cancel",
  "action.save": "Save",
  "action.copy": "Copy",
  "action.copied": "Copied",
  "action.done": "Done",
  "action.enable": "Enable",
  "action.disable": "Disable",
  "action.refresh": "Refresh",
  "action.clear": "Clear",
  "action.restore": "Restore",
  "action.preview": "Preview",
  "action.stop": "Stop",
  "action.hideToTray": "Hide to tray",
  "action.testAlert": "Test alert",
  "action.acknowledgeAll": "Mark all as read",

  "sessions.title": "Sessions",
  "sessions.subtitle": "Every session Skyboy has heard from, newest first.",
  "sessions.empty": "No sessions yet.",
  "sessions.emptyHint":
    "Enable an agent in Settings, then start a session. Skyboy listens for the moments your agent finishes, needs permission, or needs an answer.",
  "sessions.waiting": "Waiting for you",
  "sessions.events": "{count} event",
  "sessions.eventsPlural": "{count} events",
  "sessions.acknowledge": "Mark as read",
  "sessions.clear": "Clear list",

  "alerts.title": "Alerts",
  "alerts.subtitle": "How Skyboy gets your attention, and for which moments.",
  "alerts.paused": "Alerts are paused",
  "alerts.pausedHint": "Nothing will ring or notify until you resume.",
  "alerts.resume": "Resume alerts",
  "alerts.pause": "Pause alerts",
  "alerts.defaults": "Defaults",
  "alerts.defaultsHint": "What every agent and every moment starts from.",
  "alerts.perAgent": "Per agent",
  "alerts.perEvent": "Per moment",
  "alerts.precedence":
    "A per-moment setting beats a per-agent setting, which beats the defaults. Anything you leave on “inherit” follows the layer below it.",
  "alerts.inherit": "Inherit",
  "alerts.override": "Override",
  "alerts.desktopNotification": "Desktop notification",
  "alerts.sound": "Sound",
  "alerts.soundChoice": "Sound",
  "alerts.repeatingRing": "Repeat until I answer",
  "alerts.ringInterval": "Repeat every",
  "alerts.ringDuration": "Stop after",
  "alerts.ringSummary": "{summary}",
  "alerts.resolved": "Right now this moment would: {outcome}",
  "alerts.outcomeBoth": "notify you and play a sound",
  "alerts.outcomeNotify": "notify you, silently",
  "alerts.outcomeSound": "play a sound, without a notification",
  "alerts.outcomeNeither": "stay silent",

  "sounds.title": "Sounds",
  "sounds.subtitle": "Preview the built-in sounds before you commit to one.",
  "sounds.none": "No sound",
  "sounds.default": "Default",
  "sounds.playing": "Playing",

  "settings.title": "Settings",
  "settings.general": "General",
  "settings.system": "System",
  "settings.notifications": "Notifications",
  "settings.integrations": "Integrations",
  "settings.account": "Account",
  "settings.dataAndPrivacy": "Data and Privacy",

  "general.theme": "Theme",
  "general.themeSystem": "Match the system",
  "general.themeLight": "Light",
  "general.themeDark": "Dark",
  "general.launchAtLogin": "Start Skyboy when I log in",
  "general.startMinimised": "Start with only the tray icon",
  "general.historyLimit": "Keep this many events in the history",
  "general.language": "Language",
  "general.languageEnglish": "English",

  "notifications.desktop": "Show a desktop notification",
  "notifications.desktopHint":
    "The operating system asks for permission the first time. If you refuse it, sounds still work.",
  "notifications.test": "Send a test alert",
  "notifications.testHint": "Uses your current settings. Nothing is recorded in the history.",

  "integrations.title": "Integrations",
  "integrations.subtitle":
    "Skyboy adds itself to each agent's configuration file. Your existing settings and hooks are kept, the file is backed up first, and turning an agent off removes only Skyboy's entries.",
  "integrations.whatEachReports": "What each agent can report",
  "integrations.supports": "Reports this",
  "integrations.doesNotSupport": "Cannot report this",
  "integrations.backups": "Configuration backups",
  "integrations.noBackups": "No backups yet. One is taken the first time you enable this agent.",
  "integrations.restore": "Restore",
  "integrations.restoreHint":
    "Restoring puts an older copy back and backs up the current file first, so a restore is itself undoable.",

  "system.diagnostics": "Diagnostics",
  "system.dataDirectory": "Data directory",
  "system.database": "History database",
  "system.logFile": "Log file",
  "system.hookBinary": "Hook binary",
  "system.hookInstalled": "installed",
  "system.hookMissing": "missing",
  "system.endpoint": "Local endpoint",
  "system.endpointPublished": "listening",
  "system.endpointMissing": "not listening",
  "system.version": "Version",
  "system.platform": "Platform",

  "account.placeholder":
    "Signing in is not wired up yet. The real Skyboy account lives at skyboy.in and does not exist, so this is a stand-in that keeps the interface honest about what it can and cannot do.",
  "account.email": "Email address",
  "account.signIn": "Sign in",
  "account.signOut": "Sign out",
  "account.signedInAs": "Signed in as {name}",
  "account.notSignedIn": "Not signed in.",

  "privacy.title": "Data and Privacy",
  "privacy.localFirst":
    "Prompts, code and agent output stay on this computer. Skyboy reads the events your agents hand it and writes them to a local database; nothing is uploaded.",
  "privacy.noNetwork":
    "The desktop app makes no network calls of its own. The only process it runs is the small hook binary your agent invokes, which talks to this app over a local socket and nothing else.",
  "privacy.phonePushLater":
    "Phone push is planned for a later release and will be off by default. When it arrives, this section will say exactly what leaves the machine.",
  "privacy.history": "Event history",
  "privacy.historyCount": "{count} events stored.",
  "privacy.audit": "What Skyboy did",
  "privacy.auditEmpty": "Nothing yet.",
  "privacy.clearHistory": "Clear the event history",
  "privacy.clearHistoryHint":
    "Removes the stored events. Configuration backups are kept, because they are the copy of your agent settings from before Skyboy touched them.",
  "privacy.clearConfirm": "Clear the stored event history? This cannot be undone.",

  "event.finished": "Finished",
  "event.needs_permission": "Needs permission",
  "event.needs_input": "Needs input",
  "event.error": "Error",

  "agent.claude_code": "Claude Code",
  "agent.codex": "Codex",

  "status.notInstalled": "Not enabled",
  "status.installed": "Enabled",
  "status.needsRepair": "Needs attention",
  "status.unavailable": "Not set up",

  "error.generic": "Something went wrong.",
  "error.loadFailed": "Could not load {what}.",
} as const;

export type StringKey = keyof typeof en;
