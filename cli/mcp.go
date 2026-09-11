package main

// The MCP server, one implementation, two transports (Part 6):
//
//   skyboy mcp --transport stdio   JSON-RPC frames over stdin/stdout; hosts
//                                  like Claude Desktop and Cursor spawn it.
//   skyboy mcp --transport http    the same tool surface over HTTP POST on a
//                                  local port; the web app and remote agents
//                                  hit it as a URL.
//
// Hand-rolled JSON-RPC 2.0 (stdlib only, no SDK), protocol version
// 2024-11-05, tools/list and tools/call only, no resources or prompts. All
// responses go to stdout as single-line JSON-RPC frames; all logging goes to
// stderr, which MCP clients treat as diagnostics.
//
// Tool surface (Part 6 names):
//
//   search_catalog(query, category?)   fuzzy search, ranked
//   get_skill(slug)                    SKILL.md body + skill.json metadata, one call
//   get_plugin(slug)                   nested skills/hooks/agents manifest
//   list_categories()                  the dynamic category tree
//   prepare_context_zip(slugs[])       the exact `skyboy zip` bundle logic
//   install_skill(slug, target_dir?)   stdio/full mode only (writes to disk)
//
// prepare_context_zip is transport-sensitive by design: over stdio it writes
// the archive to a temp file and returns the local path; over http it returns
// a signed, expiring download URL served by the same process. The zip bytes
// come from the shared bundle builder in zipbundle.go, never re-implemented.

import (
	"bufio"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// mcpProtocolVersion is the wire protocol version this server speaks.
const mcpProtocolVersion = "2024-11-05"

// maxInlineBodyBytes caps the SKILL.md body inlined by get_skill. Most skills
// are a few KB; this ceiling keeps a pathological skill from blowing an
// agent's context while still inlining the overwhelming majority in one shot.
const maxInlineBodyBytes = 32 * 1024

// maxBundleBytes caps a prepared zip held in memory by the http transport.
const maxBundleBytes = 32 * 1024 * 1024

// signedLinkTTL is how long an http prepare_context_zip download URL stays
// valid. Short on purpose: the agent downloads it now or re-prepares.
const signedLinkTTL = 15 * time.Minute

// rpcRequest is an incoming JSON-RPC 2.0 request or notification.
type rpcRequest struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      *json.Number    `json:"id,omitempty"`
	Method  string          `json:"method"`
	Params  json.RawMessage `json:"params,omitempty"`
}

// rpcError is the JSON-RPC error object.
type rpcError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

// JSON-RPC error codes used here.
const (
	errParse     = -32700
	errInvalidRe = -32600
	errMethodNot = -32601
	errInvalidPa = -32602
	errInternal  = -32603
)

// writeFrame emits one response frame. Notifications (no id) get no response.
func writeFrame(w *bufio.Writer, id *json.Number, result any, rpcErr *rpcError) {
	if id == nil {
		return
	}
	frame := map[string]any{"jsonrpc": "2.0", "id": *id}
	if rpcErr != nil {
		frame["error"] = rpcErr
	} else {
		frame["result"] = result
	}
	data, err := json.Marshal(frame)
	if err != nil {
		data, _ = json.Marshal(map[string]any{
			"jsonrpc": "2.0", "id": *id,
			"error": rpcError{Code: errInternal, Message: "marshal failure"},
		})
	}
	w.Write(data)
	w.WriteByte('\n')
	w.Flush()
}

// textToolResult wraps a JSON payload as the single text content block MCP
// tools return. Same shape as the ok() helper in the TS tools.
func textToolResult(v any) map[string]any {
	data, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		data = []byte(`{"error":"marshal failure"}`)
	}
	return map[string]any{
		"content": []map[string]any{{"type": "text", "text": string(data)}},
	}
}

// toolDef is one entry of the tools/list response.
type toolDef struct {
	Name        string          `json:"name"`
	Description string          `json:"description"`
	InputSchema json.RawMessage `json:"inputSchema"`
}

