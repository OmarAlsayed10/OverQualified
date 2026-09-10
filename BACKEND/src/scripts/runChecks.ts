import { execFileSync } from "child_process";
import { readdirSync } from "fs";
import path from "path";

const SRC = path.resolve(__dirname, "..");
const NEEDS_BROWSER = new Set(["pdfExport.check.ts"]);

const checkFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return checkFiles(full);
    return entry.name.endsWith(".check.ts") ? [full] : [];
  });

const skipBrowser = process.argv.includes("--no-browser");
const failures: string[] = [];

for (const file of checkFiles(SRC).sort()) {
  const name = path.basename(file);
  if (skipBrowser && NEEDS_BROWSER.has(name)) {
    console.log(`SKIP  ${path.relative(SRC, file)} (needs Chromium)`);
    continue;
  }
  try {
    execFileSync("npx", ["ts-node", file], { stdio: "pipe", shell: true });
    console.log(`PASS  ${path.relative(SRC, file)}`);
  } catch {
    console.error(`FAIL  ${path.relative(SRC, file)}`);
    failures.push(path.relative(SRC, file));
  }
}

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed`);
  process.exit(1);
}
console.log(`\nall checks passed`);
