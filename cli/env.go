package main

// Small environment helpers shared by commands.go, mcp.go, and install.go.
// Kept in one place so every network call shares the same client and the
// process-wide cwd/stdout handles stay consistent.

import (
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"os"
)

// cwd is the process working directory, read once. Every install, detection,
// and find-up decision uses it.
func cwd() string {
	dir, err := os.Getwd()
	if err != nil {
		return "."
	}
	return dir
}

// urlValues is a tiny wrapper so commands.go does not import net/url itself.
func urlValues() url.Values {
	return url.Values{}
}

// newRequest builds an http.Request with the shared skyboy user agent.
func newRequest(method, endpoint string) (*http.Request, error) {
	req, err := http.NewRequest(method, endpoint, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "skyboy")
	return req, nil
}

// jsonDecode decodes a JSON stream into v.
func jsonDecode(r io.Reader, v any) error {
	return json.NewDecoder(r).Decode(v)
}
