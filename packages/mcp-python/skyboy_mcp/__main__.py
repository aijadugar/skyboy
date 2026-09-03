"""skyboy-mcp: thin PyPI wrapper around the Skyboy MCP server (npm core).

The full Skyboy MCP server is implemented once in TypeScript
(`@skyboy/mcp-server` under packages/mcp) and published on npm. Python-side
users get the same core by running it with npx. This wrapper is a thin shim: it
checks that Node.js is present, then hands off to `npx -y @skyboy/mcp-server`.

Node-at-runtime requirement
---------------------------
This package shells out to `npx`, so Node.js must be on PATH. It does not ship a
pure-Python MCP implementation. For a Python-native server, install the npm
package directly:

    npm install -g @skyboy/mcp-server

or run via npx (which this wrapper does):
"""

import shutil
import subprocess
import sys


def main(argv=None):
    if shutil.which("node") is None:
        print(
            "skyboy-mcp: Node.js is required at runtime. This PyPI package is a "
            "thin wrapper that runs the Skyboy MCP server via npx; install Node "
            "first (https://nodejs.org) or use the npm package directly:\n"
            "    npm install -g @skyboy/mcp-server",
            file=sys.stderr,
        )
        return 1
    # Hand off to the npm core. `-y` avoids the interactive npx install prompt.
    return subprocess.call(["npx", "-y", "@skyboy/mcp-server"] + (list(argv) if argv else []))


if __name__ == "__main__":
    sys.exit(main())
