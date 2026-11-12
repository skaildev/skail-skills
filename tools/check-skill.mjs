// Validates every skill under skills/: the header, the links between files and the size of SKILL.md.
// No dependencies, so it runs the same on a laptop and in CI: node tools/check-skill.mjs
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS = join(ROOT, "skills");
// An agent reading by URL may never open the references: SKILL.md must stay readable in one pass.
const MAX_SKILL_LINES = 200;
const MAX_DESCRIPTION = 1024;

const errors = [];
const fail = (file, message) => errors.push(`${relative(ROOT, file)}: ${message}`);

function header(file, text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) {
    fail(file, "missing the --- header ---");
    return {};
  }
  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([a-z-]+):\s*(.*)$/);
    if (field) fields[field[1]] = field[2].trim();
  }
  return fields;
}

function markdownFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return markdownFiles(path);
    return name.endsWith(".md") ? [path] : [];
  });
}

function checkLinks(file, text) {
  for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    const path = resolve(dirname(file), target.split("#")[0]);
    if (!existsSync(path)) fail(file, `broken link to ${target}`);
  }
}

for (const name of readdirSync(SKILLS)) {
  const dir = join(SKILLS, name);
  if (!statSync(dir).isDirectory()) continue;

  const skill = join(dir, "SKILL.md");
  if (!existsSync(skill)) {
    fail(dir, "missing SKILL.md");
    continue;
  }
  const text = readFileSync(skill, "utf8");
  const fields = header(skill, text);

  if (fields.name !== name) fail(skill, `name must be the folder name "${name}" (found "${fields.name ?? ""}")`);
  if (!/^[a-z0-9-]+$/.test(fields.name ?? "")) fail(skill, "name must use lowercase letters, digits and hyphens");
  if (!fields.description) fail(skill, "missing description");
  else if (fields.description.length > MAX_DESCRIPTION) fail(skill, `description over ${MAX_DESCRIPTION} characters`);
  if (!/^\s+version:\s*"?\d+\.\d+\.\d+"?\s*$/m.test(text.split(/\r?\n---/)[0])) fail(skill, "missing metadata.version");

  const lines = text.split(/\r?\n/).length;
  if (lines > MAX_SKILL_LINES) fail(skill, `${lines} lines; keep it under ${MAX_SKILL_LINES} and move detail to references/`);

  for (const file of markdownFiles(dir)) checkLinks(file, readFileSync(file, "utf8"));

  // Every reference must be reachable from SKILL.md, or an agent will never find it.
  const refs = join(dir, "references");
  if (existsSync(refs)) {
    for (const ref of readdirSync(refs).filter((f) => f.endsWith(".md"))) {
      if (!text.includes(`references/${ref}`)) fail(skill, `references/${ref} is not linked from SKILL.md`);
    }
  }
}

for (const file of [join(ROOT, "README.md"), join(ROOT, "AGENTS.md")]) {
  if (existsSync(file)) checkLinks(file, readFileSync(file, "utf8"));
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("skills ok");
