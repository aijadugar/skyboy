// Generic provider sync: rebuilds meta.json shards + catalog.json records for one
// model provider from on-disk skill.json / plugin.json manifests. Mirrors the
// go build-catalog hash order (hash folder BEFORE writing its meta.json shard).
const fs = require('fs'); const path = require('path'); const {createHash} = require('crypto');
const slug = process.argv[2];

function H(dir) {
  const files = [];
  (function w(d) {
    for (const e of fs.readdirSync(d, {withFileTypes: true})) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) w(f);
      else files.push({rel: f.slice(dir.length + 1).split(path.sep).join('/'), full: f});
    }
  })(dir);
  files.sort((a, b) => a.rel < b.rel ? -1 : 1);
  const h = createHash('sha256');
  for (const f of files) {
    const b = fs.readFileSync(f.full);
    h.update(f.rel); h.update('\0'); h.update(String(b.length)); h.update('\0'); h.update(b);
  }
  return h.digest('hex').slice(0, 16);
}

function fmLicense(mdPath) {
  const m = fs.readFileSync(mdPath, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i === -1) continue;
    if (line.slice(0, i).trim() === 'license') return line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return null;
}

const RAW_BASE = 'https://raw.githubusercontent.com/aijadugar/skyboy/main/';
const c = JSON.parse(fs.readFileSync('catalog.json', 'utf8'));
const D = `skills/model-providers/${slug}`;
const Dabs = path.join(...D.split('/'));
const childPfx = D + '/skills/';

// 1) nested skill shards
if (fs.existsSync(path.join(...childPfx.split('/')))) {
  for (const child of fs.readdirSync(path.join(...childPfx.split('/')))) {
    const nestedRel = childPfx + child;
    const nestedAbs = path.join(...nestedRel.split('/'));
    if (!fs.existsSync(nestedAbs + '/skill.json')) continue;
    const nsj = JSON.parse(fs.readFileSync(nestedAbs + '/skill.json', 'utf8'));
    const hadMj = fs.existsSync(nestedAbs + '/meta.json');
    const bkp = hadMj && fs.readFileSync(nestedAbs + '/meta.json');
    if (hadMj) fs.unlinkSync(nestedAbs + '/meta.json');
    const nestedHash = H(nestedAbs);
    if (hadMj) fs.writeFileSync(nestedAbs + '/meta.json', bkp); // restore so H() below sees it; overwritten next
    const m2 = {
      id: child, slug: child,
      description: nsj.description.slice(0, 200),
      category: nsj.category, tags: nsj.tags, compatible_agents: nsj.compatible_agents,
      version: nsj.version ?? '1.0.0', license: nsj.license ?? 'MIT', author: nsj.author ?? child,
      origin: 'skyboy', verified: false,
      upstream_repo: nsj.source_url ?? null, canonical_of: null, permissions: null,
      frontmatter: {name: child, license: fmLicense(nestedAbs + '/SKILL.md')},
      hash: nestedHash,
      path: nestedRel,
      skill_md_url: RAW_BASE + nestedRel + '/SKILL.md',
    };
    fs.writeFileSync(nestedAbs + '/meta.json', JSON.stringify(m2, null, 2) + '\n');
    console.log('nested', child, nestedHash);
  }
}

// 2) container meta: hash BEFORE writing the shard
const containerAbsMj = path.join(Dabs, 'meta.json');
const backup = fs.existsSync(containerAbsMj) ? fs.readFileSync(containerAbsMj) : null;
if (backup) fs.unlinkSync(containerAbsMj);
const folderHash = H(Dabs);

// 3) rebuild nested child index records from disk (idempotent, sorted by readdir order)
c.skills = c.skills.filter(s => !s.p.startsWith(childPfx));
const childRecs = [];
if (fs.existsSync(path.join(...childPfx.split('/')))) {
  for (const child of fs.readdirSync(path.join(...childPfx.split('/')))) {
    const nestedRel = childPfx + child;
    const nestedAbs = path.join(...nestedRel.split('/'));
    if (!fs.existsSync(nestedAbs + '/skill.json')) continue;
    const shard = JSON.parse(fs.readFileSync(nestedAbs + '/meta.json', 'utf8'));
    childRecs.push({
      id: child, d: shard.description, c: shard.category,
      t: shard.tags, a: shard.compatible_agents, v: shard.version, h: shard.hash,
      o: 'skyboy', y: false, p: nestedRel,
    });
  }
}
const idx = c.skills.findIndex(s => s.p === D);
c.skills.splice(idx + 1, 0, ...childRecs);

// 4) container record from its skill.json
const sj = JSON.parse(fs.readFileSync(path.join(Dabs, 'skill.json'), 'utf8'));
if (backup) {
  const m = JSON.parse(backup.toString('utf8'));
  m.description = sj.description.slice(0, 200); m.tags = sj.tags;
  m.compatible_agents = sj.compatible_agents; m.version = sj.version ?? m.version;
  m.license = sj.license ?? m.license; m.author = sj.author ?? m.author;
  m.upstream_repo = sj.source_url ?? m.upstream_repo ?? null;
  m.hash = folderHash;
  m.frontmatter = {name: sj.name ?? slug, license: fmLicense(path.join(Dabs, 'SKILL.md'))};
  fs.writeFileSync(containerAbsMj, JSON.stringify(m, null, 2) + '\n');
}

const rec = c.skills.find(x => x.p === D);
rec.d = sj.description.slice(0, 200); rec.t = sj.tags; rec.a = sj.compatible_agents; rec.h = folderHash;

// 5) plugins from on-disk manifests
const pjRoot = path.join(Dabs, 'plugins');
if (fs.existsSync(pjRoot)) {
  for (const pslug of fs.readdirSync(pjRoot).sort()) {
    const pAbs = path.join(pjRoot, pslug);
    if (!fs.existsSync(pAbs + '/plugin.json')) continue;
    const existing = c.plugins.find(p => p.provider === slug && p.slug === pslug);
    if (existing) {
      // refresh mutable fields from the manifest
      const raw = JSON.parse(fs.readFileSync(pAbs + '/plugin.json', 'utf8'));
      existing.description = raw.description; existing.vendor = raw.vendor ?? pslug;
      existing.vendorUrl = raw.source_url; existing.upstreamRepo = raw.source_url; existing.install = raw.source_url;
      existing.license = raw.license || 'Apache-2.0';
      continue;
    }
    const raw = JSON.parse(fs.readFileSync(pAbs + '/plugin.json', 'utf8'));
    const url = raw.source_url;
    const prefix = raw.path_prefix || 'skills';
    c.plugins.push({
      slug: pslug, name: raw.name, vendor: raw.vendor ?? pslug, vendorUrl: url,
      sourceType: 'vendor', origin: 'vendor', category: raw.category ?? 'model-providers',
      tags: null, license: raw.license || 'Apache-2.0', upstreamRepo: url, install: url,
      description: raw.description, compatibleAgents: null,
      skills: (raw.contents?.skills || []).map(n => ({name: n, description: '', path: prefix + '/' + n, url: url + '/blob/main/' + prefix + '/' + n})),
      commands: null, agents: null, mcp: null,
      note: 'Indexed from the vendor repo as the source of truth, not reviewed by skyboy. Report content issues upstream.',
      badge: 'official (vendor)',
      path: `${D}/plugins/${pslug}`,
      provider: slug,
    });
  }
}
fs.writeFileSync('catalog.json', JSON.stringify(c, null, 2) + '\n');
console.log('container:', folderHash, 'catalog:', c.skills.length, 'skills,', c.plugins.length, 'plugins');
