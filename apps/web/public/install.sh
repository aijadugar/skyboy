#!/bin/sh
# skyboy installer: fetches the right release binary from GitHub Releases and
# puts it on your PATH. curl skyboy.in/install.sh | sh
#
# Windows users: use install.ps1 instead.

set -eu

REPO="aijadugar/skyboy"
INSTALL_DIR="${SKYBOY_INSTALL_DIR:-$HOME/.local/bin}"

# Detect the platform pair.
OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
  Linux) GOOS=linux ;;
  Darwin) GOOS=darwin ;;
  *)
    echo "skyboy install: unsupported OS '$OS'. On Windows use:" >&2
    echo "  irm https://skyboy.in/install.ps1 | iex" >&2
    exit 1
    ;;
esac

case "$ARCH" in
  x86_64|amd64) GOARCH=amd64 ;;
  aarch64|arm64) GOARCH=arm64 ;;
  *)
    echo "skyboy install: unsupported architecture '$ARCH'" >&2
    exit 1
    ;;
esac

# Pick the latest release tag.
if command -v curl >/dev/null 2>&1; then
  FETCH="curl -fsSL"
else
  FETCH="wget -qO-"
fi

TAG="$($FETCH "https://api.github.com/repos/$REPO/releases/latest" | sed -n 's/.*"tag_name": *"\([^"]*\)".*/\1/p' | head -n 1)"
if [ -z "$TAG" ]; then
  echo "skyboy install: could not determine the latest release tag." >&2
  exit 1
fi

URL="https://github.com/$REPO/releases/download/$TAG/skyboy-$GOOS-$GOARCH"
echo "skyboy install: downloading $URL"

mkdir -p "$INSTALL_DIR"
if command -v curl >/dev/null 2>&1; then
  curl -fsSL "$URL" -o "$INSTALL_DIR/skyboy"
else
  wget -qO "$INSTALL_DIR/skyboy" "$URL"
fi
chmod +x "$INSTALL_DIR/skyboy"

case ":$PATH:" in
  *":$INSTALL_DIR:"*) ;;
  *)
    echo "skyboy install: add $INSTALL_DIR to your PATH, e.g.:"
    echo '  export PATH="$HOME/.local/bin:$PATH"'
    ;;
esac

echo "skyboy install: done. Run 'skyboy help' to start."
