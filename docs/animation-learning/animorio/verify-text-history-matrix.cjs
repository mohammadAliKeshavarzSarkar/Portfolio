const { spawn } = require("node:child_process");
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
const suites = [
  {
    file: "verify-text-lesson.cjs",
    args: ["--browser"],
    source: "03-text-progress-and-state.md",
  },
  {
    file: "verify-history-browser.cjs",
    args: [],
    source: "06-history-restoration.md",
  },
];
function run(engine, suite) {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [path.join(__dirname, suite.file), ...suite.args],
      {
        env: { ...process.env, BROWSER_ENGINE: engine },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let stdout = "",
      stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      process.stdout.write(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
      process.stderr.write(chunk);
    });
    child.on("error", (error) =>
      resolve({
        engine,
        suite: suite.file,
        status: "failed",
        error: String(error),
      }),
    );
    child.on("close", (code) =>
      resolve({
        engine,
        suite: suite.file,
        status: code === 0 ? "passed" : "failed",
        exitCode: code,
        stdout,
        stderr,
      }),
    );
  });
}
(async () => {
  const results = [];
  for (const engine of ["chromium", "firefox"])
    for (const suite of suites) results.push(await run(engine, suite));
  const result = {
    recordedAt: new Date().toISOString(),
    scope:
      "Original text/chapter and History fixtures; Firefox desktop normal/reduced motion and no-JavaScript text baseline; Chromium retains desktop/mobile emulation; no GPU/bfcache or hardware expansion",
    sources: suites.map((suite) => ({
      file: suite.source,
      sha256: crypto
        .createHash("sha256")
        .update(fs.readFileSync(path.join(__dirname, suite.source)))
        .digest("hex"),
    })),
    results,
  };
  if (process.argv.includes("--record"))
    fs.writeFileSync(
      path.join(__dirname, "text-history-cross-browser-validation.json"),
      JSON.stringify(result, null, 2) + "\n",
    );
  if (results.some((item) => item.status !== "passed")) process.exitCode = 1;
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