// toolDefs returns the Part 6 tool surface. mode "full" adds install_skill
// (stdio only); "readonly" is the http/hosted surface. prepare_context_zip is
// available on both: the transport decides whether the result is a local file
// path or a signed download URL.
func toolDefs(mode string) []toolDef {
	strArray := `{"type":"object","properties":{},"additionalProperties":false}`
	defs := []toolDef{
		{
			Name: "search_catalog",
			Description: "Fuzzy-search the skyboy catalog by id, slug, description, or tag. " +
				"Optionally narrow by category. Returns ranked matches with id, description, " +
				"category, tags, version, and badge.",
			InputSchema: json.RawMessage(`{
				"type":"object",
				"properties":{
					"query":{"type":"string","description":"Free-text search query"},
					"category":{"type":"string","description":"Narrow to one category"},
					"limit":{"type":"integer","minimum":1,"maximum":50,"description":"Max results (default 50)"}
				},
				"required":["query"],
				"additionalProperties":false}`),
		},
		{
			Name: "get_skill",
			Description: "Return one skill's full SKILL.md body plus its skill.json metadata " +
				"(category, tags, version, license, author, hash) in a single call, so previewing " +
				"a skill needs no follow-up fetch.",
			InputSchema: json.RawMessage(`{
				"type":"object",
				"properties":{
					"slug":{"type":"string","description":"The skill slug or scoped id (e.g. copy-self-audit or @vendor/slug)"}
				},
				"required":["slug"],
				"additionalProperties":false}`),
		},
		{
			Name: "get_plugin",
			Description: "Return a plugin's manifest with its nested skills, hooks, and agents. " +
				"Plugins are indexed and linked, never vendored: the manifest points at the " +
				"upstream repo as the source of truth.",
			InputSchema: json.RawMessage(`{
				"type":"object",
				"properties":{
					"slug":{"type":"string","description":"The plugin slug (e.g. vercel-plugin)"}
				},
				"required":["slug"],
				"additionalProperties":false}`),
		},
		{
			Name: "list_categories",
			Description: "Return the catalog's dynamic category tree (derived from the skills/ " +
				"tree by build-catalog, never hardcoded) plus the compatible-agent list.",
			InputSchema: json.RawMessage(strArray),
		},
		{
			Name: "prepare_context_zip",
			Description: "Build the same ZIP that `skyboy zip <slugs>` produces: a generated " +
				"_CONTEXT_SUMMARY.md at the archive root plus every skill folder under skills/. " +
				"Accepts a comma-separated mix of skill and plugin slugs in ONE bundle. Plugins are " +
				"indexed into the summary, never copied. Over stdio returns the local file path; " +
				"over http returns a short-lived signed download URL.",
			InputSchema: json.RawMessage(`{
				"type":"object",
				"properties":{
					"slugs":{"type":"array","items":{"type":"string"},"minItems":1,
						"description":"Skill and/or plugin slugs to bundle, e.g. [\"copy-self-audit\",\"vercel-plugin\"]"}
				},
				"required":["slugs"],
				"additionalProperties":false}`),
		},
	}
	if mode == "full" {
		defs = append(defs, toolDef{
			Name: "install_skill",
			Description: "Download and write a skill to a target folder on the local machine. " +
				"Detects the agent target folder from the working directory unless target_dir is given. " +
				"stdio/full mode only: this tool writes to a filesystem and never runs on http.",
			InputSchema: json.RawMessage(`{
				"type":"object",
				"properties":{
					"slug":{"type":"string","description":"The skill slug or scoped id"},
					"target_dir":{"type":"string","description":"Target folder (default detected, else .claude/skills)"}
				},
				"required":["slug"],
				"additionalProperties":false}`),
		})
	}
	return defs
}

// publicView is the compact display contract: exactly what a card, a search
// hit, or an agent needs, nothing more.
func publicView(s SkillRecord) map[string]any {
	return map[string]any{
		"id":                s.ID,
		"slug":              skillSlug(s),
		"description":       s.D,
		"category":          s.C,
		"tags":              s.T,
		"compatible_agents": s.A,
		"version":           s.V,
		"hash":              s.H,
		"origin":            s.O,
		"verified":          s.Y,
		"badge":             badgeFor(s),
	}
}

