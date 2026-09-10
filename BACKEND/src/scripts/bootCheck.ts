import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import path from "path";

// Verifies that every relative require() in the compiled output points at a file
// that exists. It resolves paths instead of loading modules, so nothing executes.
//
// This exists because tsc cannot be trusted to catch it alone: a bare
// `import "./x"` carries no bindings, and a `paths` wildcard in tsconfig can
// silence the error entirely. That combination shipped a broken import once.

const DIST = path.resolve(__dirname, "..");
const RELATIVE_REQUIRE = /require\(\s*["'](\.[^"']*)["']\s*\)/g;

const jsFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return jsFiles(full);
    return full.endsWith(".js") ? [full] : [];
  });

const resolves = (fromFile: string, specifier: string): boolean => {
  const base = path.resolve(path.dirname(fromFile), specifier);
  return [base, `${base}.js`, `${base}.json`, path.join(base, "index.js")].some(
    (candidate) => existsSync(candidate) && statSync(candidate).isFile(),
  );
};

const failures: string[] = [];

for (const file of jsFiles(DIST)) {
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(RELATIVE_REQUIRE)) {
    if (!resolves(file, match[1])) {
      failures.push(`${path.relative(DIST, file)} -> ${match[1]}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Unresolvable imports in the compiled output:\n");
  for (const failure of failures) console.error("  " + failure);
  console.error(`\n${failures.length} broken import(s)`);
  process.exit(1);
}

console.log("boot check: every relative import in dist/ resolves");
