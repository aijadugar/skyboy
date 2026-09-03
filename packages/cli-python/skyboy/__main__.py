"""stdlib-only `skyboy` CLI for the skyboy.in skill directory (PyPI).

Publishing notes (see README): this is the native Python implementation of the
CLI. It intentionally avoids pulling in Node at any point, so it targets the
Python-only audience (data science, Kaggle, ML eval, etc.) that §8 method C
wants to reach. It shares the same install-manifest format (catalog.json) as the
npm CLI.

Scope for this release: `add`, `search`, `list`, `resolve`, `version`.
Agent-context detection and the interactive target-folder prompt are documented
follow-ups on the npm package; here we accept an explicit `--dir` or default to
`.claude/skills`. This keeps the dual-publish story honest.
"""

import json
import sys
import urllib.request
from pathlib import Path

from . import __version__

MANIFEST_URL = "https://raw.githubusercontent.com/aijadugar/skyboy/main/catalog.json"
DEFAULT_TARGET_DIR = ".claude/skills"
RAW_BASE = "https://raw.githubusercontent.com/aijadugar/skyboy/main"


def _fetch_json(url):
    with urllib.request.urlopen(url, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _resolve_manifest(cwd):
    local = Path(cwd) / "catalog.json"
    if local.exists():
        return json.loads(local.read_text("utf-8"))
    return _fetch_json(MANIFEST_URL)


def _skill_folder(skill):
    if skill.get("path"):
        return skill["path"]
    return "skills/{}/{}".format(skill.get("category", "uncategorized").split("/")[0], skill["slug"])


def _add(args):
    if not args:
        print("skyboy: add requires a <slug>. Run 'skyboy help' for usage.")
        return 1
    slug = args[0]
    target_dir = ".claude/skills"
    if "--dir" in args:
        idx = args.index("--dir")
        if idx + 1 < len(args):
            target_dir = args[idx + 1]

    catalog = _resolve_manifest(Path.cwd())
    skills = catalog.get("skills", [])
    match = next((s for s in skills if s["slug"] == slug), None)
    if not match:
        print("skyboy: could not resolve '{}' to a skill. Try 'skyboy search {}'.".format(slug, slug))
        return 1

    folder = _skill_folder(match)
    dest = Path(target_dir) / slug
    dest.mkdir(parents=True, exist_ok=True)

    # Enumerate the folder with the GitHub contents API (recursive).
    api = "https://api.github.com/repos/aijadugar/skyboy/contents/{}".format(folder)
    stack = [folder]
    entries = []
    while stack:
        d = stack.pop()
        url = api if d == folder else d
        payload = _fetch_json(url)
        for child in payload:
            if child["type"] == "dir":
                stack.append(child["path"])
            else:
                entries.append(child)

    written = 0
    for entry in entries:
        rel = entry["path"][len(folder) + 1 :]
        local = dest / Path(rel)
        local.parent.mkdir(parents=True, exist_ok=True)
        data = _fetch_json(None) if False else _download(entry)
        local.write_bytes(data)
        written += 1

    print("skyboy: added '{}' to {}/{}.".format(slug, target_dir, slug))
    print("  version: v{}  |  license: {}  |  category: {}".format(
        match.get("version", "1.0.0"), match.get("license", "MIT"), match.get("category", "uncategorized")))
    print("  {} file(s) written.".format(written))
    print("  next steps: https://skyboy.in/agents/mcp")


def _download(entry):
    url = entry["download_url"]
    with urllib.request.urlopen(url, timeout=30) as resp:
        return resp.read()


def _search(args):
    if not args:
        print("skyboy: search requires a <query>.")
        return 1
    query = args[0].lower()
    catalog = _resolve_manifest(Path.cwd())
    terms = [t for t in query.split() if t]
    for s in catalog.get("skills", []):
        hay = " ".join([s["slug"], s["name"], s.get("description", ""), " ".join(s.get("tags", []))]).lower()
        if all(t in hay for t in terms):
            print("{}\t{}\t({})".format(s["slug"], s["name"], s.get("category", "uncategorized")))


def _list(_args):
    catalog = _resolve_manifest(Path.cwd())
    for s in sorted(catalog.get("skills", []), key=lambda x: x["name"].lower()):
        print("{}\t{}\t({})\tv{}".format(s["slug"], s["name"], s.get("category", "uncategorized"), s.get("version", "1.0.0")))


def _resolve(args):
    if not args:
        print("skyboy: resolve requires a <slug>.")
        return 1
    slug = args[0]
    catalog = _resolve_manifest(Path.cwd())
    match = next((s for s in catalog.get("skills", []) if s["slug"] == slug), None)
    if not match:
        print("skyboy: could not resolve '{}'.".format(slug))
        return 1
    folder = _skill_folder(match)
    print("slug:", match["slug"])
    print("path:", folder)
    print("name:", match["name"])
    print("version: v{}".format(match.get("version", "1.0.0")))
    print("raw: {}/{}".format(RAW_BASE, folder) + "/SKILL.md")


def _version(_args):
    catalog = _resolve_manifest(Path.cwd())
    print("skyboy {} (catalog v{}).".format(__version__, catalog.get("version", 1)))


def _help(_args):
    print("""skyboy - add portable SKILL.md skills to your project.

Usage:
  skyboy add <slug> [--dir <path>]
  skyboy search <query>
  skyboy list
  skyboy resolve <slug>
  skyboy version
  skyboy help

Note: this PyPI CLI covers resolve + download. Agent-context detection and the
interactive target-folder prompt are a follow-up on the npm package; pass
--dir to choose a target folder directly.""")


def main(argv=None):
    args = sys.argv[1:] if argv is None else argv
    if not args:
        return _help(args)
    cmd, rest = args[0], args[1:]
    handler = {
        "add": _add,
        "search": _search,
        "list": _list,
        "resolve": _resolve,
        "version": _version,
        "help": _help,
        "--help": _help,
        "-h": _help,
    }.get(cmd)
    if handler is None:
        print("skyboy: unknown command '{}'. Run 'skyboy help'.".format(cmd))
        return 1
    return handler(rest)


if __name__ == "__main__":
    sys.exit(main())