// bundleRequest describes one prepared zip: the bytes plus what went in.
type bundleRequest struct {
	names       []string
	skillCount  int
	pluginCount int
}

// growableBuffer is a minimal in-memory byte sink the bundle writer streams
// into; zipWriterFor wraps it in an archive/zip.Writer.
type growableBuffer struct {
	data []byte
}

func (b *growableBuffer) Write(p []byte) (int, error) {
	b.data = append(b.data, p...)
	return len(p), nil
}

func (b *growableBuffer) bytes() []byte { return b.data }

// parseBundleArgs decodes and validates prepare_context_zip arguments.
func parseBundleArgs(args json.RawMessage) (*bundleRequest, error) {
	var payload struct {
		Slugs []string `json:"slugs"`
	}
	if len(args) > 0 {
		_ = json.Unmarshal(args, &payload)
	}
	if len(payload.Slugs) == 0 {
		return nil, fmt.Errorf("prepare_context_zip requires a non-empty slugs array")
	}
	names := make([]string, 0, len(payload.Slugs))
	for _, raw := range payload.Slugs {
		for _, name := range splitList(raw) {
			names = append(names, name)
		}
	}
	return &bundleRequest{names: names}, nil
}

// bundleTempDir is where stdio prepare_context_zip writes archives. Overridable
// for tests; defaults to the OS temp dir.
var bundleTempDir = ""

func bundleTempRoot() string {
	if bundleTempDir != "" {
		return bundleTempDir
	}
	return os.TempDir()
}

// buildPreparedBundle runs the shared bundle logic (planBundle + writeBundle,
// the exact code path `skyboy zip` uses) and returns the archive bytes.
func buildPreparedBundle(names []string, cat *CatalogManifest) (*bundleRequest, []byte, error) {
	plan, err := planBundle(names, cat)
	if err != nil {
		return nil, nil, err
	}
	// The bundle writer streams into a zip.Writer; buffer it in memory so both
	// transports can hand over bytes (temp file on stdio, signed link on http).
	var buf growableBuffer
	w := zipWriterFor(&buf)
	if err := writeBundle(plan, cat, w); err != nil {
		w.Close()
		return nil, nil, err
	}
	// Close flushes the central directory; without it the bytes are not a
	// valid archive.
	if err := w.Close(); err != nil {
		return nil, nil, err
	}
	req := &bundleRequest{
		names:       names,
		skillCount:  len(plan.skillRecs),
		pluginCount: len(plan.pluginRecs),
	}
	return req, buf.bytes(), nil
}

