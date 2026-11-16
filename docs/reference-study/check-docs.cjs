// Check local Markdown file links and parse JavaScript teaching snippets.
// This does not execute snippets, compile shaders or validate visual behavior.
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const root = __dirname;
const files = [
  ...fs
    .readdirSync(root)
    .filter((f) => f.endsWith(".md"))
    .map((f) => path.join(root, f)),
  ...["sites", "skills"].flatMap((dir) =>
    fs
      .readdirSync(path.join(root, dir))
      .filter((f) => f.endsWith(".md"))
      .map((f) => path.join(root, dir, f)),
  ),
  path.resolve(root, "../../README.md"),
];
const result = {
  files: files.length,
  localLinks: 0,
  javascriptBlocks: 0,
  failures: [],
};
for (const file of files) {
  const markdown = fs.readFileSync(file, "utf8");
  for (const match of markdown.matchAll(/!?\[[^\]]*\]\(([^\s)]+)\)/g)) {
    const target = match[1].split("#")[0];
    if (!target || /^[a-z]+:/i.test(target)) continue;
    result.localLinks++;
    if (
      !fs.existsSync(
        path.resolve(path.dirname(file), decodeURIComponent(target)),
      )
    )
      result.failures.push({
        file: path.relative(root, file),
        missing: target,
      });
  }
  for (const match of markdown.matchAll(
    /```(?:js|javascript)\n([\s\S]*?)\n```/g,
  )) {
    result.javascriptBlocks++;
    const check = spawnSync(
      process.execPath,
      ["--input-type=module", "--check"],
      { input: match[1], encoding: "utf8" },
    );
    if (check.status !== 0)
      result.failures.push({
        file: path.relative(root, file),
        error: check.stderr || check.error?.message,
      });
  }
}
for (const name of ["audit.cjs", "check-docs.cjs"]) {
  const check = spawnSync(
    process.execPath,
    ["--check", path.join(root, name)],
    { encoding: "utf8" },
  );
  if (check.status !== 0)
    result.failures.push({ file: name, error: check.stderr });
}
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.failures.length ? 1 : 0;
