// Bumps the app version after each commit and amends it into that commit. Run by
// .githooks/post-commit. The bump follows the Conventional Commits type of the message:
// a breaking change ("feat!:" or "BREAKING CHANGE:") is major, "feat:" is minor, and
// anything else is a patch. Set SKIP_VERSION_BUMP=1 to commit without a bump.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const FILES = ['package.json', 'package-lock.json'];
const CHANGELOG = 'src/lib/changelog.ts';

function gitRaw(args, options = {}) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'], ...options });
}

function git(args, options = {}) {
  return gitRaw(args, options).trim();
}

function tryGit(args) {
  try {
    return git(args);
  } catch {
    return null;
  }
}

function readVersion(rev) {
  const text = tryGit(['show', `${rev}:package.json`]);
  return text ? JSON.parse(text).version : null;
}

function skipReason() {
  if (process.env.SKIP_VERSION_BUMP) return 'SKIP_VERSION_BUMP is set';
  // Commits replayed by a rebase or cherry-pick already carry their original bump.
  const inProgress = ['rebase-merge', 'rebase-apply', 'CHERRY_PICK_HEAD', 'REVERT_HEAD'];
  if (inProgress.some((p) => existsSync(git(['rev-parse', '--git-path', p])))) {
    return 'a rebase, cherry-pick or revert is in progress';
  }
  const parents = git(['rev-list', '--parents', '-n', '1', 'HEAD']).split(' ').length - 1;
  if (parents !== 1) return 'merge and root commits are not bumped';
  // Covers amends of an already-bumped commit, manual bumps, and this script's own amend.
  if (readVersion('HEAD') !== readVersion('HEAD~1')) return 'the commit already changes the version';
  return null;
}

function bumpType(message) {
  const header = /^(\w+)(?:\([^)]*\))?(!)?:/.exec(message);
  if (header?.[2] || /^BREAKING[ -]CHANGE:/m.test(message)) return 'major';
  if (header?.[1] === 'feat') return 'minor';
  return 'patch';
}

function nextVersion(version, type) {
  const [major, minor, patch] = version.split('.').map(Number);
  if (type === 'major') return `${major + 1}.0.0`;
  if (type === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

function setVersion(text, file, version) {
  const json = JSON.parse(text);
  json.version = version;
  if (file === 'package-lock.json' && json.packages?.['']) json.packages[''].version = version;
  return JSON.stringify(json, null, 2) + (text.endsWith('\n') ? '\n' : '');
}

const reason = skipReason();
if (reason) {
  console.log(`Version not bumped: ${reason}.`);
  process.exit(0);
}

const current = readVersion('HEAD');
const type = bumpType(git(['log', '-1', '--format=%B']));
const next = nextVersion(current, type);

// Build the amended commit from a scratch index holding only HEAD plus the bumped files,
// so other staged or unstaged changes never leak into it.
const tempIndex = resolve(git(['rev-parse', '--git-path', 'version-bump-index']));
const env = { ...process.env, GIT_INDEX_FILE: tempIndex, SKIP_VERSION_BUMP: '1' };
const updates = [];
try {
  git(['read-tree', 'HEAD'], { env });
  for (const file of FILES) {
    const entry = tryGit(['ls-tree', 'HEAD', file]);
    if (!entry) continue;
    const [mode, , oldBlob] = entry.split(/\s+/);
    const content = setVersion(gitRaw(['cat-file', 'blob', oldBlob]), file, next);
    const newBlob = git(['hash-object', '-w', '--stdin'], { input: content });
    git(['update-index', '--cacheinfo', `${mode},${newBlob},${file}`], { env });
    updates.push({ file, mode, oldBlob, newBlob });
  }
  git(['commit', '--amend', '--no-edit', '--no-verify', '--allow-empty'], { env });
} finally {
  rmSync(tempIndex, { force: true });
}

// Bring the real index and working tree along, where they still match the old version.
for (const { file, mode, oldBlob, newBlob } of updates) {
  const staged = tryGit(['ls-files', '--stage', file])?.split(/\s+/)[1];
  if (staged === oldBlob) git(['update-index', '--cacheinfo', `${mode},${newBlob},${file}`]);
  try {
    const text = readFileSync(file, 'utf8');
    if (JSON.parse(text).version === current) writeFileSync(file, setVersion(text, file, next));
  } catch {
    console.log(`Could not update ${file} in the working tree; set its version to ${next} by hand.`);
  }
}

console.log(`Version bumped ${current} → ${next} (${type}).`);
if (type !== 'patch' && existsSync(CHANGELOG) && !readFileSync(CHANGELOG, 'utf8').includes(`'${next}'`)) {
  console.log(`Add a ${next} release to ${CHANGELOG} to announce it in "What's new".`);
}