// toolResult dispatches one tools/call. transport is "stdio" or "http"; a
// tool-level miss (unknown slug) is a normal result carrying {"error": ...},
// same convention as the hosted TS server.
func toolResult(cat *CatalogManifest, mode, transport, name string, args json.RawMessage) (map[string]any, *rpcError) {
	var params map[string]any
	if len(args) > 0 {
		if err := json.Unmarshal(args, &params); err != nil || params == nil {
			params = map[string]any{}
		}
	}
	getStr := func(key string) string {
		if v, ok := params[key].(string); ok {
			return v
		}
		return ""
	}

	switch name {
	case "search_catalog", "search_skills":
		limit := 0
		if v, ok := params["limit"].(float64); ok && v > 0 {
			limit = int(v)
		}
		results := searchSkills(cat.Skills, getStr("query"), searchOptions{
			category: getStr("category"),
			agent:    getStr("agent"),
			limit:    limit,
		})
		views := make([]map[string]any, 0, len(results))
		for _, s := range results {
			views = append(views, publicView(s))
		}
		return textToolResult(map[string]any{"count": len(views), "results": views}), nil

	case "get_skill":
		id := getStr("slug")
		if err := safeID(id); err != nil {
			return textToolResult(map[string]any{"error": err.Error(), "count": 0}), nil
		}
		skill := findSkill(cat, id)
		if skill == nil {
			return textToolResult(map[string]any{"error": fmt.Sprintf("no skill named %s", id), "count": 0}), nil
		}
		body, bodyErr := fetchText(skillMarkdownURL(*skill))
		var meta *SkillMetaShard
		m, err := fetchMeta(*skill)
		if err == nil {
			meta = m
		}
		if bodyErr != nil {
			// Body fetch failed: still return the metadata so the caller can
			// retry or fall back to the raw URL themselves.
			return textToolResult(map[string]any{
				"skill":          publicView(*skill),
				"body":           nil,
				"bodyTruncated":  false,
				"rawMarkdownUrl": skillMarkdownURL(*skill),
				"meta":           meta,
			}), nil
		}
		truncated := len(body) > maxInlineBodyBytes
		if truncated {
			body = body[:maxInlineBodyBytes]
		}
		return textToolResult(map[string]any{
			"skill":          publicView(*skill),
			"body":           body,
			"bodyTruncated":  truncated,
			"rawMarkdownUrl": skillMarkdownURL(*skill),
			"meta":           meta,
		}), nil

	case "get_plugin":
		slug := getStr("slug")
		for _, p := range cat.Plugins {
			if p.Slug == slug {
				// The nested shape an agent wants: skills, hooks, agents, plus
				// the upstream pointer.
				return textToolResult(map[string]any{
					"plugin": map[string]any{
						"slug":        p.Slug,
						"name":        p.Name,
						"vendor":      p.Vendor,
						"description": p.Description,
						"category":    p.Category,
						"version":     p.Version,
						"license":     p.License,
						"upstream":    p.UpstreamRepo,
						"note":        p.Note,
						"skills":      p.Skills,
						"hooks":       p.Commands,
						"agents":      p.Agents,
						"mcp":         p.MCP,
					},
				}), nil
			}
		}
		return textToolResult(map[string]any{"error": fmt.Sprintf("no plugin named %s", slug), "count": 0}), nil

	case "list_categories":
		return textToolResult(map[string]any{
			"categories":  cat.Categories,
			"agents":      cat.Agents,
			"skills":      len(cat.Skills),
			"plugins":     len(cat.Plugins),
			"generatedAt": cat.GeneratedAt,
		}), nil

	case "prepare_context_zip":
		req, err := parseBundleArgs(args)
		if err != nil {
			return textToolResult(map[string]any{"error": err.Error()}), nil
		}
		bundleReq, data, err := buildPreparedBundle(req.names, cat)
		if err != nil {
			return textToolResult(map[string]any{"error": err.Error()}), nil
		}
		var link string
		if transport == "http" {
			link, err = registerBundleDownload(data)
			if err != nil {
				return textToolResult(map[string]any{"error": err.Error()}), nil
			}
		}
		payload := map[string]any{
			"skills":     bundleReq.skillCount,
			"plugins":    bundleReq.pluginCount,
			"bytes":      len(data),
			"summary":    "_CONTEXT_SUMMARY.md is at the archive root; upload the whole zip.",
		}
		if transport == "http" {
			payload["downloadUrl"] = link
			payload["expiresIn"] = int(signedLinkTTL.Seconds())
		} else {
			path, err := writePreparedBundleFile(data, req.names)
			if err != nil {
				return textToolResult(map[string]any{"error": err.Error()}), nil
			}
			payload["path"] = path
		}
		return textToolResult(payload), nil

	case "install_skill":
		if mode != "full" {
			return nil, &rpcError{Code: errInvalidPa, Message: "install_skill is not available in read-only mode"}
		}
		id := getStr("slug")
		if err := safeID(id); err != nil {
			return textToolResult(map[string]any{"error": err.Error(), "count": 0}), nil
		}
		skill := findSkill(cat, id)
		if skill == nil {
			return textToolResult(map[string]any{"error": fmt.Sprintf("no skill named %s", id), "count": 0}), nil
		}
		target := getStr("target_dir")
		guideSlug := "mcp"
		if target == "" {
			detected := detectAgentContext(cwd())
			if detected != nil {
				target = detected.targetDir
				guideSlug = detected.guideSlug
			} else {
				target = defaultTargetDir
			}
		}
		result, err := installSkill(*skill, target, cwd())
		if err != nil {
			return textToolResult(map[string]any{"error": err.Error()}), nil
		}
		return textToolResult(map[string]any{
			"id":           skill.ID,
			"slug":         result.slug,
			"destDir":      result.destDir,
			"filesWritten": result.filesWritten,
			"hash":         skill.H,
			"guideLink":    "https://skyboy.in/agents/" + guideSlug,
		}), nil

	default:
		return nil, &rpcError{Code: errMethodNot, Message: fmt.Sprintf("unknown tool: %s", name)}
	}
}

