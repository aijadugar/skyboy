package main

// cliVersion is the binary's version string, shown by `skyboy version`, the
// `--version` banner, and the MCP serverInfo handshake. Overridable at link
// time (release builds: -ldflags "-X main.cliVersion=v1.2.3"); this default
// keeps dev builds honest about what they are.
var cliVersion = "0.1.0-dev"
