"""stdlib-only `skyboy` CLI for the skyboy.in skill directory (PyPI).

Publishing notes (see README): this is the native Python implementation of the
CLI. It intentionally avoids pulling in Node at any point, so it targets the
Python-only audience (data science, Kaggle, ML eval, etc.) that §8 method C
wants to reach. It shares the same install-manifest format (catalog.json) as the
npm CLI.

v2: catalog records are compact (id, d, c, t, a, v, h, o, y, p per
docs/skill-spec.md §6). Ids may be bare slugs (skyboy skills) or scoped
@owner/slug (vendor and community skills); the install folder is always the
slug part.

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


def _slug(record):
    """The slug part of an id: 'x' for bare, 'slug' for @owner/slug."""
    rid = record.get("id", "")
    return rid.split("/", 1)[1] if rid.startswith("@") else rid


def _skill_folder(record):
    if record.get("p"):
        return record["p"]
    return "skills/{}/{}".format(record.get("c", "uncategorized").split("/")[0], _slug(record))


def _add(args):
    if not args:
        print("skyboy: add requires a <slug>. Run 'skyboy help' for usage.")
        return 1
    skill_id = args[0]
    target_dir = DEFAULT_TARGET_DIR
    if "--dir" in args:
        idx = args.index("--dir")
        if idx + 1 < len(args):
            target_dir = args[idx + 1]

    catalog = _resolve_manifest(Path.cwd())
    skills = catalog.get("skills", [])
    match = next((s for s in skills if s.get("id") == skill_id or _slug(s) == skill_id), None)
    if not match:
        print("skyboy: could not resolve '{}' to a skill. Try 'skyboy search {}'.".format(skill_id, skill_id))
        return 1

    folder = _skill_folder(match)
    dest = Path(target_dir) / _slug(match)
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
        local.write_bytes(_download(entry))
        written += 1

    print("skyboy: added '{}' to {}/{}.".format(match.get("id"), target_dir, _slug(match)))
    print("  version: v{}  |  origin: {}  |  category: {}".format(
        match.get("v", "1.0.0"), match.get("o", "community"), match.get("c", "uncategorized")))
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
        hay = " ".join([s.get("id", ""), s.get("d", ""), " ".join(s.get("t", []))]).lower()
        if all(t in hay for t in terms):
            print("{}\t{}\t({})".format(s.get("id"), s.get("d", ""), s.get("c", "uncategorized")))


def _list(_args):
    catalog = _resolve_manifest(Path.cwd())
    for s in sorted(catalog.get("skills", []), key=lambda x: x.get("id", "").lower()):
        print("{}\t{}\t({})\tv{}".format(
            s.get("id"), s.get("d", ""), s.get("c", "uncategorized"), s.get("v", "1.0.0")))


def _resolve(args):
    if not args:
        print("skyboy: resolve requires a <slug>.")
        return 1
    skill_id = args[0]
    catalog = _resolve_manifest(Path.cwd())
    match = next((s for s in catalog.get("skills", []) if s.get("id") == skill_id or _slug(s) == skill_id), None)
    if not match:
        print("skyboy: could not resolve '{}'.".format(skill_id))
        return 1
    folder = _skill_folder(match)
    print("id:", match.get("id"))
    print("path:", folder)
    print("description:", match.get("d", ""))
    print("version: v{}".format(match.get("v", "1.0.0")))
    print("hash:", match.get("h", ""))
    print("raw: {}/{}".format(RAW_BASE, folder) + "/SKILL.md")


def _version(_args):
    catalog = _resolve_manifest(Path.cwd())
    print("skyboy {} (catalog v{}).".format(__version__, catalog.get("version", 1)))


def _help(_args):
    print("""skyboy - add portable SKILL.md skills to your project.

Usage:
  skyboy add <slug|@owner/slug> [--dir <path>]
  skyboy search <query>
  skyboy list
  skyboy resolve <slug|@owner/slug>
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