// writePreparedBundleFile lands the archive bytes in a temp file and returns
// its absolute path (the stdio answer to prepare_context_zip).
func writePreparedBundleFile(data []byte, names []string) (string, error) {
	name := "skyboy-bundle"
	if len(names) == 1 {
		name = "skyboy-" + safeSkillFolderName(names[0])
	}
	path := filepath.Join(bundleTempRoot(), fmt.Sprintf("%s-%d.zip", name, time.Now().UnixNano()))
	if err := os.WriteFile(path, data, 0o644); err != nil {
		return "", err
	}
	return path, nil
}

// findSkill is exact-on-id first, then fuzzy resolve (same as the TS
// catalog.getSkill(id) ?? catalog.resolve(id)).
func findSkill(cat *CatalogManifest, id string) *SkillRecord {
	for i := range cat.Skills {
		if cat.Skills[i].ID == id {
			return &cat.Skills[i]
		}
	}
	return resolveSlug(cat.Skills, id)
}

// ---------------------------------------------------------------------------
// http-transport signed downloads
// ---------------------------------------------------------------------------

// pendingDownload is one prepared zip held for a short-lived signed URL.
type pendingDownload struct {
	data      []byte
	expiresAt time.Time
}

// bundleDownloads is the in-process store behind prepare_context_zip over
// http. Server-local by design: the URL only ever points back at the process
// that built the archive.
var bundleDownloads = newBundleStore()

type bundleStore struct {
	tokenKey  []byte
	pending   map[string]*pendingDownload
	maxBytes  int
	totalSize int
}

func newBundleStore() *bundleStore {
	key := make([]byte, 32)
	if _, err := rand.Read(key); err != nil {
		// crypto/rand failing is catastrophic but should not panic the server;
		// fall back to a process-lifetime key derived from the start time.
		fallback := sha256.Sum256([]byte(fmt.Sprintf("skyboy-%d", time.Now().UnixNano())))
		key = fallback[:]
	}
	return &bundleStore{tokenKey: key, pending: map[string]*pendingDownload{}, maxBytes: maxBundleBytes}
}

// sign returns the hmac for a download token id.
func (s *bundleStore) sign(id string) string {
	mac := hmac.New(sha256.New, s.tokenKey)
	mac.Write([]byte(id))
	return hex.EncodeToString(mac.Sum(nil))[:32]
}

// registerBundleDownload stores the bytes and returns a signed URL path that
// the same process will serve for signedLinkTTL.
func (s *bundleStore) register(data []byte) (string, error) {
	s.evictExpired()
	if s.totalSize+len(data) > s.maxBytes {
		return "", fmt.Errorf("too many pending bundles; download one before preparing another")
	}
	raw := make([]byte, 16)
	if _, err := rand.Read(raw); err != nil {
		return "", err
	}
	id := hex.EncodeToString(raw)
	s.pending[id] = &pendingDownload{data: data, expiresAt: time.Now().Add(signedLinkTTL)}
	s.totalSize += len(data)
	return "/download/" + id + "?token=" + s.sign(id), nil
}

// lookup validates a token, enforces expiry, and hands back the bytes once.
// One-time consumption keeps a leaked URL from being replayed after expiry.
func (s *bundleStore) lookup(id, token string) ([]byte, bool) {
	pending, ok := s.pending[id]
	if !ok || !hmac.Equal([]byte(token), []byte(s.sign(id))) {
		return nil, false
	}
	if time.Now().After(pending.expiresAt) {
		s.drop(id)
		return nil, false
	}
	s.drop(id)
	return pending.data, true
}

func (s *bundleStore) drop(id string) {
	if pending, ok := s.pending[id]; ok {
		s.totalSize -= len(pending.data)
		delete(s.pending, id)
	}
}

func (s *bundleStore) evictExpired() {
	now := time.Now()
	for id, pending := range s.pending {
		if now.After(pending.expiresAt) {
			s.drop(id)
		}
	}
}

func registerBundleDownload(data []byte) (string, error) {
	return bundleDownloads.register(data)
}

// serveBundleDownload is the http handler behind prepare_context_zip URLs.
func serveBundleDownload(w http.ResponseWriter, r *http.Request) {
	segs := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(segs) != 2 || segs[0] != "download" {
		http.NotFound(w, r)
		return
	}
	data, ok := bundleDownloads.lookup(segs[1], r.URL.Query().Get("token"))
	if !ok {
		http.Error(w, "link expired or invalid; call prepare_context_zip again", http.StatusGone)
		return
	}
	w.Header().Set("Content-Type", "application/zip")
	w.Header().Set("Content-Disposition", `attachment; filename="skyboy-bundle.zip"`)
	w.Header().Set("Cache-Control", "no-store")
	_, _ = w.Write(data)
}

// cmdServe runs the stdio loop until stdin closes.
func cmdServe(args []string) error {
	mode := "full"
	if hasFlag(args, "--read-only") {
		mode = "readonly"
	}
	cat, err := loadCatalog(cwd(), flagValue(args, "--catalog"))
	if err != nil {
		return err
	}

	in := bufio.NewScanner(os.Stdin)
	in.Buffer(make([]byte, 0, 64*1024), 4*1024*1024)
	out := bufio.NewWriter(os.Stdout)
	defer out.Flush()

	fmt.Fprintf(os.Stderr, "skyboy-mcp: stdio server ready (%s tool surface).\n", mode)

	for in.Scan() {
		line := strings.TrimSpace(in.Text())
		if line == "" {
			continue
		}
		var req rpcRequest
		if err := json.Unmarshal([]byte(line), &req); err != nil {
			// A frame we cannot even parse gets a parse error with a null id.
			data, _ := json.Marshal(map[string]any{
				"jsonrpc": "2.0", "id": nil,
				"error": rpcError{Code: errParse, Message: "parse error"},
			})
			out.Write(data)
			out.WriteByte('\n')
			out.Flush()
			continue
		}

		switch req.Method {
		case "initialize":
			var params struct {
				ClientInfo map[string]any `json:"clientInfo"`
			}
			_ = json.Unmarshal(req.Params, &params)
			writeFrame(out, req.ID, map[string]any{
				"protocolVersion": mcpProtocolVersion,
				"capabilities":    map[string]any{"tools": map[string]any{}},
				"serverInfo": map[string]any{
					"name":    "skyboy",
					"version": cliVersion,
				},
				"instructions": "Search, preview, bundle, and install skills from the skyboy.in catalog. " +
					"Use search_catalog to find a skill, get_skill to preview it, " +
					"prepare_context_zip to bundle several for upload, and install_skill to write one locally.",
			}, nil)

		case "notifications/initialized":
			// A notification: no response frame.

		case "ping":
			writeFrame(out, req.ID, map[string]any{}, nil)

		case "tools/list":
			writeFrame(out, req.ID, map[string]any{"tools": toolDefs(mode)}, nil)

		case "tools/call":
			var params struct {
				Name      string          `json:"name"`
				Arguments json.RawMessage `json:"arguments"`
			}
			if err := json.Unmarshal(req.Params, &params); err != nil || params.Name == "" {
				writeFrame(out, req.ID, nil, &rpcError{Code: errInvalidPa, Message: "tools/call requires a tool name"})
				continue
			}
			result, rpcErr := toolResult(cat, mode, "stdio", params.Name, params.Arguments)
			writeFrame(out, req.ID, result, rpcErr)

		default:
			writeFrame(out, req.ID, nil, &rpcError{Code: errMethodNot, Message: fmt.Sprintf("method not found: %s", req.Method)})
		}
	}
	if err := in.Err(); err != nil {
		return err
	}
	return nil
}
